"use server";

import { createClient, createAdminClient } from "@/lib/supabase";
import { formatPhoneNumber } from "@/lib/twilio-verify";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const IS_EMAIL_MOCK_MODE = !RESEND_API_KEY || process.env.NEXT_PUBLIC_MOCK_APIS === "true";

/**
 * Action: Sends an invitation to a phone number + email
 */
export async function sendInvitationAction(phone: string, email: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized. Please sign in to send invitations." };
    }

    if (!phone || phone.trim().length < 8) {
      return { success: false, message: "A valid phone number is required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.endsWith("@numid.us") || email.endsWith("@numid.dev")) {
      return { success: false, message: "A valid destination email is required." };
    }

    const formattedPhone = formatPhoneNumber(phone);
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    const adminClient = createAdminClient();

    // 1. Check if user already exists with this phone number
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .or(`phone_number.eq.${cleanPhone},phone_number.eq.${formattedPhone},phone_number.eq.+${cleanPhone}`)
      .maybeSingle();

    if (existingUser) {
      return { success: false, message: "An account with this phone number already exists." };
    }

    // 2. Insert new invitation
    const { data: invite, error: insertError } = await adminClient
      .from("invitations")
      .insert({
        sender_id: user.id,
        phone_number: formattedPhone,
        email: email.trim().toLowerCase(),
        status: "pending"
      })
      .select()
      .single();

    if (insertError || !invite) {
      throw new Error(insertError?.message || "Failed to create invitation record.");
    }

    // 3. Send email via Resend
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteLink = `${siteUrl}/signup?invite=${invite.id}`;

    // Get sender numid address
    const { data: senderProfile } = await adminClient
      .from("users")
      .select("numid_address")
      .eq("id", user.id)
      .single();

    const senderName = senderProfile?.numid_address || "A friend";

    if (IS_EMAIL_MOCK_MODE) {
      console.log(`[Resend Email Invite MOCK] Sending invite to ${email}. Link: ${inviteLink}`);
      return {
        success: true,
        message: `MOCK INVITE SENT to ${email}. Check console for the link.`,
        invite
      };
    }

    const payload = {
      from: RESEND_FROM_EMAIL.includes("<") ? RESEND_FROM_EMAIL : `NumID Team <${RESEND_FROM_EMAIL}>`,
      to: [email.trim().toLowerCase()],
      subject: "You're invited to join NumID!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Join NumID</h2>
          <p><strong>${senderName}</strong> has invited you to claim your permanent, public email address on NumID.</p>
          <p>Your invited phone number is: <strong>${formattedPhone}</strong></p>
          <p>Please click the button below to accept your invitation and complete registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 30px;">This invitation link will expire in 7 days. If you were not expecting this invite, please ignore this email.</p>
        </div>
      `,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error("[Resend Invite ERROR] API returned error response:", data);
      throw new Error(data.message || `Resend API returned status ${response.status}`);
    }

    return {
      success: true,
      message: `Invitation sent to ${email} successfully!`,
      invite
    };
  } catch (error: any) {
    console.error("[sendInvitationAction ERROR]:", error);
    return { success: false, message: error.message || "Something went wrong" };
  }
}

/**
 * Action: Fetches invitations sent by the current user
 */
export async function getInvitationsAction() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    const adminClient = createAdminClient();
    const { data: invitations, error } = await adminClient
      .from("invitations")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, invitations: invitations || [] };
  } catch (error: any) {
    console.error("[getInvitationsAction ERROR]:", error);
    return { success: false, message: error.message || "Failed to fetch invitations" };
  }
}

/**
 * Action: Verifies if an invitation is valid and active
 */
export async function verifyInvitationAction(inviteId: string) {
  try {
    if (!inviteId || inviteId.trim().length === 0) {
      return { success: false, message: "Invitation code is required." };
    }

    const adminClient = createAdminClient();
    const { data: invite, error } = await adminClient
      .from("invitations")
      .select("*")
      .eq("id", inviteId)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !invite) {
      return { success: false, message: "Invalid, already accepted, or expired invitation." };
    }

    // Expiry check (7 days)
    const createdTime = new Date(invite.created_at).getTime();
    const expirationPeriod = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - createdTime > expirationPeriod) {
      await adminClient
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", inviteId);
      return { success: false, message: "This invitation has expired." };
    }

    return {
      success: true,
      invite: {
        id: invite.id,
        phone_number: invite.phone_number,
        email: invite.email
      }
    };
  } catch (error: any) {
    console.error("[verifyInvitationAction ERROR]:", error);
    return { success: false, message: error.message || "Failed to verify invitation" };
  }
}

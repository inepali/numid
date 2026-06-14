"use server";

import { createClient, createAdminClient } from "@/lib/supabase";
import { 
  addDestinationAddress, 
  getDestinationStatus, 
  createRoute, 
  updateRoute, 
  deleteRoute 
} from "@/lib/cloudflare-routing";
import { sendEmailVerification, checkEmailVerification } from "@/lib/twilio-verify";

/**
 * Action: Fetch all current user dashboard data, and handle auto-activation
 */
export async function getDashboardData() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    // Use admin client to fetch profile — bypasses RLS and session-cookie
    // timing issues that can occur immediately after a client-side login.
    const adminClient = createAdminClient();
    const { data: profile, error: dbError } = await adminClient
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (dbError || !profile) {
      console.error("[getDashboardData] Profile fetch error:", dbError?.message, "user_id:", user.id);
      return { success: false, message: "Profile not found" };
    }

    const adminClient = createAdminClient();

    // Check if account needs activation (pending, phone verified, and email verified in Supabase)
    // In our flow, email is verified when they click the Supabase signup confirmation link.
    if (profile.status === "pending" && profile.phone_verified && profile.email_verified) {
      console.log(`[Dashboard] Attempting auto-activation for user: ${profile.id}`);
      
      try {
        // 1. Add destination email address to Cloudflare account
        await addDestinationAddress(profile.destination_email);

        // 2. Check if the address is verified in Cloudflare
        const statusCheck = await getDestinationStatus(profile.destination_email);

        let routeId = profile.cloudflare_route_id;
        let finalStatus = "pending";

        // If verified, we can create the zone routing rule immediately
        if (statusCheck.verified) {
          routeId = await createRoute(profile.phone_number, profile.destination_email);
          finalStatus = "active";

          // Save to DB
          await adminClient
            .from("users")
            .update({
              cloudflare_route_id: routeId,
              status: finalStatus,
            })
            .eq("id", user.id);

          await adminClient.from("audit_logs").insert({
            user_id: user.id,
            action: "activate_account_success",
            metadata: {
              route_id: routeId,
              numid_address: profile.numid_address,
              destination_email: profile.destination_email,
            },
          });
        } else {
          // If not verified in Cloudflare yet, we keep it pending but track that it's waiting for Cloudflare
          await adminClient.from("audit_logs").insert({
            user_id: user.id,
            action: "activate_account_waiting_cloudflare",
            metadata: {
              destination_email: profile.destination_email,
            },
          });
        }

        // Fetch fresh profile state
        const { data: updatedProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        return {
          success: true,
          profile: updatedProfile,
          message: statusCheck.verified 
            ? "Your NumID is fully active!" 
            : "Verification required: Cloudflare has sent an verification email to your destination inbox. Please verify it to activate forwarding.",
        };
      } catch (err: any) {
        console.error("[Dashboard] Auto-activation error:", err);
        return { success: true, profile, error: "Cloudflare provisioning failed: " + err.message };
      }
    }

    // Fetch audit logs
    const { data: auditLogs } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      success: true,
      profile,
      auditLogs: auditLogs || [],
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to load dashboard data" };
  }
}

/**
 * Action: Send verification OTP for updating destination email
 */
export async function sendNewEmailOTPAction(newEmail: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      return { success: false, message: "Invalid email format" };
    }

    const res = await sendEmailVerification(newEmail);
    return res;
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to send email OTP" };
  }
}

/**
 * Action: Verify email OTP and update destination email in DB, Supabase Auth, and Cloudflare
 */
export async function verifyNewEmailOTPAction(newEmail: string, code: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      return { success: false, message: "Invalid email format" };
    }

    if (!code || code.trim().length === 0) {
      return { success: false, message: "Verification code is required" };
    }

    // Verify OTP code via Twilio Verify
    const verifyRes = await checkEmailVerification(newEmail, code);
    if (!verifyRes.success) {
      return { success: false, message: "Invalid or expired verification code" };
    }

    const adminClient = createAdminClient();

    // 1. Register new email as a destination address in Cloudflare
    await addDestinationAddress(newEmail);

    // 2. Set DB user status to pending, and email_verified to true for this verified email
    const { error: dbError } = await adminClient
      .from("users")
      .update({
        destination_email: newEmail,
        email_verified: true,
        status: "pending", // Keep pending until Cloudflare own forwarding status check is active
      })
      .eq("id", user.id);

    if (dbError) throw dbError;

    // 3. Log audit event
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "change_destination_email_success",
      metadata: { new_destination: newEmail },
    });

    // 4. Update and confirm email in Supabase Auth using admin client (so no Supabase confirm link needed)
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { 
        email: newEmail,
        email_confirm: true 
      }
    );

    if (authUpdateError) {
      console.warn("[Dashboard] Supabase Auth admin email update/confirm failed:", authUpdateError.message);
    }

    return {
      success: true,
      message: "Destination email updated and verified successfully! We've registered this with Cloudflare. Please click Cloudflare's independent verification email to activate routing.",
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update destination email" };
  }
}

/**
 * Action: Check Cloudflare destination address verification status and provision routing rule
 */
export async function checkCloudflareStatusAction() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    // Check Cloudflare verification status
    const statusCheck = await getDestinationStatus(profile.destination_email);
    if (!statusCheck.verified) {
      return { 
        success: true, 
        verified: false, 
        message: "Cloudflare verification is still pending. Please check your inbox and click their verification link." 
      };
    }

    const adminClient = createAdminClient();

    // The address is verified in Cloudflare! Update the routing rule
    let routeId = profile.cloudflare_route_id;

    if (routeId) {
      // Rule exists, update it
      await updateRoute(routeId, profile.phone_number, profile.destination_email);
    } else {
      // Rule doesn't exist, create it
      routeId = await createRoute(profile.phone_number, profile.destination_email);
    }

    // Update user status in database
    await adminClient
      .from("users")
      .update({
        cloudflare_route_id: routeId,
        email_verified: true,
        status: "active",
      })
      .eq("id", user.id);

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "cloudflare_verified_and_activated",
      metadata: {
        route_id: routeId,
        destination_email: profile.destination_email,
      },
    });

    return {
      success: true,
      verified: true,
      message: "Verification complete! Your forwarding route is now fully active.",
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Verification check failed" };
  }
}

/**
 * Action: Export all account data
 */
export async function exportDataAction() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
    const { data: verificationLogs } = await supabase.from("verification_logs").select("*").eq("user_id", user.id);
    const { data: auditLogs } = await supabase.from("audit_logs").select("*").eq("user_id", user.id);

    const exportBlob = {
      exportedAt: new Date().toISOString(),
      accountInfo: profile,
      verificationHistory: verificationLogs || [],
      auditTrail: auditLogs || [],
    };

    return {
      success: true,
      data: JSON.stringify(exportBlob, null, 2),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to export data" };
  }
}

/**
 * Action: Delete account and teardown routing rule
 */
export async function deleteAccountAction() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    const { data: profile } = await supabase.from("users").select("cloudflare_route_id").eq("id", user.id).single();
    
    // 1. Delete Cloudflare Route if active
    if (profile?.cloudflare_route_id) {
      try {
        await deleteRoute(profile.cloudflare_route_id);
      } catch (cfErr) {
        console.error("[Dashboard] Failed to clean up Cloudflare route during account deletion:", cfErr);
      }
    }

    const adminClient = createAdminClient();

    // 2. Delete user from auth.users (which cascades to public.users and verification/audit logs)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    // 3. Clear auth cookies/session
    await supabase.auth.signOut();

    return {
      success: true,
      message: "Account deleted successfully.",
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete account" };
  }
}

/**
 * Action: Manually verify destination email in Mock Mode
 */
export async function mockVerifyDestinationEmailAction(email: string) {
  try {
    const { mockVerifyDestinationEmail } = require("@/lib/cloudflare-routing");
    const verified = await mockVerifyDestinationEmail(email);
    return { success: verified, message: verified ? "Mock email verified successfully!" : "Failed to verify mock email." };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to trigger mock verification" };
  }
}

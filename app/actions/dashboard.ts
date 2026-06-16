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
      console.error("[getDashboardData] Profile fetch error:", dbError?.message, "| code:", dbError?.code, "| user_id:", user.id);
      return { success: false, message: `Profile not found${dbError ? " — " + dbError.message : ""}` };
    }

    // Check if account needs activation (pending, phone verified, and email verified in Supabase)
    // In our flow, email is verified when they click the Supabase signup confirmation link.
    if (
      profile.status === "pending" && 
      profile.phone_verified && 
      profile.email_verified &&
      profile.destination_email &&
      !profile.destination_email.endsWith("@numid.us") &&
      !profile.destination_email.endsWith("@numid.dev")
    ) {
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
          if (routeId) {
            try {
              await updateRoute(routeId, profile.phone_number, profile.destination_email);
            } catch (err: any) {
              if (err.message?.includes("ID not found") || err.message?.includes("not found")) {
                console.log(`[Cloudflare Routing] Route ID ${routeId} not found in Cloudflare. Creating new rule...`);
                routeId = await createRoute(profile.phone_number, profile.destination_email);
              } else {
                throw err;
              }
            }
          } else {
            routeId = await createRoute(profile.phone_number, profile.destination_email);
          }
          finalStatus = "active";

          // Save to DB
          await adminClient
            .from("users")
            .update({
              cloudflare_route_id: routeId,
              email_verified: true,
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
        const { data: updatedProfile } = await adminClient
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
    if (!newEmail || !emailRegex.test(newEmail) || newEmail.endsWith("@numid.us") || newEmail.endsWith("@numid.dev")) {
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
    if (!newEmail || !emailRegex.test(newEmail) || newEmail.endsWith("@numid.us") || newEmail.endsWith("@numid.dev")) {
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

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("users").select("*").eq("id", user.id).single();
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
    // The address is verified in Cloudflare! Update the routing rule
    let routeId = profile.cloudflare_route_id;

    if (routeId) {
      // Rule exists, update it
      try {
        await updateRoute(routeId, profile.phone_number, profile.destination_email);
      } catch (err: any) {
        if (err.message?.includes("ID not found") || err.message?.includes("not found")) {
          console.log(`[Cloudflare Routing] Route ID ${routeId} not found in Cloudflare. Creating new rule...`);
          routeId = await createRoute(profile.phone_number, profile.destination_email);
        } else {
          throw err;
        }
      }
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

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("users").select("*").eq("id", user.id).single();
    const { data: verificationLogs } = await adminClient.from("verification_logs").select("*").eq("user_id", user.id);
    const { data: auditLogs } = await adminClient.from("audit_logs").select("*").eq("user_id", user.id);

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

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("users").select("cloudflare_route_id").eq("id", user.id).single();
    
    // 1. Delete Cloudflare Route if active
    if (profile?.cloudflare_route_id) {
      try {
        await deleteRoute(profile.cloudflare_route_id);
      } catch (cfErr) {
        console.error("[Dashboard] Failed to clean up Cloudflare route during account deletion:", cfErr);
      }
    }

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

/**
 * Action: Test Cloudflare Email Routing API connectivity + auth
 * Safe read-only call — lists destination addresses. Use this to verify your
 * CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_ZONE_ID are correct
 * before attempting account provisioning.
 */
export async function testCloudflareConnectionAction() {
  try {
    const apiToken   = process.env.CLOUDFLARE_API_TOKEN   || "";
    const accountId  = process.env.CLOUDFLARE_ACCOUNT_ID  || "";
    const zoneId     = process.env.CLOUDFLARE_ZONE_ID     || "";
    const isMockMode = !apiToken || !accountId || !zoneId || process.env.NEXT_PUBLIC_MOCK_APIS === "true";

    const envStatus: Record<string, string> = {
      CLOUDFLARE_API_TOKEN:  apiToken  ? `set (${apiToken.substring(0, 8)}...)` : "❌ MISSING",
      CLOUDFLARE_ACCOUNT_ID: accountId ? `set (${accountId.substring(0, 8)}...)` : "❌ MISSING",
      CLOUDFLARE_ZONE_ID:    zoneId    ? `set (${zoneId.substring(0, 8)}...)`    : "❌ MISSING",
      mode: isMockMode ? "MOCK" : "LIVE",
    };

    if (isMockMode) {
      return {
        success: true,
        message: "Running in MOCK mode — no real Cloudflare call made.",
        detail: envStatus,
      };
    }

    // Step 1: Verify the token itself is valid (most direct auth check)
    const tokenResp = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiToken}` },
    });
    const tokenData = await tokenResp.json();
    if (!tokenResp.ok || tokenData.result?.status !== "active") {
      const cfError = tokenData.errors?.[0];
      return {
        success: false,
        message: `❌ API Token invalid — ${cfError?.message || tokenData.result?.status || "Unknown error"} (HTTP ${tokenResp.status})`,
        detail: {
          ...envStatus,
          token_status: tokenData.result?.status ?? "unknown",
          cf_error_code: String(cfError?.code ?? ""),
          cf_error_msg: cfError?.message ?? "",
          fix: "Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token. Use the 'Edit zone DNS' template then add: Account > Email Routing Addresses > Edit, Zone > Email Routing Rules > Edit.",
        },
      };
    }

    // Step 2: Test account-level — list destination addresses
    const addrResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/routing/addresses?per_page=5`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" },
      }
    );
    const addrData = await addrResp.json();
    if (!addrResp.ok) {
      const cfError = addrData.errors?.[0];
      return {
        success: false,
        message: `❌ Account API failed — ${cfError?.message || addrResp.statusText} (code: ${cfError?.code ?? addrResp.status})`,
        detail: {
          ...envStatus,
          cf_error_code: String(cfError?.code ?? ""),
          fix: cfError?.code === 9109
            ? "Token is valid but lacks 'Account > Email Routing Addresses > Edit' permission. Recreate token with this scope."
            : cfError?.code === 7003 || cfError?.code === 7000
            ? "CLOUDFLARE_ACCOUNT_ID is wrong. Find it in Cloudflare Dashboard → right sidebar under 'Account ID'."
            : "Check CLOUDFLARE_ACCOUNT_ID in .env.local",
        },
      };
    }

    // Step 3: Test zone-level — list routing rules
    const zoneResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules?per_page=5`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" },
      }
    );
    const zoneData = await zoneResp.json();
    if (!zoneResp.ok) {
      const cfError = zoneData.errors?.[0];
      return {
        success: false,
        message: `❌ Zone API failed — ${cfError?.message || zoneResp.statusText} (code: ${cfError?.code ?? zoneResp.status})`,
        detail: {
          ...envStatus,
          cf_error_code: String(cfError?.code ?? ""),
          fix: cfError?.code === 9109
            ? "Token lacks 'Zone > Email Routing Rules > Edit' permission."
            : cfError?.code === 7003
            ? "CLOUDFLARE_ZONE_ID is wrong. Find it in Cloudflare Dashboard → your domain → Overview → Zone ID in right sidebar."
            : "Check CLOUDFLARE_ZONE_ID in .env.local",
        },
      };
    }

    return {
      success: true,
      message: `✅ All checks passed — ${addrData.result?.length ?? 0} destination address(es), ${zoneData.result?.length ?? 0} routing rule(s).`,
      detail: {
        ...envStatus,
        token_status: tokenData.result?.status ?? "active",
        destinations: String(addrData.result?.length ?? 0),
        routing_rules: String(zoneData.result?.length ?? 0),
      },
    };
  } catch (error: any) {
    return { success: false, message: `Unexpected error: ${error.message}` };
  }
}

/**
 * Action: Manually trigger Cloudflare Email Routing provisioning for the current user.
 * Registers the destination email and creates the forwarding rule.
 * Useful for testing after confirming Cloudflare credentials are working.
 */
export async function provisionCloudflareRouteAction() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, message: "Unauthorized" };

    const adminClient = createAdminClient();
    const { data: profile, error: dbError } = await adminClient
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (dbError || !profile) return { success: false, message: "Profile not found" };

    if (
      !profile.destination_email ||
      profile.destination_email.endsWith("@numid.us") ||
      profile.destination_email.endsWith("@numid.dev")
    ) {
      return { success: false, message: "Valid destination email must be set before provisioning." };
    }

    // Step 1: Register destination email
    await addDestinationAddress(profile.destination_email);

    // Step 2: Check if verified in Cloudflare
    const statusCheck = await getDestinationStatus(profile.destination_email);
    if (!statusCheck.verified) {
      return {
        success: false,
        message: "Destination email registered but not yet verified in Cloudflare. Check your inbox for Cloudflare's verification email and click the link, then try again.",
      };
    }

    // Step 3: Create or update routing rule
    let routeId = profile.cloudflare_route_id;
    if (routeId) {
      try {
        await updateRoute(routeId, profile.phone_number, profile.destination_email);
      } catch (err: any) {
        if (err.message?.includes("ID not found") || err.message?.includes("not found")) {
          console.log(`[Cloudflare Routing] Route ID ${routeId} not found in Cloudflare. Creating new rule...`);
          routeId = await createRoute(profile.phone_number, profile.destination_email);
        } else {
          throw err;
        }
      }
    } else {
      routeId = await createRoute(profile.phone_number, profile.destination_email);
    }

    // Step 4: Update DB
    await adminClient
      .from("users")
      .update({ cloudflare_route_id: routeId, email_verified: true, status: "active" })
      .eq("id", user.id);

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "manual_cloudflare_provision",
      metadata: { route_id: routeId, destination_email: profile.destination_email },
    });

    return {
      success: true,
      message: `✅ Cloudflare route provisioned! Route ID: ${routeId}. Email forwarding is now active.`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Cloudflare provisioning failed" };
  }
}

/**
 * Action: Update social profiles for the authenticated user
 */
export async function updateSocialProfilesAction(profiles: Record<string, string>) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    // Sanitize values and format profile data
    const sanitizedProfiles: Record<string, string> = {};
    for (const [key, val] of Object.entries(profiles)) {
      if (val && val.trim().length > 0) {
        sanitizedProfiles[key] = val.trim();
      }
    }

    const adminClient = createAdminClient();
    const { error: dbError } = await adminClient
      .from("users")
      .update({
        social_profiles: sanitizedProfiles,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (dbError) {
      if (dbError.message?.includes("column \"social_profiles\" of relation \"users\" does not exist") || dbError.code === "42703") {
        throw new Error("Database update failed: Column 'social_profiles' is missing. Please run the SQL migration in your Supabase SQL Editor first!");
      }
      throw dbError;
    }

    // Log audit event
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "update_social_profiles",
      metadata: { count: Object.keys(sanitizedProfiles).length },
    });

    return {
      success: true,
      message: "Public profile social links updated successfully!",
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update social profiles" };
  }
}

/**
 * Action: Save destination email directly to DB, and register it on Cloudflare Email Routing
 */
export async function saveDestinationEmailAction(newEmail: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail) || newEmail.endsWith("@numid.us") || newEmail.endsWith("@numid.dev")) {
      return { success: false, message: "Invalid email format" };
    }

    const adminClient = createAdminClient();

    // 1. Register new email as a destination address in Cloudflare
    await addDestinationAddress(newEmail);

    // 2. Set DB user status to pending, and email_verified to false (until Cloudflare verifies it)
    const { error: dbError } = await adminClient
      .from("users")
      .update({
        destination_email: newEmail,
        email_verified: false,
        status: "pending", 
      })
      .eq("id", user.id);

    if (dbError) throw dbError;

    // 3. Log audit event
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "save_destination_email",
      metadata: { destination_email: newEmail },
    });

    return {
      success: true,
      message: "Destination email saved! We have registered it with Cloudflare. Please check your inbox for Cloudflare's verification email and click the link to activate forwarding.",
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to save destination email" };
  }
}


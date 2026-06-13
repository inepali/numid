"use server";

import { createClient, createAdminClient } from "@/lib/supabase";
import { 
  createRoute, 
  updateRoute, 
  deleteRoute, 
  addDestinationAddress 
} from "@/lib/cloudflare-routing";

/**
 * Helper to assert that the calling user is an Admin
 */
async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required");
  }

  return user;
}

/**
 * Action: Fetch admin system statistics
 */
export async function adminGetStats() {
  try {
    const adminUser = await assertAdmin();
    const adminClient = createAdminClient();

    // 1. Fetch counts
    const { count: totalUsers } = await adminClient.from("users").select("*", { count: "exact", head: true });
    const { count: activeUsers } = await adminClient.from("users").select("*", { count: "exact", head: true }).eq("status", "active");
    const { count: disabledUsers } = await adminClient.from("users").select("*", { count: "exact", head: true }).eq("status", "disabled");
    const { count: pendingUsers } = await adminClient.from("users").select("*", { count: "exact", head: true }).eq("status", "pending");

    // 2. Compute SMS verification conversion rate
    const { count: smsSent } = await adminClient.from("verification_logs").select("*", { count: "exact", head: true }).eq("type", "sms");
    const { count: smsVerified } = await adminClient.from("verification_logs").select("*", { count: "exact", head: true }).eq("type", "sms").eq("status", "verified");

    const smsSuccessRate = smsSent && smsSent > 0 ? Math.round((smsVerified! / smsSent) * 100) : 0;

    // 3. Fetch recent audit logs
    const { data: recentAuditLogs } = await adminClient
      .from("audit_logs")
      .select(`
        id,
        action,
        metadata,
        created_at,
        user_id
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        disabledUsers: disabledUsers || 0,
        pendingUsers: pendingUsers || 0,
        smsSent: smsSent || 0,
        smsVerified: smsVerified || 0,
        smsSuccessRate,
      },
      auditLogs: recentAuditLogs || [],
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to load admin stats" };
  }
}

/**
 * Action: Search and page users
 */
export async function adminSearchUsers(searchQuery: string) {
  try {
    await assertAdmin();
    const adminClient = createAdminClient();

    let query = adminClient.from("users").select("*").order("created_at", { ascending: false });

    if (searchQuery && searchQuery.trim() !== "") {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`phone_number.ilike.${q},destination_email.ilike.${q},numid_address.ilike.${q}`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    return {
      success: true,
      users: users || [],
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to search users" };
  }
}

/**
 * Action: Disable or enable a user account
 */
export async function adminToggleUserStatus(userId: string, currentStatus: string) {
  try {
    const adminUser = await assertAdmin();
    const adminClient = createAdminClient();

    const newStatus = currentStatus === "disabled" ? "active" : "disabled";

    // 1. Fetch user route details
    const { data: profile } = await adminClient.from("users").select("*").eq("id", userId).single();
    if (!profile) throw new Error("User not found");

    // 2. If user is being disabled, we clean up the Cloudflare rule. If being enabled, we recreate it.
    if (profile.cloudflare_route_id) {
      if (newStatus === "disabled") {
        // Remove rule to stop routing
        try {
          await deleteRoute(profile.cloudflare_route_id);
        } catch (cfErr) {
          console.error("Cloudflare delete failed during admin toggle:", cfErr);
        }
        
        // Clear route ID in database
        await adminClient
          .from("users")
          .update({ cloudflare_route_id: null, status: newStatus })
          .eq("id", userId);
      }
    } else if (newStatus === "active" && profile.phone_verified && profile.email_verified) {
      // Recreate routing rule
      try {
        await addDestinationAddress(profile.destination_email);
        const routeId = await createRoute(profile.phone_number, profile.destination_email);
        
        await adminClient
          .from("users")
          .update({ cloudflare_route_id: routeId, status: newStatus })
          .eq("id", userId);
      } catch (cfErr) {
        console.error("Cloudflare create failed during admin toggle:", cfErr);
        // Still update DB status
        await adminClient.from("users").update({ status: newStatus }).eq("id", userId);
      }
    } else {
      // Simple status update
      await adminClient.from("users").update({ status: newStatus }).eq("id", userId);
    }

    // 3. Log event
    await adminClient.from("audit_logs").insert({
      user_id: profile.id,
      action: newStatus === "disabled" ? "admin_disabled_user" : "admin_enabled_user",
      metadata: { admin_id: adminUser.id },
    });

    return {
      success: true,
      message: `User status changed to ${newStatus}.`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update user status" };
  }
}

/**
 * Action: Delete a user completely (Admin operation)
 */
export async function adminDeleteUser(userId: string) {
  try {
    const adminUser = await assertAdmin();
    const adminClient = createAdminClient();

    const { data: profile } = await adminClient.from("users").select("cloudflare_route_id").eq("id", userId).single();
    
    // 1. Delete Cloudflare Route if active
    if (profile?.cloudflare_route_id) {
      try {
        await deleteRoute(profile.cloudflare_route_id);
      } catch (cfErr) {
        console.error("Cloudflare cleanup failed during admin user deletion:", cfErr);
      }
    }

    // 2. Delete user from auth.users (triggers cascade deletes)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    // 3. Log event (logged with null user_id as user was deleted, metadata has details)
    await adminClient.from("audit_logs").insert({
      action: "admin_deleted_user",
      metadata: { deleted_user_id: userId, admin_id: adminUser.id },
    });

    return {
      success: true,
      message: "User deleted successfully.",
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete user" };
  }
}

/**
 * Action: Force recreation of Cloudflare Route (Admin synchronization rescue)
 */
export async function adminRecreateRoute(userId: string) {
  try {
    const adminUser = await assertAdmin();
    const adminClient = createAdminClient();

    const { data: profile } = await adminClient.from("users").select("*").eq("id", userId).single();
    if (!profile) throw new Error("User not found");

    // 1. Clean up old route if recorded
    if (profile.cloudflare_route_id) {
      try {
        await deleteRoute(profile.cloudflare_route_id);
      } catch (e) {
        console.log("Ignore error deleting old route:", e);
      }
    }

    // 2. Provision new route
    await addDestinationAddress(profile.destination_email);
    const routeId = await createRoute(profile.phone_number, profile.destination_email);

    // 3. Update database
    await adminClient
      .from("users")
      .update({
        cloudflare_route_id: routeId,
        status: "active",
      })
      .eq("id", userId);

    // 4. Log event
    await adminClient.from("audit_logs").insert({
      user_id: profile.id,
      action: "admin_recreated_route",
      metadata: { route_id: routeId, admin_id: adminUser.id },
    });

    return {
      success: true,
      message: "Cloudflare email routing rule recreated successfully.",
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to recreate route" };
  }
}

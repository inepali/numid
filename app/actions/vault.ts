"use server";

import { createClient, createAdminClient } from "@/lib/supabase";

export interface VaultItem {
  id?: string;
  user_id?: string;
  category: string;
  title: string;
  encrypted_data: string;
  iv: string;
  salt: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all E2EE vault items for the authenticated user
 */
export async function fetchVaultItemsAction() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("vault_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[FetchVaultItemsAction] Database error:", error);
      return { success: false, message: "Failed to retrieve vault items." };
    }

    return { success: true, items: data as VaultItem[] };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to retrieve vault items." };
  }
}

/**
 * Saves (inserts or updates) an E2EE vault item
 */
export async function saveVaultItemAction(item: VaultItem) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Unauthorized. Please log in." };
    }

    if (!item.category || !item.title || !item.encrypted_data || !item.iv || !item.salt) {
      return { success: false, message: "Missing required fields for vault item." };
    }

    const payload = {
      user_id: user.id,
      category: item.category,
      title: item.title,
      encrypted_data: item.encrypted_data,
      iv: item.iv,
      salt: item.salt,
      updated_at: new Date().toISOString()
    };

    if (item.id) {
      // Update existing item
      const { error } = await supabase
        .from("vault_items")
        .update(payload)
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("[SaveVaultItemAction] Update database error:", error);
        return { success: false, message: "Failed to update vault item." };
      }
    } else {
      // Insert new item
      const { error } = await supabase
        .from("vault_items")
        .insert(payload);

      if (error) {
        console.error("[SaveVaultItemAction] Insert database error:", error);
        return { success: false, message: "Failed to save vault item." };
      }
    }

    return { success: true, message: "Vault item saved successfully." };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to save vault item." };
  }
}

/**
 * Deletes a vault item by ID
 */
export async function deleteVaultItemAction(id: string) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("vault_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DeleteVaultItemAction] Database error:", error);
      return { success: false, message: "Failed to delete vault item." };
    }

    return { success: true, message: "Vault item deleted successfully." };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete vault item." };
  }
}

/**
 * Fetch all E2EE vault items by phone number for public decryption
 */
export async function fetchSharedVaultItemsAction(phone: string) {
  try {
    if (!phone) {
      return { success: false, message: "Phone number is required." };
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      return { success: false, message: "Invalid phone number format." };
    }

    const phoneCandidates: string[] = [cleanPhone, `+${cleanPhone}`];
    const addressCandidates: string[] = [`${cleanPhone}@numid.us`];

    if (cleanPhone.length === 10) {
      const withUS = `1${cleanPhone}`;
      phoneCandidates.push(withUS, `+${withUS}`);
      addressCandidates.push(`${withUS}@numid.us`);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) {
      const withoutUS = cleanPhone.substring(1);
      phoneCandidates.push(withoutUS, `+${withoutUS}`);
      addressCandidates.push(`${withoutUS}@numid.us`);
    }

    const orFilters = [
      ...phoneCandidates.map(p => `phone_number.eq.${p}`),
      ...addressCandidates.map(a => `numid_address.eq.${a}`),
      ...addressCandidates.map(a => `numid_address.eq.${a.replace("@numid.us", "@numid.dev")}`)
    ].join(",");

    const adminClient = createAdminClient();
    const { data: userRecord, error: userError } = await adminClient
      .from("users")
      .select("id, phone_number, numid_address, first_name, last_name, status, phone_verified, email_verified")
      .eq("status", "active")
      .or(orFilters)
      .maybeSingle();

    if (userError || !userRecord) {
      return { success: false, message: "Profile not found or is inactive." };
    }

    if (!userRecord.phone_verified || !userRecord.email_verified) {
      return { success: false, message: "Profile is not fully verified." };
    }

    // Retrieve encrypted vault items bypassing RLS
    const { data: vaultItems, error: vaultError } = await adminClient
      .from("vault_items")
      .select("category, title, encrypted_data, iv, salt")
      .eq("user_id", userRecord.id);

    if (vaultError) {
      console.error("[FetchSharedVaultItemsAction] Database error:", vaultError);
      return { success: false, message: "Failed to retrieve encrypted vault items." };
    }

    return {
      success: true,
      profile: {
        phone_number: userRecord.phone_number,
        numid_address: userRecord.numid_address,
        first_name: userRecord.first_name,
        last_name: userRecord.last_name
      },
      items: vaultItems as VaultItem[]
    };
  } catch (error: any) {
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}

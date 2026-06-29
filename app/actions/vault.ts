"use server";

import { createClient } from "@/lib/supabase";

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

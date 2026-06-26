import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const phone = "5154146054";
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    const phoneCandidates: string[] = [cleanPhone, `+${cleanPhone}`];
    const addressCandidates: string[] = [`${cleanPhone}@numid.us`];

    if (cleanPhone.length === 10) {
      const withUS = `1${cleanPhone}`;
      phoneCandidates.push(withUS, `+${withUS}`);
      addressCandidates.push(`${withUS}@numid.us`);
    }

    const orFilters = [
      ...phoneCandidates.map(p => `phone_number.eq.${p}`),
      ...addressCandidates.map(a => `numid_address.eq.${a}`)
    ].join(",");

    const orFiltersQuoted = [
      ...phoneCandidates.map(p => `phone_number.eq."${p}"`),
      ...addressCandidates.map(a => `numid_address.eq."${a}"`)
    ].join(",");

    const adminClient = createAdminClient();
    
    // Test raw filter query with maybeSingle
    const { data: rawData, error: rawError } = await adminClient
      .from("users")
      .select("phone_number, numid_address, social_profiles, private_profiles, status, email_verified, phone_verified, avatar_url, avatar_updated_at, first_name, last_name")
      .eq("status", "active")
      .or(orFilters)
      .maybeSingle();

    // Test quoted filter query with maybeSingle
    const { data: quotedData, error: quotedError } = await adminClient
      .from("users")
      .select("phone_number, numid_address, social_profiles, private_profiles, status, email_verified, phone_verified, avatar_url, avatar_updated_at, first_name, last_name")
      .eq("status", "active")
      .or(orFiltersQuoted)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      orFilters,
      rawQuery: {
        error: rawError ? { message: rawError.message, code: rawError.code } : null,
        data: rawData
      },
      orFiltersQuoted,
      quotedQuery: {
        error: quotedError ? { message: quotedError.message, code: quotedError.code } : null,
        data: quotedData
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message
    });
  }
}

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
    
    // Test raw filter query
    const { data: rawData, error: rawError } = await adminClient
      .from("users")
      .select("id, phone_number, numid_address")
      .eq("status", "active")
      .or(orFilters);

    // Test quoted filter query
    const { data: quotedData, error: quotedError } = await adminClient
      .from("users")
      .select("id, phone_number, numid_address")
      .eq("status", "active")
      .or(orFiltersQuoted);

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

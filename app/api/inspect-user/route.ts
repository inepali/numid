import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    
    // Fetch all users in public.users to see what's in there
    const { data: users, error } = await adminClient
      .from("users")
      .select("*");

    return NextResponse.json({
      success: true,
      count: users?.length ?? 0,
      users,
      error: error ? error.message : null
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message
    });
  }
}

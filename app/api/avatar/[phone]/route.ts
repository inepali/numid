import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    if (!phone) {
      return new NextResponse("Phone parameter required", { status: 400 });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      return new NextResponse("Invalid phone number", { status: 400 });
    }

    // Look up the user by phone number to get their numid_address
    const adminClient = createAdminClient();
    const { data: userProfile } = await adminClient
      .from("users")
      .select("numid_address, avatar_updated_at")
      .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone}`)
      .maybeSingle();

    if (!userProfile || !userProfile.avatar_updated_at) {
      return new NextResponse("Avatar not found", { status: 404 });
    }

    const key = `${userProfile.numid_address}.jpg`;
    const isMock = !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_MOCK_APIS === "true";

    let buffer: Buffer;

    if (isMock) {
      // Local Mock Mode: read from scratch/avatars
      const filePath = path.join(process.cwd(), "scratch", "avatars", key);
      try {
        buffer = await fs.readFile(filePath);
      } catch (e) {
        return new NextResponse("Mock avatar file not found", { status: 404 });
      }
    } else {
      // Live Mode: read from Cloudflare R2
      const { getFromR2 } = await import("@/lib/r2");
      try {
        buffer = await getFromR2(key);
      } catch (e) {
        console.error(`[R2 GET] Object not found: ${key}`, e);
        return new NextResponse("Avatar object not found on R2", { status: 404 });
      }
    }

    // Return the avatar image
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    return response;
  } catch (error: any) {
    console.error("[Avatar API] Error serving avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

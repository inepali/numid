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

    let searchPhone = cleanPhone;
    if (searchPhone.length === 11 && searchPhone.startsWith("1")) {
      searchPhone = searchPhone.substring(1);
    }

    // Look up the user by phone number or NumID address to get their numid_address
    const adminClient = createAdminClient();
    const { data: userProfile } = await adminClient
      .from("users")
      .select("numid_address, avatar_updated_at")
      .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone},numid_address.eq.${searchPhone}@numid.us,numid_address.eq.${searchPhone}@numid.dev`)
      .maybeSingle();

    if (!userProfile || !userProfile.avatar_updated_at) {
      return new NextResponse("Avatar not found", { status: 404 });
    }

    const key = userProfile.numid_address;
    const isMock = !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    let buffer: Buffer;

    if (isMock) {
      // Local Mock Mode: read from scratch/avatars
      const os = require("os");
      const dirPath = (process.env.VERCEL || process.env.LAMBDA_TASK_ROOT)
        ? path.join(os.tmpdir(), "scratch", "avatars")
        : path.join(process.cwd(), "scratch", "avatars");
      const filePath = path.join(dirPath, key);
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

    // Detect mime type dynamically from buffer magic bytes
    let mimeType = "image/jpeg";
    if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      mimeType = "image/jpeg";
    } else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      mimeType = "image/png";
    } else if (buffer.length >= 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      mimeType = "image/gif";
    } else if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      mimeType = "image/webp";
    }

    // Return the avatar image
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    return response;
  } catch (error: any) {
    console.error("[Avatar API] Error serving avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

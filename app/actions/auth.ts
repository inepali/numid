"use server";

import { createClient, createAdminClient } from "@/lib/supabase";
import { sendSMSVerification, checkSMSVerification } from "@/lib/twilio-verify";
import { cookies } from "next/headers";

// Simple global memory rate limiter for development/production fallback
if (typeof globalThis !== "undefined") {
  (globalThis as any)._otpRateLimits = (globalThis as any)._otpRateLimits || {};
}

interface RateLimit {
  count: number;
  resetTime: number;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  const limits = (globalThis as any)._otpRateLimits;
  const now = Date.now();
  
  const record: RateLimit = limits[key] || { count: 0, resetTime: now + 3600000 };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + 3600000;
  }

  if (record.count >= 5) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  limits[key] = record;

  return { allowed: true, remaining: 5 - record.count, resetTime: record.resetTime };
}

/**
 * Action: Sends phone OTP
 */
export async function sendPhoneOTPAction(phone: string) {
  try {
    if (!phone || phone.trim().length < 8) {
      return { success: false, message: "Please enter a valid phone number" };
    }

    // Rate Limiting (5 requests per hour)
    const rateLimit = checkRateLimit(phone.trim());
    if (!rateLimit.allowed) {
      const minsLeft = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Rate limit exceeded. Maximum 5 OTP requests per hour. Try again in ${minsLeft} minutes.` 
      };
    }

    const res = await sendSMSVerification(phone);
    return res;
  } catch (error: any) {
    return { success: false, message: error.message || "Something went wrong" };
  }
}

/**
 * Action: Verifies phone OTP
 */
export async function verifyPhoneOTPAction(phone: string, code: string) {
  try {
    if (!phone || !code) {
      return { success: false, message: "Phone and code are required" };
    }

    const res = await checkSMSVerification(phone, code);
    if (res.success) {
      const cookieStore = await cookies();
      // Set an HTTP-only temporary verification cookie valid for 15 minutes
      cookieStore.set("numid_verified_phone", phone, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 mins
        path: "/",
      });
      cookieStore.set("numid_phone_verified_at", Date.now().toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60,
        path: "/",
      });
    }
    return res;
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to verify OTP" };
  }
}

/**
 * Action: Signs up user and marks phone as verified
 */
export async function signUpAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    if (!email || !password) {
      return { success: false, message: "Email and password are required" };
    }

    const cookieStore = await cookies();
    const verifiedPhone = cookieStore.get("numid_verified_phone")?.value;
    const verifiedTimeStr = cookieStore.get("numid_phone_verified_at")?.value;

    if (!verifiedPhone || !verifiedTimeStr) {
      return { success: false, message: "Phone number has not been verified yet. Please verify your phone first." };
    }

    const verifiedTime = parseInt(verifiedTimeStr, 10);
    if (Date.now() - verifiedTime > 15 * 60 * 1000) {
      return { success: false, message: "Phone verification expired. Please verify your phone again." };
    }

    const supabase = await createClient();
    
    // Sign up using Supabase Auth
    // Pass the phone number in metadata so trigger handle_new_user picks it up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
        data: {
          phone_number: verifiedPhone,
          role: "user",
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data.user) {
      return { success: false, message: "Signup failed. Please try again." };
    }

    // Now, update phone_verified = true in public.users using admin client (since RLS restricts updates)
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from("users")
      .update({ phone_verified: true })
      .eq("id", data.user.id);

    if (updateError) {
      console.error("[SignUpAction] Error updating phone_verified status:", updateError);
    }

    // Log the successful verification into public.verification_logs
    await adminClient.from("verification_logs").insert({
      user_id: data.user.id,
      type: "sms",
      status: "verified",
    });

    // Clear verification cookies
    cookieStore.delete("numid_verified_phone");
    cookieStore.delete("numid_phone_verified_at");

    return { 
      success: true, 
      message: "Signup successful! We have sent a verification link to your email. Please verify it to activate your account." 
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to complete signup" };
  }
}

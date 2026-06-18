"use server";

import { createClient, createAdminClient } from "@/lib/supabase";
import { 
  sendSMSVerification, 
  checkSMSVerification,
  sendEmailVerification,
  checkEmailVerification,
  formatPhoneNumber
} from "@/lib/twilio-verify";
import { addDestinationAddress } from "@/lib/cloudflare-routing";
import { cookies, headers } from "next/headers";

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

    const formattedPhone = formatPhoneNumber(phone);
    const adminClient = createAdminClient();
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("phone_number", formattedPhone)
      .maybeSingle();

    if (existingUser) {
      return { success: false, message: "Account already exists, please use login instead" };
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
 * Action: Sends email OTP
 */
export async function sendEmailOTPAction(email: string) {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, message: "Please enter a valid email address" };
    }

    // Rate Limiting (5 requests per hour)
    const rateLimit = checkRateLimit(email.trim().toLowerCase());
    if (!rateLimit.allowed) {
      const minsLeft = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Rate limit exceeded. Maximum 5 OTP requests per hour. Try again in ${minsLeft} minutes.` 
      };
    }

    const res = await sendEmailVerification(email);
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
    const password = formData.get("password") as string;
    
    if (!password) {
      return { success: false, message: "Password is required" };
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

    const numidEmail = `${verifiedPhone.replace("+", "")}@numid.us`;
    const supabase = await createClient();
    
    // Sign up using Supabase Auth
    // Pass the phone number in metadata so trigger handle_new_user picks it up
    const { data, error } = await supabase.auth.signUp({
      email: numidEmail,
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

    const adminClient = createAdminClient();

    // Confirm the email in Supabase Auth using the admin client
    const { error: confirmError } = await adminClient.auth.admin.updateUserById(
      data.user.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error("[SignUpAction] Error confirming user email:", confirmError);
    }

    // Now, update phone_verified = true in public.users using admin client (since RLS restricts updates)
    const { error: updateError } = await adminClient
      .from("users")
      .update({ phone_verified: true })
      .eq("id", data.user.id);

    if (updateError) {
      console.error("[SignUpAction] Error updating phone_verified status:", updateError);
    }

    // Audit Log for signup
    await adminClient.from("audit_logs").insert({
      user_id: data.user.id,
      action: "signup_success",
      metadata: { phone_number: verifiedPhone, email: numidEmail }
    });

    // Log the successful verification into public.verification_logs
    await adminClient.from("verification_logs").insert([
      {
        user_id: data.user.id,
        type: "sms",
        status: "verified",
      }
    ]);

    // Clear verification cookies
    cookieStore.delete("numid_verified_phone");
    cookieStore.delete("numid_phone_verified_at");

    return { 
      success: true, 
      message: "Signup successful! Your phone number has been verified. You can now access your dashboard." 
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to complete signup" };
  }
}

/**
 * Action: Sends SMS OTP for password reset lookup by phone number/email
 */
export async function sendPasswordResetOTPAction(phoneOrEmail: string) {
  try {
    if (!phoneOrEmail || phoneOrEmail.trim().length === 0) {
      return { success: false, message: "Please enter your phone number or email address." };
    }

    let phoneNumber = "";
    let isEmail = phoneOrEmail.includes("@");
    const adminClient = createAdminClient();

    if (isEmail && !phoneOrEmail.trim().toLowerCase().endsWith("@numid.us")) {
      // Lookup by destination email
      const { data: profiles, error } = await adminClient
        .from("users")
        .select("phone_number")
        .eq("destination_email", phoneOrEmail.trim().toLowerCase())
        .limit(1);
      if (error || !profiles || profiles.length === 0) {
        return { success: false, message: "No account found with this destination email." };
      }
      phoneNumber = profiles[0].phone_number;
    } else {
      // It's a phone number or NumID email
      let phonePart = phoneOrEmail.trim();
      if (phonePart.endsWith("@numid.us")) {
        phonePart = phonePart.split("@")[0];
      }
      const formattedPhone = formatPhoneNumber(phonePart);
      const { data: profiles, error } = await adminClient
        .from("users")
        .select("phone_number")
        .eq("phone_number", formattedPhone)
        .limit(1);
      if (error || !profiles || profiles.length === 0) {
        return { success: false, message: "No account found with this phone number." };
      }
      phoneNumber = profiles[0].phone_number;
    }

    // Rate Limiting (5 requests per hour)
    const rateLimit = checkRateLimit(phoneNumber);
    if (!rateLimit.allowed) {
      const minsLeft = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Rate limit exceeded. Maximum 5 OTP requests per hour. Try again in ${minsLeft} minutes.` 
      };
    }

    const res = await sendSMSVerification(phoneNumber);
    return res;
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to send reset code." };
  }
}

/**
 * Action: Verifies SMS OTP and resets user password via Supabase Auth Admin
 */
export async function resetPasswordWithOTPAction(phoneOrEmail: string, code: string, newPassword: string) {
  try {
    if (!phoneOrEmail || !code || !newPassword) {
      return { success: false, message: "All fields are required." };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters." };
    }

    let phoneNumber = "";
    let userId = "";
    let isEmail = phoneOrEmail.includes("@");
    const adminClient = createAdminClient();

    if (isEmail && !phoneOrEmail.trim().toLowerCase().endsWith("@numid.us")) {
      const { data: profiles, error } = await adminClient
        .from("users")
        .select("id, phone_number")
        .eq("destination_email", phoneOrEmail.trim().toLowerCase())
        .limit(1);
      if (error || !profiles || profiles.length === 0) {
        return { success: false, message: "No account found." };
      }
      phoneNumber = profiles[0].phone_number;
      userId = profiles[0].id;
    } else {
      let phonePart = phoneOrEmail.trim();
      if (phonePart.endsWith("@numid.us")) {
        phonePart = phonePart.split("@")[0];
      }
      const formattedPhone = formatPhoneNumber(phonePart);
      const { data: profiles, error } = await adminClient
        .from("users")
        .select("id, phone_number")
        .eq("phone_number", formattedPhone)
        .limit(1);
      if (error || !profiles || profiles.length === 0) {
        return { success: false, message: "No account found." };
      }
      phoneNumber = profiles[0].phone_number;
      userId = profiles[0].id;
    }

    // Verify code
    const verifyRes = await checkSMSVerification(phoneNumber, code);
    if (!verifyRes.success) {
      return { success: false, message: "Invalid or expired verification code." };
    }

    // Update password in Supabase Auth using admin client
    const { error: resetError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (resetError) {
      return { success: false, message: resetError.message };
    }

    // Audit Log
    await adminClient.from("audit_logs").insert({
      user_id: userId,
      action: "password_reset_success",
      metadata: { phone_number: phoneNumber }
    });

    return { 
      success: true, 
      message: "Password reset successful! You can now sign in with your new password." 
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to reset password." };
  }
}

/**
 * Action: Logs successful user sign-in to audit_logs
 */
export async function logSignInAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No active user session" };

    const adminClient = createAdminClient();
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || "unknown";
    const ip = reqHeaders.get("x-forwarded-for") || "unknown";

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "login_success",
      metadata: { user_agent: userAgent, ip }
    });

    return { success: true };
  } catch (error: any) {
    console.error("[logSignInAction] Unexpected error:", error);
    return { success: false, message: error.message || "Failed to log sign-in" };
  }
}

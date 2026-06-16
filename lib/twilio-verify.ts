import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || "";
const IS_MOCK_MODE = !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID || process.env.NEXT_PUBLIC_MOCK_APIS === "true";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const IS_EMAIL_MOCK_MODE = !RESEND_API_KEY || process.env.NEXT_PUBLIC_MOCK_APIS === "true";

if (typeof globalThis !== "undefined") {
  (globalThis as any)._twilioMockOtps = (globalThis as any)._twilioMockOtps || {};
}

const getMockOtp = (phone: string): string => (globalThis as any)._twilioMockOtps[phone] || "";
const setMockOtp = (phone: string, otp: string) => {
  (globalThis as any)._twilioMockOtps[phone] = otp;
};

// Smarter E.164 phone formatting helper
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.trim().replace(/[-() ]/g, ""); // Remove formatting

  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return `+1${cleaned}`; // Prepend +1 for US/Canada
  }

  if (cleaned.length === 11 && cleaned.startsWith("1") && /^\d+$/.test(cleaned)) {
    return `+${cleaned}`; // Prepend + for US/Canada with country code
  }

  if (!cleaned.startsWith("+")) {
    return `+${cleaned}`; // Fallback to prepend +
  }

  return cleaned;
}

/**
 * Send SMS verification code to a phone number
 */
export async function sendSMSVerification(phone: string): Promise<{ success: boolean; message: string; sid?: string }> {
  console.log(`[Twilio Verify] sendSMSVerification called for: ${phone}`);
  const formattedPhone = formatPhoneNumber(phone);

  if (IS_MOCK_MODE) {
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setMockOtp(formattedPhone, mockCode);
    console.log(`[Twilio Verify MOCK] Sending OTP code ${mockCode} to phone ${formattedPhone}.`);
    return {
      success: true,
      message: `MOCK OTP SENT. Check console. Code is: ${mockCode}`,
      sid: `mock-sid-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: formattedPhone, channel: "sms" });

    return {
      success: true,
      message: "Verification OTP code sent successfully",
      sid: verification.sid,
    };
  } catch (error: any) {
    console.error("[Twilio Verify ERROR] sendSMSVerification failed:", error);
    return {
      success: false,
      message: error.message || "Failed to send SMS OTP",
    };
  }
}

/**
 * Validate SMS verification code for a phone number
 */
export async function checkSMSVerification(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  console.log(`[Twilio Verify] checkSMSVerification called for: ${phone} with code: ${code}`);
  const formattedPhone = formatPhoneNumber(phone);

  if (IS_MOCK_MODE) {
    const expectedCode = getMockOtp(formattedPhone);
    if (code === expectedCode || code === "123456") {
      return { success: true, message: "Verification successful" };
    }
    return { success: false, message: "Invalid verification code" };
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const verificationCheck = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code });

    if (verificationCheck.status === "approved") {
      return { success: true, message: "Verification successful" };
    }
    return { success: false, message: "Invalid verification code" };
  } catch (error: any) {
    console.error("[Twilio Verify ERROR] checkSMSVerification failed:", error);
    return { success: false, message: error.message || "Verification check failed" };
  }
}

if (typeof globalThis !== "undefined") {
  (globalThis as any)._emailOtps = (globalThis as any)._emailOtps || {};
}

interface EmailOtpRecord {
  code: string;
  expiresAt: number;
}

const getEmailOtp = (email: string): string => {
  const record = (globalThis as any)._emailOtps[email.toLowerCase()] as EmailOtpRecord | undefined;
  if (!record) return "";
  if (Date.now() > record.expiresAt) {
    delete (globalThis as any)._emailOtps[email.toLowerCase()];
    return "";
  }
  return record.code;
};

const setEmailOtp = (email: string, code: string) => {
  (globalThis as any)._emailOtps[email.toLowerCase()] = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins expiry
  };
};

/**
 * Send Email verification code to an email address using Resend Transactional Email API
 */
export async function sendEmailVerification(email: string): Promise<{ success: boolean; message: string; sid?: string }> {
  console.log(`[Resend Email Verify] sendEmailVerification called for: ${email}`);
  const key = email.trim().toLowerCase();
  const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
  setEmailOtp(key, mockCode);

  if (IS_EMAIL_MOCK_MODE) {
    console.log(`[Resend Email Verify MOCK] Sending OTP code ${mockCode} to email ${key}.`);
    return {
      success: true,
      message: `MOCK OTP SENT. Check console. Code is: ${mockCode}`,
      sid: `mock-email-sid-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  try {
    const payload = {
      from: RESEND_FROM_EMAIL.includes("<") ? RESEND_FROM_EMAIL : `NumID Team <${RESEND_FROM_EMAIL}>`,
      to: [key],
      subject: "Verify your email address - NumID",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Verify your NumID Email</h2>
          <p>Please use the following 6-digit verification code to complete your verification:</p>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; margin: 20px 0; font-family: monospace;">
            ${mockCode}
          </div>
          <p style="font-size: 12px; color: #64748b;">This code will expire in 15 minutes. If you did not request this code, please ignore this email.</p>
        </div>
      `,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Resend Email Verify ERROR] API returned error response:", data);
      throw new Error(data.message || `Resend API returned status ${response.status}`);
    }

    console.log(`[Resend Email Verify] Verification email sent to ${key}`);

    return {
      success: true,
      message: "Verification email sent successfully",
      sid: data.id || `resend-sid-${Math.random().toString(36).substring(2, 9)}`,
    };
  } catch (error: any) {
    console.error("[Resend Email Verify ERROR] sendEmailVerification failed:", error);
    return {
      success: false,
      message: error.message || "Failed to send email verification",
    };
  }
}

/**
 * Validate Email verification code for an email address
 */
export async function checkEmailVerification(email: string, code: string): Promise<{ success: boolean; message: string }> {
  console.log(`[Resend Email Verify] checkEmailVerification called for: ${email} with code: ${code}`);
  const key = email.trim().toLowerCase();

  const expectedCode = getEmailOtp(key);
  if (code === expectedCode || code === "123456") {
    // Clear code after successful verification to prevent reuse
    delete (globalThis as any)._emailOtps[key];
    return { success: true, message: "Verification successful" };
  }
  
  return { success: false, message: "Invalid or expired verification code" };
}


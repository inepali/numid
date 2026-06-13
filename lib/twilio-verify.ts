import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || "";
const IS_MOCK_MODE = !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID || process.env.NEXT_PUBLIC_MOCK_APIS === "true";

// Simple in-memory mock store for verifying OTPs
if (typeof globalThis !== "undefined") {
  (globalThis as any)._twilioMockOtps = (globalThis as any)._twilioMockOtps || {};
}

const getMockOtp = (phone: string): string => (globalThis as any)._twilioMockOtps[phone] || "";
const setMockOtp = (phone: string, otp: string) => {
  (globalThis as any)._twilioMockOtps[phone] = otp;
};

/**
 * Send SMS verification code to a phone number
 */
export async function sendSMSVerification(phone: string): Promise<{ success: boolean; message: string; sid?: string }> {
  console.log(`[Twilio Verify] sendSMSVerification called for: ${phone}`);

  // Format phone number to E.164 if not done already
  let formattedPhone = phone.trim();
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+${formattedPhone}`;
  }

  if (IS_MOCK_MODE) {
    // Generate a simple 6 digit OTP code
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setMockOtp(formattedPhone, mockCode);
    
    const statusMsg = `[Twilio Verify MOCK] Sending OTP code ${mockCode} to phone ${formattedPhone}.`;
    console.log(statusMsg);
    
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

  let formattedPhone = phone.trim();
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+${formattedPhone}`;
  }

  if (IS_MOCK_MODE) {
    const expectedCode = getMockOtp(formattedPhone);
    
    // Support either the generated mock code or fallback '123456' for ease of testing
    if (code === expectedCode || code === "123456") {
      console.log(`[Twilio Verify MOCK] Verification SUCCESS for phone ${formattedPhone}`);
      return {
        success: true,
        message: "Verification successful",
      };
    }
    
    console.log(`[Twilio Verify MOCK] Verification FAILED for phone ${formattedPhone}. Expected ${expectedCode}, got ${code}`);
    return {
      success: false,
      message: "Invalid verification code",
    };
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const verificationCheck = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code });

    if (verificationCheck.status === "approved") {
      return {
        success: true,
        message: "Verification successful",
      };
    }

    return {
      success: false,
      message: "Invalid verification code",
    };
  } catch (error: any) {
    console.error("[Twilio Verify ERROR] checkSMSVerification failed:", error);
    return {
      success: false,
      message: error.message || "Verification check failed",
    };
  }
}

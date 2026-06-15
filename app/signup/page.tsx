"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  sendPhoneOTPAction, 
  verifyPhoneOTPAction, 
  sendEmailOTPAction, 
  signUpAction 
} from "@/app/actions/auth";
import { createBrowserClient } from "@supabase/ssr";
import ThemeToggle from "@/app/components/ThemeToggle";
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Smartphone, 
  Loader2, 
  ArrowLeft,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

type SetupStep = "PHONE_INPUT" | "OTP_INPUT" | "ACCOUNT_DETAILS" | "EMAIL_OTP_INPUT" | "EMAIL_PENDING";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-supabase.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("PHONE_INPUT");
  const [isPending, startTransition] = useTransition();

  // Form states
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  // Error/Success state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Countdown timer for OTP resend
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!phone || phone.trim().length < 8) {
      setErrorMsg("Please enter a valid phone number (e.g. +15154146054)");
      return;
    }

    startTransition(async () => {
      const res = await sendPhoneOTPAction(phone);
      if (res.success) {
        setStep("OTP_INPUT");
        setResendTimer(60);
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!otp || otp.length < 4) {
      setErrorMsg("Please enter the verification code");
      return;
    }

    startTransition(async () => {
      const res = await verifyPhoneOTPAction(phone, otp);
      if (res.success) {
        setStep("ACCOUNT_DETAILS");
        setSuccessMsg("Phone verified successfully! Now complete your account setup.");
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleRequestEmailOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Email and password are required");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }

    startTransition(async () => {
      const res = await sendEmailOTPAction(email);
      if (res.success) {
        setStep("EMAIL_OTP_INPUT");
        setResendTimer(60);
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleVerifyEmailAndSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!emailOtp || emailOtp.length < 4) {
      setErrorMsg("Please enter the email verification code");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("email_code", emailOtp);

    startTransition(async () => {
      const res = await signUpAction(formData);
      if (res.success) {
        setSuccessMsg("Account created successfully! Logging you in...");
        
        // Auto-login after successful registration
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("[SignUp Auto-Login Error]:", error);
          setErrorMsg("Account created but auto-login failed. Please sign in below.");
          // Fallback to manual login instruction step
          setStep("EMAIL_PENDING");
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleResendEmailOTP = () => {
    if (resendTimer > 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await sendEmailOTPAction(email);
      if (res.success) {
        setResendTimer(60);
        setSuccessMsg("Verification email resent. Check your inbox.");
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleResendOTP = () => {
    if (resendTimer > 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await sendPhoneOTPAction(phone);
      if (res.success) {
        setResendTimer(60);
        setSuccessMsg("OTP resent successfully. Check your messages.");
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6 sm:py-12 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Floating Theme Toggle in top-right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-900/5 dark:bg-indigo-950/15 blur-[120px] pointer-events-none" />

      {/* Header logo */}
      <Link href="/" className="flex items-center space-x-2 mb-8 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center">
          <span className="font-display font-extrabold text-white text-base">N</span>
        </div>
        <span className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
          Num<span className="text-indigo-650 dark:text-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300">ID</span>
        </span>
      </Link>

      {/* Signup Container Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl dark:shadow-none relative transition-colors duration-300">
        
        {/* Step Indicator */}
        {step !== "EMAIL_PENDING" && (
          <div className="flex justify-between items-center mb-8 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className={step === "PHONE_INPUT" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"}>
              <span className="hidden sm:inline">1. </span>Phone
            </span>
            <div className="h-px bg-slate-200 dark:bg-white/5 flex-grow mx-1 sm:mx-2" />
            <span className={step === "OTP_INPUT" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"}>
              <span className="hidden sm:inline">2. </span>SMS
            </span>
            <div className="h-px bg-slate-200 dark:bg-white/5 flex-grow mx-1 sm:mx-2" />
            <span className={step === "ACCOUNT_DETAILS" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"}>
              <span className="hidden sm:inline">3. </span>Details
            </span>
            <div className="h-px bg-slate-200 dark:bg-white/5 flex-grow mx-1 sm:mx-2" />
            <span className={step === "EMAIL_OTP_INPUT" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"}>
              <span className="hidden sm:inline">4. </span>Email
            </span>
          </div>
        )}

        {/* Global Error/Success Notification */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-750 dark:text-indigo-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Phone input */}
        {step === "PHONE_INPUT" && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Claim your NumID</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter your phone number to begin. We'll send an SMS code to verify ownership.</p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Phone Number</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Smartphone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  placeholder="+15154146054"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1.5 leading-relaxed">
                Include country code (e.g., +1 for USA). Rate limit: 5 requests per hour.
              </span>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center space-x-2 group"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Send Verification OTP</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="bg-slate-105 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-xl p-3.5 text-[11px] text-slate-600 dark:text-slate-400 transition-colors">
              <span className="font-bold text-indigo-650 dark:text-indigo-400">💡 Local Sandbox Tip:</span> If Twilio keys are not set, a mock code will print to the server log. Alternatively, use standard test code <code className="font-mono text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">123456</code> to verify instantly.
            </div>
          </form>
        )}

        {/* STEP 2: SMS OTP code input */}
        {step === "OTP_INPUT" && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs font-semibold mb-2" onClick={() => setStep("PHONE_INPUT")}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change phone number</span>
            </div>
            
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify your phone</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">We've sent a 6-digit code to <span className="text-slate-900 dark:text-white font-mono">{phone}</span>.</p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Enter Code</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono tracking-widest text-center text-lg font-bold"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Verify OTP Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex justify-between items-center text-xs text-slate-550 dark:text-slate-400 pt-2">
              <span>Didn't receive code?</span>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendTimer > 0 || isPending}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold disabled:text-slate-400 dark:disabled:text-slate-655 transition-colors"
              >
                {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Email / password details */}
        {step === "ACCOUNT_DETAILS" && (
          <form onSubmit={handleRequestEmailOTP} className="space-y-6">
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Create your account</h2>
              <p className="text-xs text-slate-505 dark:text-slate-400">Your public NumID will be <span className="text-indigo-650 dark:text-indigo-400 font-mono font-bold">{phone.replace("+", "")}@numid.us</span>. Enter details to finish signup.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Destination Email</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-relaxed">
                  Incoming mail to your NumID will be forwarded here.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-505 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Verify Email Address</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Email OTP verification code input */}
        {step === "EMAIL_OTP_INPUT" && (
          <form onSubmit={handleVerifyEmailAndSignup} className="space-y-6">
            <div className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs font-semibold mb-2" onClick={() => setStep("ACCOUNT_DETAILS")}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email / password</span>
            </div>
            
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify your email</h2>
              <p className="text-xs text-slate-505 dark:text-slate-400">We've sent a 6-digit verification code to <span className="text-slate-900 dark:text-white font-mono">{email}</span>.</p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Enter Code</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono tracking-widest text-center text-lg font-bold"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Verify Email & Signup</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              <span>Didn't receive code?</span>
              <button
                type="button"
                onClick={handleResendEmailOTP}
                disabled={resendTimer > 0 || isPending}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors"
              >
                {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : "Resend Code"}
              </button>
            </div>
            
            <div className="bg-slate-105 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-xl p-3.5 text-[11px] text-slate-655 dark:text-slate-400 transition-colors">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">💡 Local Sandbox Tip:</span> If Twilio keys are not set, check the server log for the code. Alternatively, use standard test code <code className="font-mono text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">123456</code> to verify instantly.
            </div>
          </form>
        )}

        {/* STEP 5: Email pending / fallback error instruction screen */}
        {step === "EMAIL_PENDING" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400 animate-bounce">
              <Mail className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Created!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We've verified your details, but we couldn't automatically log you in. Please sign in to access your dashboard.
              </p>
            </div>

            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="w-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-semibold py-3 rounded-xl transition-all text-sm shadow"
            >
              Access Dashboard / Sign In
            </button>
          </div>
        )}

      </div>
      
      {/* Footer support */}
      <div className="mt-8 text-xs text-slate-500 text-center">
        Already have an account? <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold transition-colors">Sign In</Link>
      </div>

    </div>
  );
}

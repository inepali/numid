"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  sendPasswordResetOTPAction, 
  resetPasswordWithOTPAction 
} from "@/app/actions/auth";
import ThemeToggle from "@/app/components/ThemeToggle";
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Smartphone, 
  Loader2, 
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  LockKeyhole
} from "lucide-react";

type ResetStep = "REQUEST_OTP" | "RESET_PASSWORD" | "SUCCESS";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>("REQUEST_OTP");
  const [isPending, startTransition] = useTransition();

  // Form states
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

    if (!phoneOrEmail || phoneOrEmail.trim().length === 0) {
      setErrorMsg("Please enter your phone number or email address");
      return;
    }

    startTransition(async () => {
      const res = await sendPasswordResetOTPAction(phoneOrEmail);
      if (res.success) {
        setStep("RESET_PASSWORD");
        setResendTimer(60);
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!otp || otp.length < 4) {
      setErrorMsg("Please enter the verification code");
      return;
    }

    if (!newPassword) {
      setErrorMsg("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters");
      return;
    }

    startTransition(async () => {
      const res = await resetPasswordWithOTPAction(phoneOrEmail, otp, newPassword);
      if (res.success) {
        setStep("SUCCESS");
        setSuccessMsg(res.message);
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
      const res = await sendPasswordResetOTPAction(phoneOrEmail);
      if (res.success) {
        setResendTimer(60);
        setSuccessMsg("SMS verification code resent successfully.");
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
        <img src="/logo.png" alt="NumID Logo" className="w-8 h-8 object-contain rounded-lg" />
        <span className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
          Num<span className="text-indigo-650 dark:text-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300">ID</span>
        </span>
      </Link>

      {/* Reset Container Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-955/60 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl dark:shadow-none relative transition-colors duration-300">
        
        {/* Step Indicator */}
        {step !== "SUCCESS" && (
          <div className="flex justify-between items-center mb-8 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-505">
            <span className={step === "REQUEST_OTP" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"}>
              1. Find Account & Code
            </span>
            <div className="h-px bg-slate-200 dark:bg-white/5 flex-grow mx-2" />
            <span className={step === "RESET_PASSWORD" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"}>
              2. Verify & Reset
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

        {successMsg && step !== "SUCCESS" && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-750 dark:text-indigo-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Phone / Email input */}
        {step === "REQUEST_OTP" && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Forgot Password?</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter your NumID Email, Phone, or personal destination email. We'll send an SMS code to your registered phone number to verify you.</p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Account Phone or Email</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 dark:text-slate-505 pointer-events-none">
                  <Smartphone className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="your-phone@numid.us or +1515..."
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-505 active:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center space-x-2 group"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Send Reset OTP Code</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="bg-slate-105 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-xl p-3.5 text-[11px] text-slate-600 dark:text-slate-400 transition-colors">
              <span className="font-bold text-indigo-650 dark:text-indigo-400 font-sans">💡 Local Sandbox Tip:</span> In mock mode, check the server log for the SMS code, or use standard test code <code className="font-mono text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-sans font-bold">123456</code> to verify instantly.
            </div>
          </form>
        )}

        {/* STEP 2: SMS OTP code and New Password input */}
        {step === "RESET_PASSWORD" && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs font-semibold mb-2" onClick={() => setStep("REQUEST_OTP")}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change account details</span>
            </div>
            
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h2>
              <p className="text-xs text-slate-505 dark:text-slate-400">Verify your identity by entering the SMS code sent to your phone, and choose a new password.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Verification OTP Code</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-505 pointer-events-none">
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

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">New Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-505 pointer-events-none">
                    <LockKeyhole className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-505 active:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Reset & Update Password</span>
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

        {/* STEP 3: Success state */}
        {step === "SUCCESS" && (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-650 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Updated!</h2>
              <p className="text-xs text-slate-550 dark:text-slate-400">
                Your password has been successfully reset. You can now log in using your new password.
              </p>
            </div>

            <button
              onClick={() => { router.push("/dashboard"); }}
              className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-lg shadow-indigo-600/10"
            >
              Go to Sign In
            </button>
          </div>
        )}

      </div>
      
      {/* Footer support */}
      <div className="mt-8 text-xs text-slate-500 text-center">
        Remembered your password? <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-505 dark:hover:text-indigo-300 font-semibold transition-colors">Sign In</Link>
      </div>

    </div>
  );
}

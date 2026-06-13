"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  sendPhoneOTPAction, 
  verifyPhoneOTPAction, 
  signUpAction 
} from "@/app/actions/auth";
import { 
  Phone, 
  Lock, 
  Mail, 
  ArrowRight, 
  Smartphone, 
  ShieldCheck, 
  Loader2, 
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from "lucide-react";

type SetupStep = "PHONE_INPUT" | "OTP_INPUT" | "ACCOUNT_DETAILS" | "EMAIL_PENDING";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("PHONE_INPUT");
  const [isPending, startTransition] = useTransition();

  // Form states
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  const handleSignup = (e: React.FormEvent) => {
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

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    startTransition(async () => {
      const res = await signUpAction(formData);
      if (res.success) {
        setStep("EMAIL_PENDING");
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
    <div className="relative min-h-screen bg-black text-slate-100 flex flex-col justify-center items-center px-6 py-12 overflow-hidden font-sans">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-950/15 blur-[120px] pointer-events-none" />

      {/* Header logo */}
      <Link href="/" className="flex items-center space-x-2 mb-8 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center">
          <span className="font-display font-extrabold text-white text-base">N</span>
        </div>
        <span className="font-display font-extrabold text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors">
          Num<span className="text-indigo-400 group-hover:text-indigo-300">ID</span>
        </span>
      </Link>

      {/* Signup Container Card */}
      <div className="w-full max-w-md bg-slate-950/60 border border-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative">
        
        {/* Step Indicator */}
        {step !== "EMAIL_PENDING" && (
          <div className="flex justify-between items-center mb-8 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span className={step === "PHONE_INPUT" ? "text-indigo-400 font-bold" : "text-slate-400"}>1. Phone</span>
            <div className="h-px bg-white/5 flex-grow mx-4" />
            <span className={step === "OTP_INPUT" ? "text-indigo-400 font-bold" : "text-slate-400"}>2. SMS Code</span>
            <div className="h-px bg-white/5 flex-grow mx-4" />
            <span className={step === "ACCOUNT_DETAILS" ? "text-indigo-400 font-bold" : "text-slate-400"}>3. Account</span>
          </div>
        )}

        {/* Global Error/Success Notification */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Phone input */}
        {step === "PHONE_INPUT" && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-white mb-2">Claim your NumID</h2>
              <p className="text-xs text-slate-400">Enter your phone number to begin. We'll send an SMS code to verify ownership.</p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">Phone Number</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-500 pointer-events-none">
                  <Smartphone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  placeholder="+15154146054"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
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

            <div className="bg-slate-900/30 border border-white/5 rounded-xl p-3.5 text-[11px] text-slate-400">
              <span className="font-bold text-indigo-400">💡 Local Sandbox Tip:</span> If Twilio keys are not set, a mock code will print to the server log. Alternatively, use standard test code <code className="font-mono text-white bg-slate-800 px-1 py-0.5 rounded">123456</code> to verify instantly.
            </div>
          </form>
        )}

        {/* STEP 2: SMS OTP code input */}
        {step === "OTP_INPUT" && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="flex items-center space-x-2 text-slate-500 hover:text-white transition-colors cursor-pointer text-xs font-semibold mb-2" onClick={() => setStep("PHONE_INPUT")}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change phone number</span>
            </div>
            
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-white mb-2">Verify your phone</h2>
              <p className="text-xs text-slate-400">We've sent a 6-digit code to <span className="text-white font-mono">{phone}</span>.</p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">Enter Code</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-500 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono tracking-widest text-center text-lg"
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

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
              <span>Didn't receive code?</span>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendTimer > 0 || isPending}
                className="text-indigo-400 hover:text-indigo-300 font-semibold disabled:text-slate-600 transition-colors"
              >
                {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Email / password details */}
        {step === "ACCOUNT_DETAILS" && (
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-white mb-2">Create your account</h2>
              <p className="text-xs text-slate-400">Your public NumID will be <span className="text-indigo-400 font-mono font-bold">{phone.replace("+", "")}@numid.us</span>. Enter details to finish signup.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">Destination Email</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-500 pointer-events-none">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-relaxed">
                  Incoming mail to your NumID will be forwarded here.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-500 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
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
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Email pending confirmation instruction screen */}
        {step === "EMAIL_PENDING" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-400 animate-bounce">
              <Mail className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-xs text-slate-400">
                We've sent a verification link to <span className="text-white font-medium">{email}</span>. Please click the link to confirm ownership and activate your dashboard.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 text-left text-xs text-slate-400 space-y-2">
              <span className="font-bold text-indigo-400 block">⚠️ Crucial Activation Step:</span>
              <p>Since Cloudflare routes emails to this address, Cloudflare also sends an independent verification link. Check your inbox for both messages to enable forwarding.</p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              Access Dashboard
            </button>
          </div>
        )}

      </div>
      
      {/* Footer support */}
      <div className="mt-8 text-xs text-slate-500">
        Already have an account? <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign In</Link>
      </div>

    </div>
  );
}

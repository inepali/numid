"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  sendPhoneOTPAction, 
  verifyPhoneOTPAction, 
  signUpAction,
  logSignInAction
} from "@/app/actions/auth";
import { verifyInvitationAction } from "@/app/actions/invitations";
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

type SetupStep = "INVITE_INPUT" | "REGISTRATION" | "EMAIL_PENDING";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-supabase.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("REGISTRATION");
  const [isPending, startTransition] = useTransition();

  // Form states
  const [inviteId, setInviteId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Error/Success state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Field-level error states
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Check URL query parameters for invite code on mount (referral check)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      setInviteId(code);
    }
    setStep("REGISTRATION");
  }, []);


  const handleVerifyInvite = async (code: string) => {
    setInviteLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await verifyInvitationAction(code);
      if (res.success && res.invite) {
        setSuccessMsg("Invitation verified! Please enter your matching details below.");
        setStep("REGISTRATION");
      } else {
        setErrorMsg(res.message || "Invalid or expired invitation.");
        setStep("INVITE_INPUT");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify invitation.");
      setStep("INVITE_INPUT");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleVerifyInviteCodeForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteId.trim()) {
      setErrorMsg("Please enter an invitation code.");
      return;
    }
    handleVerifyInvite(inviteId.trim());
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setPhoneError(null);
    setEmailError(null);
    setPasswordError(null);

    let hasError = false;

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!phone.trim()) {
      setPhoneError("Phone number is required.");
      hasError = true;
    } else if (cleanPhone.length !== 10) {
      setPhoneError("Phone number must be exactly 10 digits.");
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inviteEmail.trim()) {
      setEmailError("Email address is required.");
      hasError = true;
    } else if (!emailRegex.test(inviteEmail.trim())) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const formData = new FormData();
    formData.append("password", password);
    formData.append("inviteId", inviteId);
    formData.append("phone", phone);
    formData.append("email", inviteEmail);

    startTransition(async () => {
      const res = await signUpAction(formData);
      if (res.success) {
        setSuccessMsg("Account created successfully! Logging you in...");
        
        // Auto-login after successful registration using derived NumID email
        let cleanPhone = phone.replace("+", "").replace(/[^0-9]/g, "");
        if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) {
          cleanPhone = cleanPhone.substring(1);
        }
        const derivedEmail = `${cleanPhone}@numid.us`;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: derivedEmail,
          password,
        });

        if (error) {
          console.error("[SignUp Auto-Login Error]:", error);
          setErrorMsg("Account created but auto-login failed. Please sign in below.");
          setStep("EMAIL_PENDING");
        } else {
          // Log auto-login success to audit logs
          await logSignInAction().catch(err => console.error("Failed to log sign-in:", err));
          window.location.href = "/dashboard";
        }
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
        

        {/* Global Error/Success Notification */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span>
              {errorMsg === "Account already exists, please use login instead" ? (
                <>
                  Account already exists, please{" "}
                  <Link href="/?login=true" className="underline font-semibold text-red-800 dark:text-red-200 hover:text-red-950 dark:hover:text-white transition-colors">
                    use login instead
                  </Link>
                </>
              ) : (
                errorMsg
              )}
            </span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-750 dark:text-indigo-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 0: Invite input */}
        {step === "INVITE_INPUT" && (
          <form onSubmit={handleVerifyInviteCodeForm} className="space-y-6">
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Invitation Only</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                NumID is currently invite-only. Enter your invitation code or paste your full invitation link to proceed.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-normal leading-relaxed">
                Don't have an invitation code? Email <a href="mailto:info@numid.dev?subject=CODE" className="text-indigo-650 dark:text-indigo-400 hover:underline font-semibold">info@numid.dev</a> with <strong className="font-mono bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">CODE</strong> in the subject line to request one.
              </p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Invitation Code / Link</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 dark:text-slate-555 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Paste your code or invite link here"
                  value={inviteId}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.includes("invite=")) {
                      const matches = val.match(/invite=([^&]+)/);
                      if (matches && matches[1]) {
                        val = matches[1];
                      }
                    }
                    setInviteId(val);
                  }}
                  className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={inviteLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center space-x-2 group"
            >
              {inviteLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Verify Invitation Code</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 1: Registration form */}
        {step === "REGISTRATION" && (
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Claim your NumID</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Please enter your phone number and destination email address, then set a password.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-550/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 text-xs text-indigo-750 dark:text-indigo-300 leading-relaxed text-left">
              🚀 <strong>Consolidate all your IDs into one</strong> using your phone number, and share securely and uniquely (like <a href="https://www.numid.dev/5154146054" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">numid.dev/5154146054</a>).
            </div>

            <div className="space-y-4">
              {/* Phone Input */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Phone Number or any 10 digit number</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-555 pointer-events-none">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    placeholder="5154146054"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full bg-slate-105 dark:bg-slate-900 border ${phoneError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/5 focus:border-indigo-500/40"} rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono`}
                    required
                  />
                </div>
                {phoneError && (
                  <span className="text-[10px] text-red-550 dark:text-red-400 mt-1 block animate-fadeIn">{phoneError}</span>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Email Address</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-505 pointer-events-none">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className={`w-full bg-slate-105 dark:bg-slate-900 border ${emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/5 focus:border-indigo-500/40"} rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono`}
                    required
                  />
                </div>
                {emailError && (
                  <span className="text-[10px] text-red-550 dark:text-red-400 mt-1 block animate-fadeIn">{emailError}</span>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Create Password</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-555 pointer-events-none">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-slate-105 dark:bg-slate-900 border ${passwordError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/5 focus:border-indigo-500/40"} rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all`}
                    required
                  />
                </div>
                {passwordError && (
                  <span className="text-[10px] text-red-550 dark:text-red-400 mt-1 block animate-fadeIn">{passwordError}</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 mt-4"
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

        {/* STEP 4: Email pending fallback screen */}
        {step === "EMAIL_PENDING" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-650 dark:text-indigo-400 animate-bounce">
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
        Already have an account? <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-505 dark:hover:text-indigo-300 font-semibold transition-colors">Sign In</Link>
      </div>

    </div>
  );
}

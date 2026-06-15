"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  getDashboardData, 
  sendNewEmailOTPAction,
  verifyNewEmailOTPAction, 
  checkCloudflareStatusAction, 
  exportDataAction, 
  deleteAccountAction,
  mockVerifyDestinationEmailAction,
  testCloudflareConnectionAction,
  provisionCloudflareRouteAction,
  updateSocialProfilesAction,
} from "@/app/actions/dashboard";
import { 
  Mail, 
  ShieldAlert, 
  User, 
  LogOut, 
  Settings, 
  RefreshCw, 
  Download, 
  Trash2, 
  Lock, 
  Loader2, 
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  History,
  Sparkles,
  ArrowLeft,
  Smartphone,
  Zap,
  Radio,
  Plus,
  Globe,
  Link2,
  ExternalLink,
  Share2,
} from "lucide-react";
import Link from "next/link";

// Available services schema
type ProfileCategoryKey = "socials" | "messaging" | "professional" | "business";

interface ServiceConfig {
  name: string;
  prefix: string;
  placeholder: string;
}

const PROFILE_CATEGORIES: Record<ProfileCategoryKey, { title: string; services: Record<string, ServiceConfig> }> = {
  socials: {
    title: "Core Socials",
    services: {
      facebook: { name: "Facebook", prefix: "https://facebook.com/", placeholder: "username" },
      instagram: { name: "Instagram", prefix: "https://instagram.com/", placeholder: "username" },
      linkedin: { name: "LinkedIn", prefix: "https://linkedin.com/in/", placeholder: "username" },
      x: { name: "X (Twitter)", prefix: "https://x.com/", placeholder: "username" },
      tiktok: { name: "TikTok", prefix: "https://tiktok.com/@", placeholder: "username" },
      youtube: { name: "YouTube", prefix: "https://youtube.com/@", placeholder: "channel" },
      threads: { name: "Threads", prefix: "https://threads.net/@", placeholder: "username" },
    }
  },
  messaging: {
    title: "Messaging Platforms",
    services: {
      whatsapp: { name: "WhatsApp", prefix: "https://wa.me/", placeholder: "15154146054 (with country code)" },
      telegram: { name: "Telegram", prefix: "https://t.me/", placeholder: "username" },
      signal: { name: "Signal", prefix: "https://signal.me/#p/", placeholder: "username or phone" },
      discord: { name: "Discord", prefix: "", placeholder: "username" },
      messenger: { name: "Messenger", prefix: "https://m.me/", placeholder: "username" },
    }
  },
  professional: {
    title: "Professional & Creator",
    services: {
      github: { name: "GitHub", prefix: "https://github.com/", placeholder: "username" },
      gitlab: { name: "GitLab", prefix: "https://gitlab.com/", placeholder: "username" },
      behance: { name: "Behance", prefix: "https://behance.net/", placeholder: "username" },
      dribbble: { name: "Dribbble", prefix: "https://dribbble.com/", placeholder: "username" },
      medium: { name: "Medium", prefix: "https://medium.com/@", placeholder: "username" },
      substack: { name: "Substack", prefix: "https://", placeholder: "username.substack.com" },
    }
  },
  business: {
    title: "Business & Contact",
    services: {
      personal_website: { name: "Personal Website", prefix: "", placeholder: "https://yourwebsite.com" },
      company_website: { name: "Company Website", prefix: "", placeholder: "https://company.com" },
      contact_form: { name: "Contact Form", prefix: "", placeholder: "https://yourwebsite.com/contact" },
      phone: { name: "Phone Call Link", prefix: "tel:", placeholder: "+15154146054" },
      sms: { name: "SMS Link", prefix: "sms:", placeholder: "+15154146054" },
      email: { name: "Email Link", prefix: "mailto:", placeholder: "your@email.com" },
      calendly: { name: "Calendly Link", prefix: "https://calendly.com/", placeholder: "username" },
      google_business: { name: "Google Business Profile", prefix: "", placeholder: "https://g.page/r/your-id" },
      online_store: { name: "Online Store Link", prefix: "", placeholder: "https://shop.yourbrand.com" },
    }
  }
};

// Instantiate client-side Supabase client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-supabase.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  // Social Profile States
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileCategoryKey>("socials");

  // Dialog & Form States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailModalPhase, setEmailModalPhase] = useState<"ENTER_EMAIL" | "ENTER_CODE">("ENTER_EMAIL");
  const [newEmailOtp, setNewEmailOtp] = useState("");

  useEffect(() => {
    if (!showEmailModal) {
      setEmailModalPhase("ENTER_EMAIL");
      setNewEmailOtp("");
    }
  }, [showEmailModal]);
  
  // Notification states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Login form states (for unauthenticated fallback)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Cloudflare Dev Console state
  const [cfLoading, setCfLoading] = useState(false);
  const [cfResult, setCfResult] = useState<{ success: boolean; message: string; detail?: Record<string, string> } | null>(null);

  const handleTestCloudflare = async () => {
    setCfLoading(true);
    setCfResult(null);
    const res = await testCloudflareConnectionAction();
    setCfResult(res as any);
    setCfLoading(false);
  };

  const handleProvisionCloudflare = async () => {
    setCfLoading(true);
    setCfResult(null);
    const res = await provisionCloudflareRouteAction();
    setCfResult(res as any);
    setCfLoading(false);
    if (res.success) await loadData();
  };

  // Check auth and fetch dashboard data on load
  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    const res = await getDashboardData();
    if (res.success) {
      setProfile(res.profile);
      setSocialLinks(res.profile?.social_profiles || {});
      setAuditLogs(res.auditLogs || []);
      if (res.message) {
        setSuccessMsg(res.message);
      }
      if (res.error) {
        setErrorMsg(res.error);
      }
    } else {
      setErrorMsg(res.message || "Failed to load dashboard statistics");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
      } else {
        await loadData();
      }
    } catch (err: any) {
      console.error("[Dashboard Login] Unexpected error:", err);
      setLoginError(err?.message || "Network error — please check your connection and try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setProfile(null);
    router.push("/");
  };

  const handleSendEmailOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newEmail) return;

    startTransition(async () => {
      const res = await sendNewEmailOTPAction(newEmail);
      if (res.success) {
        setSuccessMsg(res.message);
        setEmailModalPhase("ENTER_CODE");
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleVerifyEmailOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newEmail || !newEmailOtp) return;

    startTransition(async () => {
      const res = await verifyNewEmailOTPAction(newEmail, newEmailOtp);
      if (res.success) {
        setSuccessMsg(res.message);
        setShowEmailModal(false);
        await loadData();
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleCheckCloudflare = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await checkCloudflareStatusAction();
      if (res.success) {
        setSuccessMsg(res.message);
        await loadData();
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleMockVerify = () => {
    if (!profile) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await mockVerifyDestinationEmailAction(profile.destination_email);
      if (res.success) {
        setSuccessMsg(res.message + " Now click 'Check Cloudflare Status' to activate.");
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleSaveSocialLinks = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateSocialProfilesAction(socialLinks);
      if (res.success) {
        setSuccessMsg(res.message);
        await loadData();
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleExportData = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await exportDataAction();
      if (res.success && res.data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(res.data);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `numid-export-${profile.phone_number}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setSuccessMsg("Account data exported successfully.");
      } else {
        setErrorMsg(res.message || "Failed to export data");
      }
    });
  };

  const handleDeleteAccount = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await deleteAccountAction();
      if (res.success) {
        router.push("/");
      } else {
        setErrorMsg(res.message);
        setShowDeleteModal(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center text-slate-400">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs">Securing database connection...</p>
      </div>
    );
  }

  // FALLBACK: Sign In Screen
  if (isAuthenticated === false) {
    return (
      <div className="relative min-h-screen bg-black text-slate-100 flex flex-col justify-center items-center px-6 py-12 overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-950/10 blur-[120px] pointer-events-none" />

        <Link href="/" className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center">
            <span className="font-display font-extrabold text-white text-base">N</span>
          </div>
          <span className="font-display font-extrabold text-white text-lg tracking-tight">
            Num<span className="text-indigo-400">ID</span>
          </span>
        </Link>

        <div className="w-full max-w-md bg-slate-950/60 border border-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          <div className="text-left mb-6">
            <h2 className="font-display text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-xs text-slate-400">Sign in to manage your NumID email routing rules.</p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">Email Address</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wide">Password</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 mt-6 shadow-lg shadow-indigo-600/10"
            >
              {loginLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have a NumID? <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign Up</Link>
          </div>
        </div>
      </div>
    );
  }

  // MAIN: Dashboard View
  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans">
      
      {/* Header bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center">
              <span className="font-display font-extrabold text-white text-base">N</span>
            </Link>
            <span className="font-display font-extrabold text-white text-lg tracking-tight">
              Num<span className="text-indigo-400">ID</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </Link>
            )}

            <div className="hidden sm:flex items-center space-x-2 text-slate-400 text-xs font-semibold bg-slate-900 border border-white/5 rounded-full px-3.5 py-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{profile?.destination_email}</span>
            </div>

            <button 
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        
        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2.5">
            <ShieldAlert className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-200">Execution Error</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start space-x-2.5">
            <CheckCircle className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-grow">
              <p className="font-bold text-indigo-200">Status Update</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* 1. Main Configuration Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Forwarding Status Card (Left block) */}
          <div className="md:col-span-2 p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-950 border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-indigo-600/5 blur-[50px] pointer-events-none" />

            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">My NumID</span>
                  <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white font-mono mt-1 select-all hover:text-indigo-300 transition-colors">
                    {profile?.numid_address?.replace("+", "")}
                  </h2>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide ${(profile?.phone_verified && profile?.email_verified) || profile?.status === "active" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-orange-500/20 text-orange-300 border border-orange-500/30"}`}>
                  {(profile?.phone_verified && profile?.email_verified) || profile?.status === "active" ? "VERIFIED" : (profile?.status?.toUpperCase() || "PENDING")}
                </span>
              </div>

              {/* Status details row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6 mt-6">
                <div className="flex items-center space-x-3 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.phone_verified ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Verified Phone</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-white font-medium">{profile?.phone_number}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${profile?.phone_verified ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                        {profile?.phone_verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.email_verified ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Destination Email</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-white font-medium truncate max-w-[150px]">{profile?.destination_email}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${profile?.email_verified ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                        {profile?.email_verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions panel */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 border-t border-white/5 pt-6 w-full sm:w-auto">
              <button
                onClick={() => {
                  setNewEmail(profile?.destination_email || "");
                  setShowEmailModal(true);
                }}
                disabled={isPending}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center"
              >
                Change Destination
              </button>
              
              {profile?.status === "pending" && (
                <button
                  onClick={handleCheckCloudflare}
                  disabled={isPending}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Check Cloudflare Status</span>
                </button>
              )}
            </div>

          </div>

          {/* Verification Indicators Panel (Right block) */}
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-950 border border-white/5 flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="font-display font-bold text-white text-lg mb-4">Verification Checklists</h3>
              <p className="text-xs text-slate-500 mb-6">Both verification checkmarks must be green to activate email forwarding routes.</p>
              
              <div className="space-y-4">
                
                {/* Phone Item */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-300">Phone Verified</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${profile?.phone_verified ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                    {profile?.phone_verified ? "Verified" : "Pending"}
                  </span>
                </div>

                {/* Email Item */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-300">Email Verified</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${profile?.email_verified ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                    {profile?.email_verified ? "Verified" : "Pending"}
                  </span>
                </div>

              </div>
            </div>

            {/* Created date information */}
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-6 pt-4 border-t border-white/5">
              Created at: {profile ? new Date(profile.created_at).toLocaleDateString() : ""}
            </div>
          </div>

        </div>

        {/* Public Identity Profile Card */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-950 border border-white/5 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400">
                <Share2 className="w-5 h-5" />
                <h3 className="font-display font-bold text-white text-lg">Public Identity Profile</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure your social networks and contact links. Your profile is live at{" "}
                <Link
                  href={`/${profile?.phone_number?.replace("+", "")}`}
                  target="_blank"
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline inline-flex items-center gap-1"
                >
                  <span>numid.dev/{profile?.phone_number?.replace("+", "")}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </p>
            </div>
            
            <button
              onClick={handleSaveSocialLinks}
              disabled={isPending}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Profile Links</span>
            </button>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap border-b border-white/5 gap-1">
            {(Object.keys(PROFILE_CATEGORIES) as ProfileCategoryKey[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveProfileTab(tabKey)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 -mb-px ${
                  activeProfileTab === tabKey
                    ? "border-indigo-500 text-white bg-slate-900/50"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {PROFILE_CATEGORIES[tabKey].title}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold">
                Active {PROFILE_CATEGORIES[activeProfileTab].title} links:
              </span>
              
              {/* Dropdown to add new key */}
              {Object.keys(PROFILE_CATEGORIES[activeProfileTab].services).some(
                (key) => socialLinks[key] === undefined
              ) ? (
                <div className="relative inline-block text-left">
                  <select
                    onChange={(e) => {
                      const selectedKey = e.target.value;
                      if (selectedKey) {
                        setSocialLinks((prev) => ({ ...prev, [selectedKey]: "" }));
                        e.target.value = ""; // reset dropdown selection
                      }
                    }}
                    defaultValue=""
                    className="bg-slate-900 border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/40 cursor-pointer"
                  >
                    <option value="" disabled>+ Add Link / Profile...</option>
                    {Object.entries(PROFILE_CATEGORIES[activeProfileTab].services)
                      .filter(([key]) => socialLinks[key] === undefined)
                      .map(([key, service]) => (
                        <option key={key} value={key}>
                          {service.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                  All active links added
                </span>
              )}
            </div>

            {/* Configured fields list */}
            {Object.keys(PROFILE_CATEGORIES[activeProfileTab].services).filter(
              (key) => socialLinks[key] !== undefined
            ).length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-slate-900/10 border border-dashed border-white/5 text-xs text-slate-500">
                No links added in this category yet. Select a service above to add it.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(PROFILE_CATEGORIES[activeProfileTab].services)
                  .filter(([key]) => socialLinks[key] !== undefined)
                  .map(([key, service]) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-white/5 text-xs focus-within:border-indigo-500/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0">
                        {service.name.substring(0, 2)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                          {service.name}
                        </label>
                        <div className="flex items-center">
                          {service.prefix && (
                            <span className="text-slate-500 select-none pr-1.5 font-mono text-[11px] max-w-[120px] sm:max-w-none truncate shrink-0">
                              {service.prefix.replace("https://", "")}
                            </span>
                          )}
                          <input
                            type="text"
                            placeholder={service.placeholder}
                            value={socialLinks[key]}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setSocialLinks((prev) => ({ ...prev, [key]: newVal }));
                            }}
                            className="bg-transparent border-none p-0 text-white placeholder-slate-600 focus:outline-none focus:ring-0 flex-1 min-w-0 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSocialLinks((prev) => {
                            const updated = { ...prev };
                            delete updated[key];
                            return updated;
                          });
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all shrink-0"
                        title="Remove Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Sandbox Testing Console (Visible if in Mock Mode) */}
        {process.env.NEXT_PUBLIC_MOCK_APIS === "true" && (
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-indigo-950/20 border border-indigo-500/20 shadow-lg relative">
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <h3 className="font-display font-bold text-white text-md">Mock Sandbox Console</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">You are running the application in <strong>Mock Mode</strong>. Click below to simulate user clicking Cloudflare's email verification link.</p>
            
            <button
              onClick={handleMockVerify}
              disabled={isPending}
              className="w-full sm:w-auto bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simulate Cloudflare Email Link Verification Click</span>
            </button>
          </div>
        )}

        {/* 2b. Cloudflare Dev Console — always visible for testing */}
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-orange-500/20 shadow-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-400" />
              <h3 className="font-display font-bold text-white text-sm">Cloudflare Email Routing Dev Console</h3>
            </div>
            <span className="w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
              {process.env.NEXT_PUBLIC_MOCK_APIS === "true" ? "Mock Mode" : "Live"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Use these controls to validate your Cloudflare credentials and manually trigger email routing provisioning for your account.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              id="cf-test-btn"
              onClick={handleTestCloudflare}
              disabled={cfLoading}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              {cfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-orange-400" />}
              <span>Test Cloudflare Connection</span>
            </button>

            <button
              id="cf-provision-btn"
              onClick={handleProvisionCloudflare}
              disabled={cfLoading}
              className="w-full sm:w-auto bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-orange-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              {cfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Provision My Route Now</span>
            </button>
          </div>

          {cfResult && (
            <div className={`rounded-xl p-4 border text-xs space-y-2 ${
              cfResult.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}>
              <p className="font-semibold">{cfResult.message}</p>
              {cfResult.detail && (
                <pre className="text-[10px] font-mono text-slate-400 bg-black/20 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(cfResult.detail, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* 3. History Logs Timeline */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-950 border border-white/5 shadow-xl">
          <div className="flex items-center space-x-2.5 mb-6">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="font-display font-bold text-white text-lg">Audit Trails</h3>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No recent audit trail logs available.
            </div>
          ) : (
            <div className="relative border-l border-white/5 ml-3 pl-4 space-y-6">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative text-left">
                  {/* Timeline point */}
                  <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300 uppercase tracking-wider">{log.action.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 sm:mt-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="mt-2 p-3 rounded-lg bg-slate-900/50 border border-white/5 text-[10px] font-mono text-slate-500 overflow-x-auto max-w-full">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Settings & Account deletion panel (Danger Zone) */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-950 border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-6 shadow-xl">
          <div>
            <h3 className="font-display font-bold text-white text-md">Danger & Support Zone</h3>
            <p className="text-xs text-slate-500 mt-1">Export your configurations or delete the account mapping permanently.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportData}
              disabled={isPending}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Account JSON</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-4 py-2.5 rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

      </main>

      {/* DIALOG 1: Update email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-scaleIn">
            <h3 className="font-display font-bold text-white text-lg mb-2">Update Destination Email</h3>
            
            {emailModalPhase === "ENTER_EMAIL" ? (
              <form onSubmit={handleSendEmailOTP} className="space-y-4">
                <p className="text-xs text-slate-400">Enter your new forwarding address. We will send a verification code to this inbox.</p>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-wide">New Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[10px] text-orange-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>Warning: Forwarding will temporarily pause until both NumID is verified and Cloudflare's own routing email link is approved.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                  >
                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Send Verification Code</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                <div className="flex items-center space-x-1 text-slate-500 hover:text-white transition-colors cursor-pointer text-[10px] font-semibold" onClick={() => setEmailModalPhase("ENTER_EMAIL")}>
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change email address</span>
                </div>
                
                <p className="text-xs text-slate-400">We've sent a 6-digit verification code to <span className="text-white font-semibold">{newEmail}</span>.</p>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-wide">Enter Code</label>
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={newEmailOtp}
                    onChange={(e) => setNewEmailOtp(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-white focus:outline-none tracking-widest text-center text-lg font-mono"
                    required
                  />
                </div>

                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3 text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-400">💡 Local Sandbox Tip:</span> Check server logs for the OTP or enter <code className="font-mono text-white bg-slate-800 px-1 py-0.5 rounded">123456</code>.
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                  >
                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Verify & Update</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DIALOG 2: Confirm deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-red-500/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-2 text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="font-display font-bold text-white text-lg">Teardown Mapping Permanently?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              This action is irreversible. All of your forwards to <strong className="text-white font-mono">{profile?.numid_address}</strong> will fail immediately, and your settings will be purged.
            </p>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Keep Account
              </button>
              
              <button
                onClick={handleDeleteAccount}
                disabled={isPending}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
              >
                {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Teardown & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import ThemeToggle from "@/app/components/ThemeToggle";
import { 
  Phone, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  Check, 
  ChevronDown, 
  Lock,
  Sparkles,
  Smartphone,
  CheckCircle2,
  LockKeyhole,
  X,
  Menu,
  Loader2,
  AlertCircle
} from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login modal state
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const openLogin = () => {
    setLoginOpen(true);
    setLoginError(null);
    setLoginSuccess(false);
    setLoginEmail("");
    setLoginPassword("");
  };

  const closeLogin = () => {
    setLoginOpen(false);
    setLoginError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }
    setIsPending(true);
    try {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        setLoginError(error.message || "Invalid email or password.");
      } else {
        setLoginSuccess(true);
        setTimeout(() => { window.location.href = "/dashboard"; }, 800);
      }
    } catch (err: any) {
      console.error("[Login] Unexpected error:", err);
      setLoginError(err?.message || "Network error — please check your connection and try again.");
    } finally {
      setIsPending(false);
    }
  };

  // Run the visualizer animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeLogin(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How does NumID work?",
      a: "NumID links your phone number to a custom routing email address at our domain (e.g., [your-phone]@numid.us). We use Cloudflare Email Routing to forward all incoming emails to your private destination email. You can change your private destination email at any time from your dashboard without changing your public NumID address."
    },
    {
      q: "Why use my phone number as an email?",
      a: "It is incredibly easy to remember and communicate. When giving out your email address verbally, over the phone, or at checkout counters, stating your phone number is fast and less error-prone. It also hides your private inbox address from public lists."
    },
    {
      q: "Is my destination email address hidden?",
      a: "Yes. Senders only see your public NumID address (e.g., 5154146054@numid.us). The forwarding happens securely in the background at the Cloudflare DNS level. Senders never learn your actual Gmail, Outlook, or Yahoo address."
    },
    {
      q: "Can I reply to emails using my NumID?",
      a: "Currently, NumID is optimized for forwarding (receiving emails). In our Premium Plan (coming soon), we will support reply masking, allowing you to send or reply to messages directly from your phone number alias."
    },
    {
      q: "How do you verify my phone number?",
      a: "We use the Twilio Verify API to send a secure One-Time Passcode (OTP) via SMS. Your phone number must be verified before your NumID is registered, preventing unauthorized signups."
    }
  ];

  return (
    <div className="relative min-h-screen text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-black transition-colors duration-300 overflow-hidden font-sans">
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 dark:bg-violet-900/20 blur-[120px] pointer-events-none animate-pulse-slow" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/5 bg-white/60 dark:bg-black/50 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-display font-extrabold text-white text-lg tracking-wider">N</span>
            </div>
            <span className="font-display font-extrabold text-slate-900 dark:text-white text-xl tracking-tight">
              Num<span className="text-indigo-400">ID</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#visualizer" className="hover:text-slate-900 dark:hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            <button
              id="nav-sign-in-btn"
              onClick={openLogin}
              className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2"
            >
              Sign In
            </button>
            <Link 
              href="/signup" 
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 sm:px-4 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
            {/* Hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="block md:hidden p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all ml-1"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden bg-white/95 dark:bg-black/95 text-slate-900 dark:text-white backdrop-blur-lg flex flex-col p-6 animate-fadeIn transition-colors duration-300">
          {/* Close & Header */}
          <div className="flex items-center justify-between h-16 border-b border-slate-200 dark:border-white/5 mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="font-display font-extrabold text-white text-sm">N</span>
              </div>
              <span className="font-display font-extrabold text-slate-900 dark:text-white text-md tracking-tight">
                Num<span className="text-indigo-400">ID</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links */}
          <nav className="flex flex-col space-y-6 text-lg font-medium text-slate-800 dark:text-slate-300">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-950 dark:hover:text-white transition-colors py-2 border-b border-slate-100 dark:border-white/5"
            >
              Features
            </a>
            <a 
              href="#visualizer" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-950 dark:hover:text-white transition-colors py-2 border-b border-slate-100 dark:border-white/5"
            >
              How it Works
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-950 dark:hover:text-white transition-colors py-2 border-b border-slate-100 dark:border-white/5"
            >
              Pricing
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-slate-950 dark:hover:text-white transition-colors py-2 border-b border-slate-100 dark:border-white/5"
            >
              FAQ
            </a>
          </nav>

          {/* CTAs */}
          <div className="mt-auto flex flex-col gap-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openLogin();
              }}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold py-3.5 rounded-xl transition-all text-center text-sm"
            >
              Sign In
            </button>
            <Link 
              href="/signup" 
              onClick={() => setMobileMenuOpen(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all text-center text-sm shadow-lg shadow-indigo-600/10"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 sm:pb-16 text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-indigo-650 dark:text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Special: Permanent free email routing</span>
        </div>
        
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 max-w-4xl mx-auto leading-tight">
          Your Phone Number. <br />
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-400 to-violet-650 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
            Your Permanent Email.
          </span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Never change your public email address again. Forward emails sent to your phone number at <span className="text-slate-900 dark:text-white font-medium">numid.us</span> to any destination. Fast, private, and memorable.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 sm:mb-20">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/10 flex items-center justify-center space-x-2 group hover:-translate-y-0.5"
          >
            <span>Claim Your NumID Now</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a 
            href="#features" 
            className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-white/5 font-semibold px-8 py-4 rounded-2xl transition-all flex items-center justify-center"
          >
            Learn More
          </a>
        </div>

        {/* Animated Visualizer Mockup */}
        <div id="visualizer" className="max-w-4xl mx-auto border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950/60 backdrop-blur p-5 sm:p-6 md:p-8 shadow-2xl relative transition-colors duration-300">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full px-4 py-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Interactive Forwarding Simulator</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-4 mt-4">
            
            {/* Sender / Outgoing */}
            <div className={`p-5 rounded-2xl border transition-all duration-500 text-left ${
              animationStep === 0 
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/30 ring-1 ring-indigo-300/20 dark:ring-indigo-500/20" 
                : "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-white/5"
            }`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-550 dark:text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs text-slate-500">Sender Inbox</h4>
                  <p className="text-xs text-slate-800 dark:text-slate-300 font-medium">customer@example.com</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded flex items-center px-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono overflow-x-auto whitespace-nowrap">
                  To: 5154146054@numid.us
                </div>
                <div className="h-10 bg-slate-200/30 dark:bg-slate-800/30 rounded p-2 text-[10px] text-slate-500">
                  Hi, here is the signed agreement...
                </div>
              </div>
            </div>

            {/* Cloudflare Routing Hub */}
            <div className="flex flex-col items-center justify-center py-2 md:py-4">
              {/* Connecting vertical line (Sender -> CF) visible only on mobile */}
              <div className="w-1 h-8 bg-slate-200 dark:bg-slate-800/50 rounded mb-2 relative overflow-hidden md:hidden">
                <div 
                  className="absolute left-0 right-0 bg-indigo-500 rounded transition-all duration-1000"
                  style={{
                    top: animationStep === 0 ? "0%" : animationStep === 1 ? "50%" : "100%",
                    height: animationStep === 1 ? "50%" : animationStep === 0 ? "0%" : "100%"
                  }}
                />
              </div>

              <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-md">
                <div className={`absolute inset-0 rounded-2xl bg-indigo-500/10 blur transition-opacity duration-1000 ${animationStep === 1 || animationStep === 2 ? "opacity-100" : "opacity-0"}`} />
                <Zap className={`w-8 h-8 ${animationStep === 1 || animationStep === 2 ? "text-indigo-650 dark:text-indigo-400 animate-pulse" : "text-slate-400 dark:text-slate-600"}`} />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-3">Backend DNS</span>
              
              {/* Connecting animated line (desktop) */}
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-800/50 rounded mt-4 relative overflow-hidden hidden md:block">
                <div 
                  className="absolute top-0 bottom-0 bg-indigo-500 rounded transition-all duration-1000"
                  style={{
                    left: animationStep === 0 ? "0%" : animationStep === 1 ? "30%" : animationStep === 2 ? "70%" : "100%",
                    width: animationStep === 3 ? "0%" : "20%"
                  }}
                />
              </div>

              {/* Connecting vertical line (CF -> Destination) visible only on mobile */}
              <div className="w-1 h-8 bg-slate-200 dark:bg-slate-800/50 rounded mt-2 relative overflow-hidden md:hidden">
                <div 
                  className="absolute left-0 right-0 bg-indigo-500 rounded transition-all duration-1000"
                  style={{
                    top: animationStep === 2 ? "0%" : animationStep === 3 ? "50%" : "100%",
                    height: animationStep === 3 ? "50%" : animationStep === 2 ? "0%" : "100%"
                  }}
                />
              </div>
            </div>

            {/* Private Recipient / Destination */}
            <div className={`p-5 rounded-2xl border transition-all duration-500 text-left ${
              animationStep === 3 
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 ring-1 ring-emerald-300/20 dark:ring-emerald-500/20" 
                : "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-white/5"
            }`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs text-slate-500">Destination Inbox</h4>
                  <p className="text-xs text-slate-800 dark:text-slate-300 font-medium">sanjaya.ghimire@gmail.com</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${animationStep === 3 ? "bg-emerald-550/20 text-emerald-650 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                    {animationStep === 3 ? "Delivered" : "Waiting"}
                  </span>
                </div>
                <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded flex items-center px-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  Forwarded via NumID
                </div>
                <div className="h-10 bg-slate-200/30 dark:bg-slate-800/30 rounded p-2 text-[10px] text-slate-500">
                  Sender address remains masked.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-24 border-t border-slate-200 dark:border-white/5 transition-colors">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
            Built for Memorability and Control.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Harness the power of Cloudflare DNS routing mapped to your phone number.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          
          <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-sm dark:shadow-none transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Easy to Remember</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Telling someone your email address is now as simple as reciting your phone number: 5154146054@numid.us. No spelling out complex letters.
            </p>
          </div>

          <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-sm dark:shadow-none transition-all group">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Instant DNS Forwarding</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              We create direct Cloudflare zones for email routes. Emails are relayed dynamically with sub-millisecond latencies.
            </p>
          </div>

          <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-sm dark:shadow-none transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Privacy Shield</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Your real inbox (Gmail/Outlook) is shielded from spam lists, trackers, and data breaches. If forwarding gets spammed, disable it instantly.
            </p>
          </div>

          <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-sm dark:shadow-none transition-all group col-span-1 md:col-span-1">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Change Destination Anytime</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Moving from Gmail to ProtonMail? Just update your destination email in the NumID dashboard. Senders never need to learn a new address.
            </p>
          </div>

          <div className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-sm dark:shadow-none transition-all group col-span-1 md:col-span-2">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Dual Secure Verification</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              SMS validation via Twilio Verify ensures you own the phone number. Double email validation confirms you own the destination box. Maximum account safety guaranteed.
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-24 border-t border-slate-200 dark:border-white/5 transition-colors">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
            Simple, Transparent Pricing.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Choose the plan that fits your digital identity needs.
          </p>

          <div className="inline-flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-white/5 mt-8 shadow-sm">
            <button 
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${billingPeriod === "monthly" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingPeriod("yearly")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${billingPeriod === "yearly" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Yearly (20% Off)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          
          {/* Free Plan */}
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 flex flex-col justify-between relative shadow-md dark:shadow-none transition-colors">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Free Plan</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">Permanent forwarding for your phone address</p>
              
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$0</span>
                <span className="text-slate-500 text-sm ml-2">/ permanent</span>
              </div>

              <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>1 NumID Address (phone@numid.us)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Unlimited forward routes</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Change destination email anytime</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Basic account audit logs</span>
                </li>
              </ul>
            </div>
            
            <Link 
              href="/signup" 
              className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all border border-transparent text-center"
            >
              Get Started Free
            </Link>
          </div>

          {/* Premium Plan (Placeholder) */}
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-500/30 flex flex-col justify-between relative ring-1 ring-indigo-300/30 dark:ring-indigo-500/20 shadow-md dark:shadow-none transition-colors">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Coming Soon
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Premium Plan</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">More identity controls and custom options</p>
              
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {billingPeriod === "monthly" ? "$5" : "$4"}
                </span>
                <span className="text-slate-500 text-sm ml-2">/ month</span>
              </div>

              <ul className="space-y-4 text-sm text-slate-655 dark:text-slate-300">
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Custom forward aliases (support@phone.us)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Multiple active destination emails</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Outbound masked replies (Send as NumID)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-605 dark:text-emerald-400 shrink-0" />
                  <span>Stripe billing integration</span>
                </li>
              </ul>
            </div>
            
            <button 
              disabled
              className="mt-8 w-full bg-slate-100 text-slate-400 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold py-3.5 rounded-xl cursor-not-allowed border border-slate-200 dark:border-indigo-500/20 text-center flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Join Waitlist</span>
            </button>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 border-t border-slate-200 dark:border-white/5 transition-colors">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Answers to common questions about routing and accounts.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="border border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-slate-900/20 shadow-sm dark:shadow-none backdrop-blur overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full p-5 sm:p-6 flex items-center justify-between text-left font-bold text-slate-800 dark:text-white hover:text-indigo-650 dark:hover:text-indigo-300 transition-colors text-sm sm:text-base gap-3"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform shrink-0 ${activeFaq === index ? "rotate-180" : ""}`} />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${activeFaq === index ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
              >
                <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/5 py-12 bg-slate-100/50 dark:bg-slate-950/40 text-sm text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="font-display font-extrabold text-white text-xs">N</span>
            </div>
            <span className="font-display font-semibold text-slate-900 dark:text-white">NumID</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">FAQ</a>
            <span className="text-slate-300 dark:text-slate-800 hidden sm:inline">|</span>
            <span>Domain: numid.us</span>
            <span>App: numid.dev</span>
          </div>

          <div className="text-xs">
            &copy; {new Date().getFullYear()} NumID. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) closeLogin(); }}
        >
          {/* Modal card */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl animate-scaleIn text-slate-900 dark:text-white">
            {/* Close button */}
            <button
              id="login-modal-close"
              onClick={closeLogin}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Logo mark */}
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center">
                <span className="font-display font-extrabold text-white text-base">N</span>
              </div>
              <span className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
                Num<span className="text-indigo-400">ID</span>
              </span>
            </div>

            {loginSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-650 dark:text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <p className="text-slate-900 dark:text-white font-bold text-lg">Welcome back!</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Redirecting to your dashboard…</p>
              </div>
            ) : (
              <form id="login-form" onSubmit={handleLogin} className="space-y-5">
                <div className="text-left mb-6">
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-1">Sign In</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Access your NumID dashboard.</p>
                </div>

                {loginError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-300 text-xs flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="login-email" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">NumID Email</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="your-phone@numid.us"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="login-password" className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">Password</label>
                    <Link href="/forgot-password" onClick={closeLogin} className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center justify-center space-x-2 group"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-500 pt-1">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" onClick={closeLogin} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    Create one
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

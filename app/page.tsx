"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  LockKeyhole
} from "lucide-react";

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [animationStep, setAnimationStep] = useState(0);

  // Run the visualizer animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
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
    <div className="relative min-h-screen text-slate-100 bg-black overflow-hidden font-sans">
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none animate-pulse-slow" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-display font-extrabold text-white text-lg tracking-wider">N</span>
            </div>
            <span className="font-display font-extrabold text-white text-xl tracking-tight">
              Num<span className="text-indigo-400">ID</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#visualizer" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link 
              href="/signup" 
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Special: Permanent free custom routing</span>
        </div>
        
        <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl mx-auto leading-tight">
          Your Phone Number. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            Your Permanent Email.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Never change your public email address again. Forward emails sent to your phone number at <span className="text-white font-medium">numid.us</span> to any destination. Fast, private, and memorable.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/10 flex items-center justify-center space-x-2 group hover:-translate-y-0.5"
          >
            <span>Claim Your NumID Now</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a 
            href="#features" 
            className="w-full sm:w-auto bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-semibold px-8 py-4 rounded-2xl transition-all flex items-center justify-center"
          >
            Learn More
          </a>
        </div>

        {/* Animated Visualizer Mockup */}
        <div id="visualizer" className="max-w-4xl mx-auto border border-white/5 rounded-3xl bg-slate-950/60 backdrop-blur p-6 md:p-8 shadow-2xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 rounded-full px-4 py-1 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Interactive Forwarding Simulator</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 md:gap-4 mt-4">
            
            {/* Sender / Outgoing */}
            <div className={`p-5 rounded-2xl border transition-all duration-500 text-left ${animationStep === 0 ? "bg-indigo-950/40 border-indigo-500/30 ring-1 ring-indigo-500/20" : "bg-slate-900/40 border-white/5"}`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs text-slate-500">Sender Inbox</h4>
                  <p className="text-xs text-slate-300 font-medium">customer@example.com</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-800 rounded w-1/3" />
                <div className="h-6 bg-slate-800/50 rounded flex items-center px-2 text-[10px] text-slate-400 font-mono">
                  To: 5154146054@numid.us
                </div>
                <div className="h-10 bg-slate-800/30 rounded p-2 text-[10px] text-slate-500">
                  Hi, here is the signed agreement...
                </div>
              </div>
            </div>

            {/* Cloudflare Routing Hub */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-2xl bg-indigo-500/10 blur transition-opacity duration-1000 ${animationStep === 1 || animationStep === 2 ? "opacity-100" : "opacity-0"}`} />
                <Zap className={`w-8 h-8 ${animationStep === 1 || animationStep === 2 ? "text-indigo-400 animate-pulse" : "text-slate-600"}`} />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-3">Cloudflare DNS</span>
              
              {/* Connecting animated line */}
              <div className="w-full h-1 bg-slate-800/50 rounded mt-4 relative overflow-hidden hidden md:block">
                <div 
                  className="absolute top-0 bottom-0 bg-indigo-500 rounded transition-all duration-1000"
                  style={{
                    left: animationStep === 0 ? "0%" : animationStep === 1 ? "30%" : animationStep === 2 ? "70%" : "100%",
                    width: animationStep === 3 ? "0%" : "20%"
                  }}
                />
              </div>
            </div>

            {/* Private Recipient / Destination */}
            <div className={`p-5 rounded-2xl border transition-all duration-500 text-left ${animationStep === 3 ? "bg-emerald-950/40 border-emerald-500/30 ring-1 ring-emerald-500/20" : "bg-slate-900/40 border-white/5"}`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs text-slate-500">Destination Inbox</h4>
                  <p className="text-xs text-slate-300 font-medium">sanjaya.ghimire@gmail.com</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-2 bg-slate-800 rounded w-1/2" />
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${animationStep === 3 ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                    {animationStep === 3 ? "Delivered" : "Waiting"}
                  </span>
                </div>
                <div className="h-6 bg-slate-800/50 rounded flex items-center px-2 text-[10px] text-slate-400 font-mono">
                  Forwarded via NumID
                </div>
                <div className="h-10 bg-slate-800/30 rounded p-2 text-[10px] text-slate-500">
                  Sender address remains masked.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white mb-4">
            Built for Memorability and Control.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Harness the power of Cloudflare DNS routing mapped to your phone number.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all hover:bg-slate-900/60 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Easy to Remember</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Telling someone your email address is now as simple as reciting your phone number: 5154146054@numid.us. No spelling out complex letters.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all hover:bg-slate-900/60 group">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant DNS Forwarding</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              We create direct Cloudflare zones for email routes. Emails are relayed dynamically with sub-millisecond latencies.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all hover:bg-slate-900/60 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Privacy Shield</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your real inbox (Gmail/Outlook) is shielded from spam lists, trackers, and data breaches. If forwarding gets spammed, disable it instantly.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all hover:bg-slate-900/60 group col-span-1 md:col-span-1">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Change Destination Anytime</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Moving from Gmail to ProtonMail? Just update your destination email in the NumID dashboard. Senders never need to learn a new address.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all hover:bg-slate-900/60 group col-span-1 md:col-span-2">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dual Secure Verification</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              SMS validation via Twilio Verify ensures you own the phone number. Double email validation confirms you own the destination box. Maximum account safety guaranteed.
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white mb-4">
            Simple, Transparent Pricing.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Choose the plan that fits your digital identity needs.
          </p>

          <div className="inline-flex items-center bg-slate-900 p-1 rounded-xl border border-white/5 mt-8">
            <button 
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${billingPeriod === "monthly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingPeriod("yearly")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${billingPeriod === "yearly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Yearly (20% Off)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Free Plan */}
          <div className="p-8 rounded-3xl bg-slate-950 border border-white/5 flex flex-col justify-between relative">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Free Plan</h3>
              <p className="text-slate-400 text-xs mb-6">Permanent forwarding for your phone address</p>
              
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-slate-500 text-sm ml-2">/ permanent</span>
              </div>

              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1 NumID Address (phone@numid.us)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited forward routes</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Change destination email anytime</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Basic account audit logs</span>
                </li>
              </ul>
            </div>
            
            <Link 
              href="/signup" 
              className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all border border-white/10 text-center"
            >
              Get Started Free
            </Link>
          </div>

          {/* Premium Plan (Placeholder) */}
          <div className="p-8 rounded-3xl bg-slate-950 border border-indigo-500/30 flex flex-col justify-between relative ring-1 ring-indigo-500/20">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Coming Soon
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Premium Plan</h3>
              <p className="text-slate-400 text-xs mb-6">More identity controls and custom options</p>
              
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-white">
                  {billingPeriod === "monthly" ? "$5" : "$4"}
                </span>
                <span className="text-slate-500 text-sm ml-2">/ month</span>
              </div>

              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Custom forward aliases (e.g. support@5154146054.us)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multiple active destination emails</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Outbound masked replies (Send as NumID)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Stripe billing integration</span>
                </li>
              </ul>
            </div>
            
            <button 
              disabled
              className="mt-8 w-full bg-indigo-500/10 text-indigo-400 font-bold py-3.5 rounded-xl cursor-not-allowed border border-indigo-500/20 text-center flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Join Waitlist</span>
            </button>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400">
            Answers to common questions about routing and accounts.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="border border-white/5 rounded-2xl bg-slate-900/20 backdrop-blur overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full p-6 flex items-center justify-between text-left font-bold text-white hover:text-indigo-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${activeFaq === index ? "rotate-180" : ""}`} />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${activeFaq === index ? "max-h-60 opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
              >
                <p className="px-6 pb-6 text-sm text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-slate-950/40 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="font-display font-extrabold text-white text-xs">N</span>
            </div>
            <span className="font-display font-semibold text-white">NumID</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <span className="text-slate-600">|</span>
            <span>Domain: numid.us</span>
            <span>App: numid.dev</span>
          </div>

          <div>
            &copy; {new Date().getFullYear()} NumID. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}

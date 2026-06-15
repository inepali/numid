"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink,
  Smartphone,
  Mail,
  Share2,
} from "lucide-react";
import Link from "next/link";

interface PublicProfileClientProps {
  profile: {
    phone_number: string;
    numid_address: string;
    social_profiles: Record<string, string>;
  };
}

const SERVICE_META: Record<string, { name: string; prefix: string; color: string; label: string }> = {
  facebook: { name: "Facebook", prefix: "https://facebook.com/", color: "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20", label: "Add on Facebook" },
  instagram: { name: "Instagram", prefix: "https://instagram.com/", color: "bg-pink-600/10 border-pink-500/20 text-pink-400 hover:bg-pink-600/20", label: "Follow on Instagram" },
  linkedin: { name: "LinkedIn", prefix: "https://linkedin.com/in/", color: "bg-sky-600/10 border-sky-500/20 text-sky-400 hover:bg-sky-600/20", label: "Connect on LinkedIn" },
  x: { name: "X (Twitter)", prefix: "https://x.com/", color: "bg-slate-800/20 border-slate-700/20 text-slate-300 hover:bg-slate-800/40", label: "Follow on X" },
  tiktok: { name: "TikTok", prefix: "https://tiktok.com/@", color: "bg-rose-600/10 border-rose-500/20 text-rose-400 hover:bg-rose-600/20", label: "Follow on TikTok" },
  youtube: { name: "YouTube", prefix: "https://youtube.com/@", color: "bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-600/20", label: "Subscribe on YouTube" },
  threads: { name: "Threads", prefix: "https://threads.net/@", color: "bg-slate-800/20 border-slate-700/20 text-slate-300 hover:bg-slate-800/40", label: "Follow on Threads" },
  whatsapp: { name: "WhatsApp", prefix: "https://wa.me/", color: "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20", label: "Message on WhatsApp" },
  telegram: { name: "Telegram", prefix: "https://t.me/", color: "bg-cyan-600/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-600/20", label: "Message on Telegram" },
  signal: { name: "Signal", prefix: "https://signal.me/#p/", color: "bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20", label: "Message on Signal" },
  discord: { name: "Discord", prefix: "", color: "bg-violet-600/10 border-violet-500/20 text-violet-400 hover:bg-violet-600/20", label: "Add on Discord" },
  messenger: { name: "Messenger", prefix: "https://m.me/", color: "bg-blue-500/10 border-blue-400/20 text-blue-400 hover:bg-blue-500/20", label: "Message on Messenger" },
  github: { name: "GitHub", prefix: "https://github.com/", color: "bg-zinc-800/20 border-zinc-700/20 text-zinc-300 hover:bg-zinc-800/40", label: "View GitHub Profile" },
  gitlab: { name: "GitLab", prefix: "https://gitlab.com/", color: "bg-orange-600/10 border-orange-500/20 text-orange-400 hover:bg-orange-600/20", label: "View GitLab Profile" },
  behance: { name: "Behance", prefix: "https://behance.net/", color: "bg-blue-700/10 border-blue-600/20 text-blue-400 hover:bg-blue-700/20", label: "View Behance Portfolio" },
  dribbble: { name: "Dribbble", prefix: "https://dribbble.com/", color: "bg-pink-500/10 border-pink-400/20 text-pink-400 hover:bg-pink-500/20", label: "View Dribbble Design" },
  medium: { name: "Medium", prefix: "https://medium.com/@", color: "bg-zinc-800/20 border-zinc-700/20 text-zinc-300 hover:bg-zinc-800/40", label: "Read on Medium" },
  substack: { name: "Substack", prefix: "https://", color: "bg-orange-500/10 border-orange-400/20 text-orange-400 hover:bg-orange-500/20", label: "Subscribe on Substack" },
  personal_website: { name: "Personal Website", prefix: "", color: "bg-teal-600/10 border-teal-500/20 text-teal-400 hover:bg-teal-600/20", label: "Visit Website" },
  company_website: { name: "Company Website", prefix: "", color: "bg-teal-700/10 border-teal-600/20 text-teal-400 hover:bg-teal-700/20", label: "Visit Company" },
  contact_form: { name: "Contact Form", prefix: "", color: "bg-cyan-600/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-600/20", label: "Open Contact Form" },
  phone: { name: "Phone Call", prefix: "tel:", color: "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20", label: "Call Phone" },
  sms: { name: "SMS Link", prefix: "sms:", color: "bg-sky-600/10 border-sky-500/20 text-sky-400 hover:bg-sky-600/20", label: "Send SMS" },
  email: { name: "Email Link", prefix: "mailto:", color: "bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20", label: "Send Email" },
  calendly: { name: "Calendly Link", prefix: "https://calendly.com/", color: "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20", label: "Book a Meeting" },
  google_business: { name: "Google Business Profile", prefix: "", color: "bg-yellow-600/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-600/20", label: "View Business Profile" },
  online_store: { name: "Online Store", prefix: "", color: "bg-purple-600/10 border-purple-500/20 text-purple-400 hover:bg-purple-600/20", label: "Visit Store" },
};

const CATEGORY_GROUPS = [
  { key: "socials", title: "Social Networks", keys: ["facebook", "instagram", "linkedin", "x", "tiktok", "youtube", "threads"] },
  { key: "messaging", title: "Messaging Platforms", keys: ["whatsapp", "telegram", "signal", "discord", "messenger"] },
  { key: "professional", title: "Professional & Creator", keys: ["github", "gitlab", "behance", "dribbble", "medium", "substack"] },
  { key: "business", title: "Business & Contact", keys: ["personal_website", "company_website", "contact_form", "phone", "sms", "email", "calendly", "google_business", "online_store"] },
];

function formatPhoneNumber(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+1 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  }
  return phone;
}

function getAbsoluteUrl(serviceKey: string, value: string, prefix: string) {
  if (
    value.startsWith("http://") || 
    value.startsWith("https://") || 
    value.startsWith("mailto:") || 
    value.startsWith("tel:") || 
    value.startsWith("sms:")
  ) {
    return value;
  }
  return prefix + value;
}

export default function PublicProfileClient({ profile }: PublicProfileClientProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.numid_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check which tabs have active links
  const availableGroups = CATEGORY_GROUPS.filter(group => 
    group.keys.some(k => profile.social_profiles?.[k] !== undefined && profile.social_profiles[k].trim() !== "")
  );

  const tabs = [
    { key: "all", title: "All Links" },
    ...availableGroups.map(g => ({ key: g.key, title: g.title.split(" ")[0] })) // Shorten titles for tab bar
  ];

  return (
    <div className="relative min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center px-4 py-12 overflow-hidden font-sans">
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-900/10 blur-[130px] pointer-events-none" />

      {/* Main Profile Card */}
      <div className="w-full max-w-md bg-slate-950/60 border border-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center text-center">
        
        {/* Verification Checkmark */}
        <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide mb-6">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <span>Verified Identity</span>
        </div>

        {/* User Identity Info */}
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {formatPhoneNumber(profile.phone_number)}
        </h1>
        
        {/* Public NumID Address */}
        <div className="mt-3 flex items-center justify-between gap-3 bg-slate-900/80 border border-white/5 rounded-2xl px-4 py-2.5 w-full select-all font-mono text-xs text-indigo-300">
          <div className="flex items-center space-x-2 truncate">
            <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{profile.numid_address}</span>
          </div>
          <button 
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-slate-750 cursor-pointer shrink-0"
            title="Copy Email"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Dynamic Category Tabs */}
        {availableGroups.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1 mt-8 border-b border-white/5 pb-2.5 w-full">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                {tab.title}
              </button>
            ))}
          </div>
        )}

        {/* Profile Links Render */}
        <div className="mt-8 space-y-3.5 w-full">
          {availableGroups.length === 0 ? (
            <div className="py-12 rounded-2xl bg-slate-900/20 border border-white/5 text-slate-500 text-xs">
              This verified identity has not configured any public links yet.
            </div>
          ) : (
            CATEGORY_GROUPS
              .filter(group => activeTab === "all" || activeTab === group.key)
              .map(group => {
                const activeInGroup = group.keys.filter(k => 
                  profile.social_profiles?.[k] !== undefined && profile.social_profiles[k].trim() !== ""
                );

                if (activeInGroup.length === 0) return null;

                return (
                  <div key={group.key} className="space-y-2.5 text-left">
                    {activeTab === "all" && (
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider pl-1 mt-4 first:mt-0">
                        {group.title}
                      </h4>
                    )}
                    
                    <div className="space-y-2">
                      {activeInGroup.map((key) => {
                        const service = SERVICE_META[key];
                        const value = profile.social_profiles[key];
                        const url = getAbsoluteUrl(key, value, service.prefix);

                        return (
                          <Link
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01] ${service.color}`}
                          >
                            <div className="flex items-center space-x-3.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-black/10 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                                {service.name.substring(0, 2)}
                              </div>
                              <div className="text-left min-w-0">
                                <p className="font-semibold text-sm truncate">{service.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] sm:max-w-none">
                                  {value}
                                </p>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 opacity-60 shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Footer brand */}
        <div className="mt-12 border-t border-white/5 pt-6 flex flex-col items-center justify-center space-y-1.5 w-full text-slate-600 text-xs">
          <Link href="/" className="flex items-center space-x-1.5 hover:text-indigo-400 transition-colors">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-[10px] font-extrabold text-white">N</div>
            <span className="font-bold text-slate-400">NumID Identity</span>
          </Link>
          <p className="text-[10px]">Verify your contact profiles at numid.dev</p>
        </div>

      </div>

    </div>
  );
}

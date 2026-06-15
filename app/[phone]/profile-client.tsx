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
  QrCode,
  Download,
} from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

interface PublicProfileClientProps {
  profile: {
    phone_number: string;
    numid_address: string;
    social_profiles: Record<string, string>;
  };
}

const SERVICE_META: Record<string, { name: string; prefix: string; color: string; label: string }> = {
  facebook: { name: "Facebook", prefix: "https://facebook.com/", color: "bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/20", label: "Add on Facebook" },
  instagram: { name: "Instagram", prefix: "https://instagram.com/", color: "bg-pink-50 dark:bg-pink-600/10 border-pink-200 dark:border-pink-500/20 text-pink-700 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-600/20", label: "Follow on Instagram" },
  linkedin: { name: "LinkedIn", prefix: "https://linkedin.com/in/", color: "bg-sky-50 dark:bg-sky-600/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-600/20", label: "Connect on LinkedIn" },
  x: { name: "X (Twitter)", prefix: "https://x.com/", color: "bg-slate-100 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700/20 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/40", label: "Follow on X" },
  tiktok: { name: "TikTok", prefix: "https://tiktok.com/@", color: "bg-rose-50 dark:bg-rose-600/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-600/20", label: "Follow on TikTok" },
  youtube: { name: "YouTube", prefix: "https://youtube.com/@", color: "bg-red-50 dark:bg-red-600/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-600/20", label: "Subscribe on YouTube" },
  threads: { name: "Threads", prefix: "https://threads.net/@", color: "bg-slate-100 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700/20 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/40", label: "Follow on Threads" },
  whatsapp: { name: "WhatsApp", prefix: "https://wa.me/", color: "bg-emerald-50 dark:bg-emerald-600/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-600/20", label: "Message on WhatsApp" },
  telegram: { name: "Telegram", prefix: "https://t.me/", color: "bg-cyan-50 dark:bg-cyan-600/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-600/20", label: "Message on Telegram" },
  signal: { name: "Signal", prefix: "https://signal.me/#p/", color: "bg-indigo-50 dark:bg-indigo-600/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-600/20", label: "Message on Signal" },
  discord: { name: "Discord", prefix: "", color: "bg-violet-50 dark:bg-violet-600/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-600/20", label: "Add on Discord" },
  messenger: { name: "Messenger", prefix: "https://m.me/", color: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-400/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20", label: "Message on Messenger" },
  github: { name: "GitHub", prefix: "https://github.com/", color: "bg-zinc-100 dark:bg-zinc-800/20 border-zinc-250 dark:border-zinc-700/20 text-zinc-750 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/40", label: "View GitHub Profile" },
  gitlab: { name: "GitLab", prefix: "https://gitlab.com/", color: "bg-orange-50 dark:bg-orange-600/10 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-600/20", label: "View GitLab Profile" },
  behance: { name: "Behance", prefix: "https://behance.net/", color: "bg-blue-50 dark:bg-blue-700/10 border-blue-200 dark:border-blue-600/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-700/20", label: "View Behance Portfolio" },
  dribbble: { name: "Dribbble", prefix: "https://dribbble.com/", color: "bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-400/20 text-pink-700 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-500/20", label: "View Dribbble Design" },
  medium: { name: "Medium", prefix: "https://medium.com/@", color: "bg-zinc-100 dark:bg-zinc-800/20 border-zinc-250 dark:border-zinc-700/20 text-zinc-750 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/40", label: "Read on Medium" },
  substack: { name: "Substack", prefix: "https://", color: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-400/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20", label: "Subscribe on Substack" },
  personal_website: { name: "Personal Website", prefix: "", color: "bg-teal-50 dark:bg-teal-600/10 border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-600/20", label: "Visit Website" },
  company_website: { name: "Company Website", prefix: "", color: "bg-teal-50 dark:bg-teal-700/10 border-teal-200 dark:border-teal-600/20 text-teal-705 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-700/20", label: "Visit Company" },
  contact_form: { name: "Contact Form", prefix: "", color: "bg-cyan-50 dark:bg-cyan-600/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-600/20", label: "Open Contact Form" },
  phone: { name: "Phone Call", prefix: "tel:", color: "bg-emerald-50 dark:bg-emerald-600/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-600/20", label: "Call Phone" },
  sms: { name: "SMS Link", prefix: "sms:", color: "bg-sky-50 dark:bg-sky-600/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-600/20", label: "Send SMS" },
  email: { name: "Email Link", prefix: "mailto:", color: "bg-indigo-50 dark:bg-indigo-600/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-600/20", label: "Send Email" },
  calendly: { name: "Calendly Link", prefix: "https://calendly.com/", color: "bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/20", label: "Book a Meeting" },
  google_business: { name: "Google Business Profile", prefix: "", color: "bg-yellow-50 dark:bg-yellow-600/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-750 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-600/20", label: "View Business Profile" },
  online_store: { name: "Online Store", prefix: "", color: "bg-purple-50 dark:bg-purple-600/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-600/20", label: "Visit Store" },
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

  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const profileUrl = typeof window !== "undefined"
    ? window.location.origin + "/" + profile.phone_number.replace("+", "")
    : "https://numid.dev/" + profile.phone_number.replace("+", "");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = async () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `numid-qr-${profile.phone_number.replace("+", "")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download QR code", err);
    }
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
    <div className="relative min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center px-4 py-12 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Floating Header Actions */}
      <div className="fixed top-6 right-6 z-50 flex items-center space-x-2">
        <button
          onClick={() => setShowQRModal(true)}
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
          title="Show QR Code"
        >
          <QrCode className="w-5 h-5 text-slate-650 dark:text-slate-400" />
        </button>
        <ThemeToggle />
      </div>

      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/5 dark:bg-indigo-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-900/5 dark:bg-violet-900/10 blur-[130px] pointer-events-none" />

      {/* Main Profile Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center text-center">
        
        {/* Verification Checkmark */}
        <div className="inline-flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide mb-6">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Verified Identity</span>
        </div>

        {/* User Identity Info */}
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {formatPhoneNumber(profile.phone_number)}
        </h1>
        
        {/* Public NumID Address */}
        <div className="mt-3 flex items-center justify-between gap-3 bg-slate-55 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2.5 w-full select-all font-mono text-xs text-indigo-700 dark:text-indigo-300">
          <div className="flex items-center space-x-2 truncate">
            <Mail className="w-3.5 h-3.5 text-indigo-605 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{profile.numid_address}</span>
          </div>
          <button 
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer shrink-0"
            title="Copy Email"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Dynamic Category Tabs */}
        {availableGroups.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1 mt-8 border-b border-slate-200 dark:border-white/5 pb-2.5 w-full">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
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
            <div className="py-12 rounded-2xl bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-white/5 text-slate-500 text-xs">
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
                              <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-black/10 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                                {service.name.substring(0, 2)}
                              </div>
                              <div className="text-left min-w-0">
                                <p className="font-semibold text-sm truncate">{service.name}</p>
                                <p className="text-[10px] text-slate-605 dark:text-slate-400 font-mono truncate max-w-[200px] sm:max-w-none">
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
        <div className="mt-12 border-t border-slate-200 dark:border-white/5 pt-6 flex flex-col items-center justify-center space-y-1.5 w-full text-slate-550 dark:text-slate-600 text-xs">
          <Link href="/" className="flex items-center space-x-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-[10px] font-extrabold text-white">N</div>
            <span className="font-bold text-slate-600 dark:text-slate-400">NumID Identity</span>
          </Link>
          <p className="text-[10px]">Verify your contact profiles at numid.dev</p>
        </div>

      </div>

      {/* Scan QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-6 shadow-2xl animate-scaleIn flex flex-col items-center text-center">
            
            {/* Header/Title */}
            <div className="w-full flex justify-between items-center pb-3 border-b border-slate-200 dark:border-white/5 mb-5">
              <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400">
                <QrCode className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-md">Scan to Connect</h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold text-lg p-1 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* QR Code Graphic Container */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/5 mb-5">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(profileUrl)}`}
                alt="Profile QR Code"
                className="w-48 h-48 bg-white p-3 rounded-xl shadow-inner mx-auto select-none"
              />
            </div>

            {/* Profile Info */}
            <div className="w-full mb-5">
              <span className="inline-flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Verified NumID Identity</span>
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatPhoneNumber(profile.phone_number)}
              </p>
            </div>

            {/* Link Copy Box */}
            <div className="w-full flex items-center justify-between gap-2 bg-slate-55 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-xl px-3.5 py-2 mb-5 text-xs font-mono text-slate-600 dark:text-slate-350">
              <span className="truncate flex-1 text-left">{profileUrl}</span>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-550 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer shrink-0"
                title="Copy Link"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Actions Footer */}
            <div className="w-full flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import React, { useState } from "react";
import { 
  Lock, 
  Unlock, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  CreditCard,
  Key,
  FileText,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { decryptText } from "@/lib/crypto";

interface EncryptedItem {
  category: string;
  title: string;
  encrypted_data: string;
  iv: string;
  salt: string;
}

interface VaultClientProps {
  profile: {
    phone_number: string;
    numid_address: string;
    first_name?: string;
    last_name?: string;
  };
  encryptedItems: EncryptedItem[];
}

const VAULT_CATEGORIES = [
  { key: "ssn", title: "Social Security Number (SSN)" },
  { key: "driver_license", title: "Driver's License" },
  { key: "bank_account", title: "Bank Account" },
  { key: "password", title: "Login Password" },
  { key: "passkey", title: "Passkey / Secret Key" },
  { key: "other", title: "Other / Secure Note" }
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

export default function VaultClient({ profile, encryptedItems }: VaultClientProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultPin, setVaultPin] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [decryptedItems, setDecryptedItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("ssn");
  const [revealedItemIds, setRevealedItemIds] = useState<string[]>([]);
  const [copiedFieldKey, setCopiedFieldKey] = useState<string | null>(null);

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsDecrypting(true);

    try {
      // Find the E2EE verification row
      const verificationRow = encryptedItems.find(
        item => item.category === "system" && item.title === "__verification__"
      );

      if (!verificationRow) {
        setErrorMsg("This secure vault does not have a verification anchor initialized.");
        setIsDecrypting(false);
        return;
      }

      // Attempt to decrypt verification payload
      let decryptedVer: string;
      try {
        decryptedVer = await decryptText({
          ciphertext: verificationRow.encrypted_data,
          iv: verificationRow.iv,
          salt: verificationRow.salt
        }, vaultPin);
      } catch (err) {
        setErrorMsg("Incorrect Master PIN/Password. Decryption failed.");
        setIsDecrypting(false);
        return;
      }

      const parsedVer = JSON.parse(decryptedVer);
      if (!parsedVer || !parsedVer.verified) {
        setErrorMsg("Invalid vault credentials. Verification signature mismatched.");
        setIsDecrypting(false);
        return;
      }

      // Successful unlock - decrypt remaining secrets
      const list: any[] = [];
      let index = 0;
      for (const item of encryptedItems) {
        if (item.category === "system") continue;
        try {
          const decText = await decryptText({
            ciphertext: item.encrypted_data,
            iv: item.iv,
            salt: item.salt
          }, vaultPin);

          list.push({
            id: `decrypted-item-${index++}`,
            category: item.category,
            title: item.title,
            decryptedData: JSON.parse(decText)
          });
        } catch (err) {
          console.error("Failed to decrypt item:", item.title, err);
        }
      }

      setDecryptedItems(list);
      setIsUnlocked(true);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during decryption.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleLock = () => {
    setVaultPin("");
    setIsUnlocked(false);
    setDecryptedItems([]);
    setErrorMsg(null);
    setRevealedItemIds([]);
  };

  const toggleReveal = (id: string) => {
    setRevealedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedFieldKey(key);
    setTimeout(() => setCopiedFieldKey(null), 2000);
  };

  const currentCategoryItems = decryptedItems.filter(item => activeCategory === "ssn" || item.category === activeCategory);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Floating Header Actions */}
      <div className="fixed top-6 right-6 z-50 flex items-center space-x-3">
        {isUnlocked && (
          <button
            onClick={handleLock}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Lock Vault</span>
          </button>
        )}
        <ThemeToggle />
      </div>

      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/5 dark:bg-indigo-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-900/5 dark:bg-violet-900/10 blur-[130px] pointer-events-none" />

      {/* Header logo */}
      <header className="w-full max-w-md mx-auto pt-12 pb-6 px-6 flex items-center justify-center space-x-2">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="NumID Logo" className="w-8 h-8 object-contain rounded-lg" />
          <span className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
            Num<span className="text-indigo-600 dark:text-indigo-400">ID</span>
          </span>
        </Link>
        <span className="text-slate-300 dark:text-slate-800">|</span>
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Secure Vault</span>
      </header>

      {/* Main Lock/Vault Card Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        
        {/* LOCK SCREEN STATE */}
        {!isUnlocked ? (
          <div className="w-full max-w-md bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400 mb-6 shrink-0">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>

            <span className="inline-flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide mb-4">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Zero-Knowledge E2EE</span>
            </span>

            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Unlock Private Profile
            </h1>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs">
              Access the private credentials shared by{" "}
              <strong className="text-indigo-600 dark:text-indigo-400 font-mono select-all">
                {profile.numid_address}
              </strong>.
            </p>

            {fullName && (
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
                Owner: {fullName}
              </p>
            )}

            {errorMsg && (
              <div className="w-full mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 text-left animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="w-full mt-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide text-left">
                  Enter Vault Master PIN / Password
                </label>
                <input
                  type="password"
                  placeholder="••••••"
                  value={vaultPin}
                  onChange={(e) => setVaultPin(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-center font-mono tracking-widest focus:placeholder-transparent"
                  required
                  disabled={isDecrypting}
                />
              </div>

              <button
                type="submit"
                disabled={isDecrypting}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs"
              >
                {isDecrypting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Decrypt Vault Secrets</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          
          /* UNLOCKED VAULT DIRECTORY STATE */
          <div className="w-full max-w-3xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
              <div className="text-left">
                <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400">
                  <Unlock className="w-5 h-5 text-emerald-500" />
                  <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Decrypted Identity Vault</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Private profile shared by <strong className="font-mono text-slate-700 dark:text-slate-350">{profile.numid_address}</strong> (Verified Phone: {formatPhoneNumber(profile.phone_number)}).
                </p>
              </div>

              <span className="w-fit text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-350 border border-emerald-200 dark:border-emerald-500/20 tracking-wider">
                DECRYPTED E2EE
              </span>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 text-xs">
              {VAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                    activeCategory === cat.key
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-bold"
                      : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5"
                  }`}
                >
                  {cat.title.split(" (")[0]}
                </button>
              ))}
            </div>

            {/* Decrypted items list */}
            {currentCategoryItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                No secrets stored in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {currentCategoryItems.map((item) => {
                  const isRevealed = revealedItemIds.includes(item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-355 dark:hover:border-white/10 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Title block */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-605 dark:text-indigo-455">
                              {item.category === "bank_account" ? (
                                <CreditCard className="w-4 h-4 text-indigo-500" />
                              ) : item.category === "password" || item.category === "passkey" ? (
                                <Key className="w-4 h-4 text-indigo-500" />
                              ) : (
                                <FileText className="w-4 h-4 text-indigo-500" />
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[150px]">{item.title}</h4>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => toggleReveal(item.id)}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                            title={isRevealed ? "Mask values" : "Reveal values"}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Fields List */}
                        <div className="mt-3 space-y-2 text-xs border-t border-slate-200 dark:border-white/5 pt-3">
                          {Object.entries(item.decryptedData || {}).map(([key, val]) => {
                            const fieldUniqueKey = `${item.id}-${key}`;
                            const displayVal = val as string;
                            
                            return (
                              <div key={key} className="flex items-center justify-between gap-4">
                                <span 
                                  className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 truncate max-w-[80px]" 
                                  title={key}
                                >
                                  {key.replace(/_/g, " ")}
                                </span>
                                
                                <div className="flex items-center space-x-1.5 shrink-0 max-w-[180px]">
                                  <span className="font-mono text-slate-800 dark:text-slate-300 truncate">
                                    {isRevealed ? displayVal : "••••••••"}
                                  </span>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(displayVal, fieldUniqueKey)}
                                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-750 dark:hover:text-white rounded transition-colors shrink-0"
                                    title="Copy to clipboard"
                                  >
                                    {copiedFieldKey === fieldUniqueKey ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-white/5 pt-2 flex justify-between items-center font-semibold">
                        <span>E2EE Zero Knowledge</span>
                        <span>Read Only</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 bg-slate-100/30 dark:bg-slate-950/10 text-center text-[10px] text-slate-450 dark:text-slate-600 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-center space-x-1.5 mb-1 text-slate-600 dark:text-slate-450">
          <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-[8px] font-extrabold text-white">N</div>
          <span className="font-bold">NumID Identity Systems</span>
        </div>
        <p>All decryption takes place locally in your browser sandbox. Passwords are never sent to NumID.</p>
      </footer>

    </div>
  );
}

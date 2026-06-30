"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
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
  saveDestinationEmailAction,
  uploadAvatarAction,
} from "@/app/actions/dashboard";
import { logSignInAction } from "@/app/actions/auth";
import { 
  sendInvitationAction, 
  getInvitationsAction 
} from "@/app/actions/invitations";
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
  ArrowRight,
  Smartphone,
  Zap,
  Radio,
  Plus,
  Globe,
  Link2,
  ExternalLink,
  Share2,
  QrCode,
  Copy,
  Check,
  Camera,
  Eye,
  EyeOff,
  Edit,
  Key,
  Unlock,
  FileText,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { 
  fetchVaultItemsAction, 
  saveVaultItemAction, 
  deleteVaultItemAction, 
  VaultItem 
} from "@/app/actions/vault";
import { encryptText, decryptText } from "@/lib/crypto";

// Available services schema
type ProfileCategoryKey = "socials" | "messaging" | "professional" | "business";

interface ServiceConfig {
  name: string;
  prefix: string;
  placeholder: string;
}

const VAULT_CATEGORIES = [
  { key: "ssn", title: "Social Security Number (SSN)" },
  { key: "driver_license", title: "Driver's License" },
  { key: "bank_account", title: "Bank Account" },
  { key: "password", title: "Login Password" },
  { key: "passkey", title: "Passkey / Secret Key" },
  { key: "other", title: "Other / Secure Note" },
  { key: "system", title: "System" }
];

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

function resolveNumidEmail(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  let cleaned = trimmed.replace(/[-() ]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.replace("+", "");
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    cleaned = cleaned.substring(1);
  }
  return `${cleaned}@numid.us`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Social Profile States
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [privateProfiles, setPrivateProfiles] = useState<string[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileCategoryKey>("socials");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

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

  // Share QR Code modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Invitations States
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Vault states
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [decryptedVaultItems, setDecryptedVaultItems] = useState<any[]>([]);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultPin, setVaultPin] = useState("");
  const [isVaultSetup, setIsVaultSetup] = useState<boolean | null>(null); // null = check pending, false = need setup, true = setup done
  const [vaultInputPin, setVaultInputPin] = useState("");
  const [vaultConfirmPin, setVaultConfirmPin] = useState("");
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState("");
  const [hasSavedRecoveryKey, setHasSavedRecoveryKey] = useState(false);
  
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultSuccess, setVaultSuccess] = useState<string | null>(null);
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [showVaultAddModal, setShowVaultAddModal] = useState(false);
  const [editingVaultItem, setEditingVaultItem] = useState<any | null>(null);
  const [revealedVaultItemIds, setRevealedVaultItemIds] = useState<string[]>([]);
  const [showVaultShareModal, setShowVaultShareModal] = useState(false);
  const [copiedVaultLink, setCopiedVaultLink] = useState(false);
  
  // Vault Form states
  const [vaultCategory, setVaultCategory] = useState("ssn");
  const [vaultTitle, setVaultTitle] = useState("");
  const [vaultFields, setVaultFields] = useState<Record<string, string>>({});

  const loadVaultItems = async () => {
    setVaultError(null);
    const vaultRes = await fetchVaultItemsAction();
    if (vaultRes.success && vaultRes.items) {
      setVaultItems(vaultRes.items);
      const verificationRow = vaultRes.items.find(item => item.category === "system" && item.title === "__verification__");
      setIsVaultSetup(!!verificationRow);
      
      if (isVaultUnlocked && vaultPin) {
        // Attempt to decrypt all items
        const decryptedList = [];
        for (const item of vaultRes.items) {
          if (item.category === "system") continue;
          try {
            const decryptedText = await decryptText({
              ciphertext: item.encrypted_data,
              iv: item.iv,
              salt: item.salt
            }, vaultPin);
            decryptedList.push({
              ...item,
              decryptedData: JSON.parse(decryptedText)
            });
          } catch (err) {
            console.error("Failed to decrypt item:", item.title, err);
          }
        }
        setDecryptedVaultItems(decryptedList);
      }
    }
  };

  const handleSetupVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    setVaultSuccess(null);
    
    if (vaultInputPin.length < 6) {
      setVaultError("Vault Master Password/PIN must be at least 6 characters.");
      return;
    }
    
    if (vaultInputPin !== vaultConfirmPin) {
      setVaultError("Passwords do not match.");
      return;
    }

    setIsVaultLoading(true);
    try {
      // Generate recovery key
      const randomBytes = new Uint8Array(12);
      if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(randomBytes);
      } else {
        const cryptoModule = require("crypto");
        cryptoModule.randomFillSync(randomBytes);
      }
      let keyHex = "";
      for (let i = 0; i < randomBytes.length; i++) {
        keyHex += randomBytes[i].toString(16).padStart(2, "0");
      }
      const recoveryKey = "numid-vault-" + keyHex;
      
      // Save verification payload
      const payload = await encryptText(JSON.stringify({ verified: true, recoveryKey }), vaultInputPin);
      const saveRes = await saveVaultItemAction({
        category: "system",
        title: "__verification__",
        encrypted_data: payload.ciphertext,
        iv: payload.iv,
        salt: payload.salt
      });
      
      if (saveRes.success) {
        setGeneratedRecoveryKey(recoveryKey);
        setVaultPin(vaultInputPin);

        // Prepopulate vault items client-side
        const prepopulated = [
          {
            category: "ssn",
            title: "Primary SSN (Sample)",
            fields: { ssn_number: "XXX-XX-6789", fullName: "Sanjaya Ghimire" }
          },
          {
            category: "driver_license",
            title: "Driver's License (Sample)",
            fields: { license_number: "DL-987654321", state: "NC", expiration: "12/31/2030" }
          },
          {
            category: "bank_account",
            title: "Chase Checking (Sample)",
            fields: { bank_name: "Chase Bank", account_type: "checking", routing_number: "021000021", account_number: "******1234" }
          },
          {
            category: "password",
            title: "GitHub Account (Sample)",
            fields: { website: "https://github.com", username: "sghimire", password: "gH8#kL9$mN2!" }
          }
        ];

        for (const item of prepopulated) {
          try {
            const encrypted = await encryptText(JSON.stringify(item.fields), vaultInputPin);
            await saveVaultItemAction({
              category: item.category,
              title: item.title,
              encrypted_data: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt
            });
          } catch (err) {
            console.error("Failed to save prepopulated item:", item.title, err);
          }
        }
      } else {
        setVaultError(saveRes.message);
      }
    } catch (err: any) {
      setVaultError(err.message || "Failed to set up private vault.");
    } finally {
      setIsVaultLoading(false);
    }
  };

  const handleConfirmRecoveryKey = () => {
    setHasSavedRecoveryKey(true);
    setIsVaultUnlocked(true);
    setIsVaultSetup(true);
    setVaultSuccess("Private Vault successfully initialized!");
    setVaultInputPin("");
    setVaultConfirmPin("");
    loadVaultItems();
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    setVaultSuccess(null);
    setIsVaultLoading(true);
    
    try {
      const verificationRow = vaultItems.find(item => item.category === "system" && item.title === "__verification__");
      if (!verificationRow) {
        setVaultError("Vault not set up.");
        return;
      }
      
      const decryptedText = await decryptText({
        ciphertext: verificationRow.encrypted_data,
        iv: verificationRow.iv,
        salt: verificationRow.salt
      }, vaultInputPin);
      
      const parsed = JSON.parse(decryptedText);
      if (parsed && parsed.verified) {
        setVaultPin(vaultInputPin);
        setIsVaultUnlocked(true);
        setVaultSuccess("Vault unlocked!");
        setVaultInputPin("");
        
        // Decrypt items
        const decryptedList = [];
        for (const item of vaultItems) {
          if (item.category === "system") continue;
          try {
            const decText = await decryptText({
              ciphertext: item.encrypted_data,
              iv: item.iv,
              salt: item.salt
            }, vaultInputPin);
            decryptedList.push({
              ...item,
              decryptedData: JSON.parse(decText)
            });
          } catch (err) {
            console.error("Failed to decrypt item:", item.title, err);
          }
        }
        setDecryptedVaultItems(decryptedList);
      } else {
        setVaultError("Invalid Vault PIN.");
      }
    } catch (err: any) {
      setVaultError("Incorrect Vault PIN. Decryption verification failed.");
    } finally {
      setIsVaultLoading(false);
    }
  };

  const handleLockVault = () => {
    setVaultPin("");
    setIsVaultUnlocked(false);
    setDecryptedVaultItems([]);
    setVaultSuccess("Vault locked.");
  };

  const handleSaveVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    setVaultSuccess(null);
    
    if (!vaultTitle.trim()) {
      setVaultError("Please enter a title.");
      return;
    }

    setIsVaultLoading(true);
    try {
      const plaintext = JSON.stringify(vaultFields);
      const payload = await encryptText(plaintext, vaultPin);
      
      const saveRes = await saveVaultItemAction({
        id: editingVaultItem?.id,
        category: vaultCategory,
        title: vaultTitle.trim(),
        encrypted_data: payload.ciphertext,
        iv: payload.iv,
        salt: payload.salt
      });
      
      if (saveRes.success) {
        setVaultSuccess(saveRes.message);
        setShowVaultAddModal(false);
        setEditingVaultItem(null);
        setVaultTitle("");
        setVaultFields({});
        await loadVaultItems();
      } else {
        setVaultError(saveRes.message);
      }
    } catch (err: any) {
      setVaultError(err.message || "Failed to save vault item.");
    } finally {
      setIsVaultLoading(false);
    }
  };

  const handleEditVaultItem = (item: any) => {
    setEditingVaultItem(item);
    setVaultCategory(item.category);
    setVaultTitle(item.title);
    setVaultFields(item.decryptedData || {});
    setVaultError(null);
    setVaultSuccess(null);
    setShowVaultAddModal(true);
  };

  const handleDeleteVaultItem = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this secret?")) return;
    setVaultError(null);
    setVaultSuccess(null);
    setIsVaultLoading(true);
    
    try {
      const delRes = await deleteVaultItemAction(id);
      if (delRes.success) {
        setVaultSuccess(delRes.message);
        await loadVaultItems();
      } else {
        setVaultError(delRes.message);
      }
    } catch (err: any) {
      setVaultError(err.message || "Failed to delete vault item.");
    } finally {
      setIsVaultLoading(false);
    }
  };

  const toggleRevealVaultItem = (id: string) => {
    setRevealedVaultItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await provisionCloudflareRouteAction();
    setCfResult(res as any);
    setCfLoading(false);
    if (res.success) {
      setSuccessMsg(res.message);
      await loadData();
    } else {
      setErrorMsg(res.message);
    }
  };
  const profileUrl = typeof window !== "undefined"
    ? window.location.origin + "/" + (profile?.phone_number || "").replace("+", "")
    : "https://numid.dev/" + (profile?.phone_number || "").replace("+", "");

  const isEmailUnset = !profile?.destination_email || profile.destination_email === profile.numid_address || profile.destination_email.endsWith("@numid.us");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const vaultUrl = typeof window !== "undefined"
    ? window.location.origin + "/v/" + (profile?.phone_number || "").replace("+", "")
    : "https://numid.dev/v/" + (profile?.phone_number || "").replace("+", "");

  const handleCopyVaultLink = () => {
    navigator.clipboard.writeText(vaultUrl);
    setCopiedVaultLink(true);
    setTimeout(() => setCopiedVaultLink(false), 2000);
  };

  const handleDownloadVaultQR = async () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(vaultUrl)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `numid-vault-qr-${(profile?.phone_number || "").replace("+", "")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download Vault QR code image", err);
    }
  };

  const handleDownloadQR = async () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `numid-qr-${(profile?.phone_number || "").replace("+", "")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download QR code image", err);
    }
  };

  const handleShareContact = async () => {
    if (!profile) return;
    const formattedPhone = profile.phone_number;
    const notesArr: string[] = ["NumID Verified Profile"];
    if (socialLinks) {
      Object.entries(socialLinks).forEach(([key, val]) => {
        if (val && val.trim() !== "") {
          notesArr.push(`${key}: ${val}`);
        }
      });
    }
    const notesStr = notesArr.join("\\n");

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const vcardLines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
    ];

    if (fullName) {
      vcardLines.push(`FN:${fullName}`);
      vcardLines.push(`N:${lastName || ""};${firstName || ""};;;`);
    } else {
      vcardLines.push(`FN:${profile.numid_address}`);
    }

    vcardLines.push(
      `TEL;TYPE=CELL,VOICE:${formattedPhone}`,
      `EMAIL;TYPE=PREF,INTERNET:${profile.numid_address}`,
      `URL:${profileUrl}`
    );

    if (profile.avatar_url) {
      vcardLines.push(`PHOTO;VALUE=URI;TYPE=JPEG:${profile.avatar_url}`);
    }

    vcardLines.push(`NOTE:${notesStr}`);
    vcardLines.push("END:VCARD");

    const vcardText = vcardLines.join("\r\n");
    const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8;" });
    const file = new File([blob], `${profile.phone_number.replace("+", "")}.vcf`, { type: "text/vcard" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${profile.numid_address} Contact`,
          text: `Add ${profile.numid_address} to contacts`,
        });
        return;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Web Share failed:", err);
        } else {
          return;
        }
      }
    }

    const link = document.createElement("a");
    const url = window.URL.createObjectURL(blob);
    link.href = url;
    link.download = `${profile.phone_number.replace("+", "")}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
      setPrivateProfiles(res.profile?.private_profiles || []);
      setFirstName(res.profile?.first_name || "");
      setLastName(res.profile?.last_name || "");
      setAuditLogs(res.auditLogs || []);
      if (res.message) {
        setSuccessMsg(res.message);
      }
      if (res.error) {
        setErrorMsg(res.error);
      }
      
      // Fetch invitations
      const invitesRes = await getInvitationsAction();
      if (invitesRes.success && invitesRes.invitations) {
        setInvitations(invitesRes.invitations);
      }

      // Fetch vault items to check setup status
      const vaultRes = await fetchVaultItemsAction();
      if (vaultRes.success && vaultRes.items) {
        setVaultItems(vaultRes.items);
        const verificationRow = vaultRes.items.find(item => item.category === "system" && item.title === "__verification__");
        setIsVaultSetup(!!verificationRow);
      } else {
        setIsVaultSetup(false);
      }
    } else {
      setErrorMsg(res.message || "Failed to load dashboard statistics");
    }
    setLoading(false);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePhone || !inviteEmail) {
      setErrorMsg("Both phone number and email are required to send an invitation.");
      return;
    }
    setInviteSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await sendInvitationAction(invitePhone, inviteEmail);
      if (res.success) {
        setSuccessMsg(res.message);
        setInvitePhone("");
        setInviteEmail("");
        // Reload invitations list
        const invitesRes = await getInvitationsAction();
        if (invitesRes.success && invitesRes.invitations) {
          setInvitations(invitesRes.invitations);
        }
      } else {
        setErrorMsg(res.message || "Failed to send invitation.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send invitation.");
    } finally {
      setInviteSending(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const resolvedEmail = resolveNumidEmail(loginEmail);
      const { error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
      } else {
        // Log sign-in to audit logs
        await logSignInAction().catch(err => console.error("Failed to log sign-in:", err));
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation: image files only
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Only image files are allowed.");
      return;
    }

    // Size limit: 2MB
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size must be less than 2MB.");
      return;
    }

    setAvatarLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await uploadAvatarAction(formData);
      if (res.success) {
        setSuccessMsg(res.message || "Avatar updated successfully!");
        setProfile((prev: any) => ({
          ...prev,
          avatar_url: res.avatarUrl,
          avatar_updated_at: res.avatarUpdatedAt,
        }));
      } else {
        setErrorMsg(res.message || "Failed to upload avatar.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during upload.");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveDestinationEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newEmail) return;

    startTransition(async () => {
      const res = await saveDestinationEmailAction(newEmail);
      if (res.success) {
        setSuccessMsg(res.message);
        await loadData();
      } else {
        setErrorMsg(res.message);
      }
    });
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
      const res = await updateSocialProfilesAction(socialLinks, firstName, lastName, privateProfiles);
      if (res.success) {
        setSuccessMsg(res.message);
        await loadData();
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleToggleVisibility = (key: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const updatedPrivate = privateProfiles.includes(key)
      ? privateProfiles.filter((k) => k !== key)
      : [...privateProfiles, key];

    setPrivateProfiles(updatedPrivate);

    startTransition(async () => {
      const res = await updateSocialProfilesAction(socialLinks, firstName, lastName, updatedPrivate);
      if (res.success) {
        setSuccessMsg("Visibility updated successfully!");
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
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center items-center text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs">Securing database connection...</p>
      </div>
    );
  }

  // FALLBACK: Sign In Screen
  if (isAuthenticated === false) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-6 py-12 overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-900/5 dark:bg-indigo-950/10 blur-[120px] pointer-events-none" />

        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <Link href="/" className="flex items-center space-x-2 mb-8">
          <img src="/logo.png" alt="NumID Logo" className="w-8 h-8 object-contain rounded-lg" />
          <span className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
            Num<span className="text-indigo-650 dark:text-indigo-400">ID</span>
          </span>
        </Link>

        <div className="w-full max-w-md bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          <div className="text-left mb-6">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
            <p className="text-xs text-slate-505 dark:text-slate-400">Sign in to manage your NumID email routing rules.</p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">NumID Email</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="your-phone@numid.us"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wide">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-505 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 mt-6 shadow-lg shadow-indigo-600/10"
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

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Don't have a NumID? <Link href="/signup" className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold">Sign Up</Link>
          </div>
        </div>
      </div>
    );
  }

  // MAIN: Dashboard View
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Header bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/5 bg-white/60 dark:bg-black/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center">
              <img src="/logo.png" alt="NumID Logo" className="w-8 h-8 object-contain rounded-lg" />
            </Link>
            <span className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Num<span className="text-indigo-600 dark:text-indigo-400">ID</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="text-xs bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-205 dark:border-indigo-500/20 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </Link>
            )}

            <div className="hidden sm:flex items-center space-x-2 text-slate-600 dark:text-slate-400 text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-full px-3.5 py-1.5">
              <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-505" />
              <span>{profile?.destination_email}</span>
            </div>

            <ThemeToggle />

            <button 
              onClick={handleSignOut}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
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
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2.5">
            <ShieldAlert className="w-4.5 h-4.5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-800 dark:text-red-200">Execution Error</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-750 dark:text-indigo-300 text-xs flex items-start space-x-2.5">
            <CheckCircle className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-grow">
              <p className="font-bold text-indigo-850 dark:text-indigo-200">Status Update</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {isEmailUnset ? (
          <div className="max-w-md mx-auto p-6 sm:p-8 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-indigo-650/[0.03] dark:bg-indigo-600/5 blur-[50px] pointer-events-none" />
            
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Mail className="w-6 h-6 animate-pulse" />
              </div>
              
              <div>
                <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl">Set Forwarding Destination</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Incoming mail to your NumID <strong className="font-mono text-indigo-600 dark:text-indigo-400">{profile?.numid_address}</strong> will be forwarded to your private inbox.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDestinationEmail} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Destination Email</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-relaxed">
                  Cloudflare will forward all incoming emails here. Verification link will be sent to this email.
                </span>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Save & Register Routing</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Warning Popup Banner if Cloudflare is not verified */}
            {(profile?.status === "pending" || !profile?.email_verified) && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-550 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0 animate-bounce" />
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-255 animate-pulse">Email Forwarding Pending Cloudflare Verification</p>
                    <p className="mt-0.5 leading-relaxed">
                      Cloudflare has sent a verification email to <strong className="font-mono text-slate-900 dark:text-white">{profile?.destination_email}</strong>. Please check your inbox and click their verification link to activate email forwarding.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
                  {process.env.NEXT_PUBLIC_MOCK_APIS === "true" && (
                    <button
                      onClick={handleMockVerify}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg bg-amber-105 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-850 dark:text-amber-200 text-[11px] font-bold border border-amber-250 dark:border-amber-500/30 transition-all cursor-pointer"
                    >
                      Simulate Verify
                    </button>
                  )}
                  <button
                    onClick={handleCheckCloudflare}
                    disabled={isPending}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-605 hover:bg-amber-550 active:bg-amber-700 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    <span>Check Status</span>
                  </button>
                </div>
              </div>
            )}

{/* 1. Main Configuration Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              
              {/* Forwarding Status Card (Left block) */}
              <div className="md:col-span-2 p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 relative overflow-hidden flex flex-col justify-between shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-indigo-650/[0.03] dark:bg-indigo-600/5 blur-[50px] pointer-events-none" />

                <div>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      {/* Avatar Upload Circle */}
                      <div 
                        onClick={handleAvatarClick}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center cursor-pointer overflow-hidden group transition-all hover:border-indigo-500/50 shrink-0"
                        title="Upload Avatar (JPEG only, max 2MB)"
                      >
                        {avatarLoading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                        
                        {profile?.avatar_url ? (
                          <img 
                            src={`${profile.avatar_url}?t=${profile.avatar_updated_at ? new Date(profile.avatar_updated_at).getTime() : Date.now()}`}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-display font-bold text-xl sm:text-2xl">
                            {profile?.numid_address ? profile.numid_address.substring(0, 1).toUpperCase() : <User className="w-8 h-8 opacity-60" />}
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity duration-200">
                          <Camera className="w-4 h-4 mb-0.5" />
                          <span>Change</span>
                        </div>
                      </div>

                      {/* Hidden File Input */}
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />

                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-505 dark:text-slate-400 tracking-wider">My NumID</span>
                        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-1 select-all hover:text-indigo-650 dark:hover:text-indigo-300 transition-colors">
                          {profile?.numid_address?.replace("+", "")}
                        </h2>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide ${(profile?.phone_verified && profile?.email_verified) || profile?.status === "active" ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30" : "bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30"}`}>
                      {(profile?.phone_verified && profile?.email_verified) || profile?.status === "active" ? "VERIFIED" : (profile?.status?.toUpperCase() || "PENDING")}
                    </span>
                  </div>

                  {/* Status details row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/5 pt-6 mt-6">
                    <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.phone_verified ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400"}`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Verified Phone</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-slate-900 dark:text-white font-medium">{profile?.phone_number}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${profile?.phone_verified ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                            {profile?.phone_verified ? "Verified" : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile?.email_verified ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400"}`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-505 dark:text-slate-400 uppercase font-bold">Destination Email</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-slate-900 dark:text-white font-medium truncate max-w-[110px] xs:max-w-[165px] sm:max-w-none">{profile?.destination_email}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${profile?.email_verified ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-500/20 text-red-750 dark:text-red-300"}`}>
                            {profile?.email_verified ? "Verified" : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions panel */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 border-t border-slate-200 dark:border-white/5 pt-6 w-full sm:w-auto">
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
                    <>
                      <button
                        onClick={handleProvisionCloudflare}
                        disabled={isPending || cfLoading}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer"
                      >
                        {cfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>Enable Email Forward</span>
                      </button>

                      <button
                        onClick={handleCheckCloudflare}
                        disabled={isPending}
                        className="w-full sm:w-auto bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>Check Cloudflare Status</span>
                      </button>
                    </>
                  )}
                </div>

              </div>

              {/* Verification Indicators Panel (Right block) */}
              <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 flex flex-col justify-between shadow-sm dark:shadow-none">
                <div>
                  <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg mb-4">Verification Checklists</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Both verification checkmarks must be green to activate email forwarding routes.</p>
                  
                  <div className="space-y-4">
                    
                    {/* Phone Item */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Phone Verified</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${profile?.phone_verified ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                        {profile?.phone_verified ? "Verified" : "Pending"}
                      </span>
                    </div>

                    {/* Email Item */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Email Verified</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${profile?.email_verified ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                        {profile?.email_verified ? "Verified" : "Pending"}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Created date information */}
                <div className="text-[10px] text-slate-500 dark:text-slate-450 uppercase font-bold tracking-wider mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
                  Created at: {profile ? new Date(profile.created_at).toLocaleDateString() : ""}
                </div>
              </div>

            </div>

            {/* Public Identity Profile Card */}
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400">
                    <Share2 className="w-5 h-5" />
                    <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Public Identity Profile</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Configure your social networks and contact links.{" "}
                    {profile?.status === "active" ? (
                      <>
                        Your profile is live at{" "}
                        <Link
                          href={`/${profile?.phone_number?.replace("+", "")}`}
                          target="_blank"
                          className="text-indigo-655 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold underline inline-flex items-center gap-1"
                        >
                          <span>numid.dev/{profile?.phone_number?.replace("+", "")}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </>
                    ) : (
                      <>
                        Your profile will be live at{" "}
                        <span className="font-semibold text-slate-600 dark:text-slate-400">
                          numid.dev/{profile?.phone_number?.replace("+", "")}
                        </span>{" "}
                        once forwarding is verified.
                      </>
                    )}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="w-full sm:w-auto border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Share Profile</span>
                  </button>
                  
                  <button
                    onClick={handleSaveSocialLinks}
                    disabled={isPending}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-555 active:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Profile</span>
                  </button>
                </div>
              </div>

              {/* Optional Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 block mb-2 uppercase tracking-wide">First Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-900/60 border border-slate-205 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 block mb-2 uppercase tracking-wide">Last Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-900/60 border border-slate-205 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Tab buttons */}
              <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-white/5 gap-1 -mx-5 sm:mx-0 px-5 sm:px-0">
                {(Object.keys(PROFILE_CATEGORIES) as ProfileCategoryKey[]).map((tabKey) => (
                  <button
                    key={tabKey}
                    onClick={() => setActiveProfileTab(tabKey)}
                    className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                      activeProfileTab === tabKey
                        ? "border-indigo-500 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900/50"
                        : "border-transparent text-slate-505 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {PROFILE_CATEGORIES[tabKey].title}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
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
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/40 cursor-pointer"
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
                    <span className="text-[10px] text-slate-400 dark:text-slate-555 font-bold uppercase tracking-wide">
                      All active links added
                    </span>
                  )}
                </div>

                {/* Configured fields list */}
                {Object.keys(PROFILE_CATEGORIES[activeProfileTab].services).filter(
                  (key) => socialLinks[key] !== undefined
                ).length === 0 ? (
                  <div className="text-center py-8 rounded-2xl bg-slate-50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-white/5 text-xs text-slate-500">
                    No links added in this category yet. Select a service above to add it.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(PROFILE_CATEGORIES[activeProfileTab].services)
                      .filter(([key]) => socialLinks[key] !== undefined)
                      .map(([key, service]) => (
                        <div
                          key={key}
                          className="flex items-center gap-3 bg-slate-55 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs focus-within:border-indigo-500/30 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0">
                            {service.name.substring(0, 2)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <label className="text-[10px] text-slate-500 dark:text-slate-550 font-bold uppercase block mb-1">
                              {service.name}
                            </label>
                            <div className="flex flex-wrap items-center gap-y-1">
                              {service.prefix && (
                                <span className="text-slate-550 select-none pr-1.5 font-mono text-[11px] max-w-[120px] sm:max-w-none truncate shrink-0">
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
                                className="bg-transparent border-none p-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 flex-1 min-w-[120px] font-mono text-xs"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(key)}
                            className={`p-2 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                              privateProfiles.includes(key)
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                            title={privateProfiles.includes(key) ? "Click to make Public" : "Click to make Private"}
                          >
                            {privateProfiles.includes(key) ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Private</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Public</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setSocialLinks((prev) => {
                                const updated = { ...prev };
                                delete updated[key];
                                return updated;
                              });
                              setPrivateProfiles((prev) => prev.filter((k) => k !== key));
                            }}
                            className="p-2 text-slate-400 dark:text-slate-505 hover:text-red-655 dark:hover:text-red-400 rounded-lg hover:bg-red-500/5 dark:hover:bg-red-500/10 transition-all shrink-0"
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

            {/* Private Identity Profile (E2EE Vault) Card */}
            <div className="md:col-span-2 p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none space-y-6">
              
              {/* Vault Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400">
                    <Lock className="w-5 h-5" />
                    <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Private Identity Profile</h3>
                  </div>
                  <p className="text-xs text-slate-505 dark:text-slate-400 mt-1">
                    Store sensitive records (SSN, licenses, bank details, credentials) with zero-knowledge, client-side encryption.
                  </p>
                </div>
                {isVaultUnlocked && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowVaultShareModal(true)}
                      className="px-3.5 py-1.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-slate-505 dark:text-slate-400" />
                      <span>Share Vault QR</span>
                    </button>
                    
                    <button
                      onClick={handleLockVault}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/5 transition-all flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lock Vault</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Vault Error/Success Messages */}
              {vaultError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{vaultError}</span>
                </div>
              )}
              {vaultSuccess && (
                <div className="p-4 rounded-xl bg-indigo-505/10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-750 dark:text-indigo-300 text-xs flex items-start gap-2 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span>{vaultSuccess}</span>
                </div>
              )}

              {/* 1. Setup Phase */}
              {isVaultSetup === false && !generatedRecoveryKey && (
                <form onSubmit={handleSetupVault} className="space-y-4 max-w-md">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-xs text-slate-700 dark:text-slate-350">
                    <p className="font-bold text-indigo-650 dark:text-indigo-400 mb-1">🔐 Initialize Your E2EE Vault</p>
                    <p className="leading-relaxed">Set a Master PIN or password to secure your secrets. All encryption is performed directly in your browser. We never store or transmit your password.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Set Vault PIN / Password</label>
                      <input
                        type="password"
                        placeholder="••••••"
                        value={vaultInputPin}
                        onChange={(e) => setVaultInputPin(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Confirm PIN / Password</label>
                      <input
                        type="password"
                        placeholder="••••••"
                        value={vaultConfirmPin}
                        onChange={(e) => setVaultConfirmPin(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVaultLoading}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
                  >
                    {isVaultLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Initialize Private Vault</span>
                  </button>
                </form>
              )}

              {/* 1b. Recovery Key Display Phase */}
              {isVaultSetup === false && generatedRecoveryKey && (
                <div className="space-y-4 max-w-lg">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-slate-700 dark:text-slate-350">
                    <p className="font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Crucial Security Action Required!</p>
                    <p className="leading-relaxed">This is your vault recovery key. Since your credentials are end-to-end encrypted, this is the **ONLY** way to reset your vault if you forget your PIN. Store it in a physical notebook or password manager.</p>
                  </div>

                  <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-sm text-center text-slate-900 dark:text-white font-bold tracking-wider select-all">
                    {generatedRecoveryKey}
                  </div>

                  <button
                    onClick={handleConfirmRecoveryKey}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-505 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <span>I Have Safely Saved My Recovery Key</span>
                  </button>
                </div>
              )}

              {/* 2. Locked Vault Phase */}
              {isVaultSetup === true && isVaultUnlocked === false && (
                <form onSubmit={handleUnlockVault} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">Enter Vault Master PIN / Password</label>
                    <div className="relative flex items-center">
                      <input
                        type="password"
                        placeholder="••••••"
                        value={vaultInputPin}
                        onChange={(e) => setVaultInputPin(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVaultLoading}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    {isVaultLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>Unlock Private Profile</span>
                  </button>
                </form>
              )}

              {/* 3. Unlocked Vault Directory Phase */}
              {isVaultSetup === true && isVaultUnlocked === true && (
                <div className="space-y-6">
                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {VAULT_CATEGORIES.filter(c => c.key !== "system").map((cat) => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setVaultCategory(cat.key)}
                          className={`px-3 py-1.5 rounded-xl border transition-all ${
                            vaultCategory === cat.key
                              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-bold"
                              : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 border-slate-200 dark:border-white/5"
                          }`}
                        >
                          {cat.title.split(" (")[0]}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingVaultItem(null);
                        setVaultTitle("");
                        setVaultFields({});
                        setShowVaultAddModal(true);
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Entry</span>
                    </button>
                  </div>

                  {/* Secret Directory List */}
                  {decryptedVaultItems.filter(item => vaultCategory === "ssn" || item.category === vaultCategory).length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                      No encrypted secrets stored in this category yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {decryptedVaultItems
                        .filter(item => vaultCategory === "ssn" || item.category === vaultCategory)
                        .map((item) => {
                          const isRevealed = revealedVaultItemIds.includes(item.id);
                          
                          return (
                            <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-white/10 transition-all flex flex-col justify-between space-y-4">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                      {item.category === "bank_account" ? <CreditCard className="w-4 h-4" /> : item.category === "password" || item.category === "passkey" ? <Key className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                    </div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[150px]">{item.title}</h4>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleRevealVaultItem(item.id)}
                                      className="p-1.5 text-slate-400 dark:text-slate-555 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                      title={isRevealed ? "Mask secret" : "Reveal secret"}
                                    >
                                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditVaultItem(item)}
                                      className="p-1.5 text-slate-400 dark:text-slate-505 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                      title="Edit secret"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVaultItem(item.id)}
                                      className="p-1.5 text-slate-400 dark:text-slate-505 hover:text-red-655 dark:hover:text-red-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                      title="Delete secret"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 space-y-2 text-xs border-t border-slate-200 dark:border-white/5 pt-3">
                                  {Object.entries(item.decryptedData || {}).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 truncate max-w-[80px]" title={key}>{key.replace(/_/g, " ")}</span>
                                      <div className="flex items-center space-x-1.5 shrink-0 max-w-[180px]">
                                        <span className="font-mono text-slate-800 dark:text-slate-350 truncate">
                                          {isRevealed ? (val as string) : "••••••••"}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(val as string);
                                            alert("Copied to clipboard!");
                                          }}
                                          className="p-1 text-slate-400 dark:text-slate-505 hover:text-slate-750 dark:hover:text-white rounded transition-colors shrink-0"
                                          title="Copy value"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="text-[9px] text-slate-400 dark:text-slate-505 border-t border-slate-200 dark:border-white/5 pt-2 flex justify-between items-center">
                                <span>Encrypted E2EE</span>
                                <span>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ""}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Invite a Friend Card */}
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400">
                    <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Invite a Friend</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Invite your friends to claim their NumID by entering their phone number and destination email.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 block mb-2 uppercase tracking-wide">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +15155550100"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-900/60 border border-slate-205 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 block mb-2 uppercase tracking-wide">Destination Email</label>
                  <input
                    type="email"
                    placeholder="e.g. friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-900/60 border border-slate-205 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviteSending}
                  className="bg-indigo-600 hover:bg-indigo-555 active:bg-indigo-700 disabled:bg-indigo-650/50 text-white text-xs font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto h-[40px]"
                >
                  {inviteSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Send Invitation</span>
                </button>
              </form>

              {/* Sent Invitations List */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
                <h4 className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Sent Invitations</h4>
                
                {invitations.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-550 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                    No invitations sent yet. Invite someone using the form above!
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-white/5 text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-250 dark:divide-white/5 bg-white dark:bg-slate-950/40">
                        {invitations.map((invite) => {
                          const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://numid.dev";
                          const fullInviteLink = `${siteUrl}/signup?invite=${invite.id}`;
                          
                          return (
                            <tr key={invite.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                              <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white select-all">{invite.phone_number}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{invite.email}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${
                                  invite.status === "accepted" 
                                    ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                    : invite.status === "expired"
                                    ? "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                                    : "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                }`}>
                                  {invite.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {invite.status === "pending" ? (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(fullInviteLink);
                                      setCopiedInviteId(invite.id);
                                      setTimeout(() => setCopiedInviteId(null), 2000);
                                    }}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                                    title="Copy signup link to clipboard"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{copiedInviteId === invite.id ? "Copied!" : "Copy Link"}</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600 italic">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Sandbox Testing Console (Visible if in Mock Mode) */}
            {process.env.NEXT_PUBLIC_MOCK_APIS === "true" && (
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 shadow-sm relative">
                <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400 mb-2">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <h3 className="font-display font-bold text-slate-900 dark:text-white text-md">Mock Sandbox Console</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">You are running the application in <strong>Mock Mode</strong>. Click below to simulate user clicking Cloudflare's email verification link.</p>
                
                <button
                  onClick={handleMockVerify}
                  disabled={isPending}
                  className="w-full sm:w-auto bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-600/30 dark:hover:bg-indigo-600/40 text-indigo-750 dark:text-indigo-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simulate Cloudflare Email Link Verification Click</span>
                </button>
              </div>
            )}

            {/* 2b. Cloudflare Dev Console — always visible for testing */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-orange-50/10 dark:bg-slate-900/60 border border-orange-200 dark:border-orange-500/20 shadow-sm relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-orange-650 dark:text-orange-400" />
                  <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm">Cloudflare Email Routing Dev Console</h3>
                </div>
                <span className="w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 uppercase tracking-wider">
                  {process.env.NEXT_PUBLIC_MOCK_APIS === "true" ? "Mock Mode" : "Live"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Use these controls to validate your Cloudflare credentials and manually trigger email routing provisioning for your account.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button
                  id="cf-test-btn"
                  onClick={handleTestCloudflare}
                  disabled={cfLoading}
                  className="w-full sm:w-auto bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  {cfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />}
                  <span>Test Cloudflare Connection</span>
                </button>

                <button
                  id="cf-provision-btn"
                  onClick={handleProvisionCloudflare}
                  disabled={cfLoading}
                  className="w-full sm:w-auto bg-orange-50 hover:bg-orange-100 dark:bg-orange-600/20 dark:hover:bg-orange-600/30 text-orange-700 dark:text-orange-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-orange-200 dark:border-orange-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  {cfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Provision My Route Now</span>
                </button>
              </div>

              {cfResult && (
                <div className={`rounded-xl p-4 border text-xs space-y-2 ${
                  cfResult.success
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-250 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-red-50 dark:bg-red-500/10 border-red-250 dark:border-red-500/20 text-red-800 dark:text-red-300"
                }`}>
                  <p className="font-semibold">{cfResult.message}</p>
                  {cfResult.detail && (
                    <pre className="text-[10px] font-mono text-slate-650 dark:text-slate-400 bg-slate-100 dark:bg-black/20 rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(cfResult.detail, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* 3. History Logs Timeline */}
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <div className="flex items-center space-x-2.5 mb-6">
                <History className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Audit Trails</h3>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No recent audit trail logs available.
                </div>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-white/5 ml-3 pl-4 space-y-6">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative text-left">
                      {/* Timeline point */}
                      <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-700" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-650 dark:text-slate-400">
                        <span className="font-semibold text-slate-850 dark:text-slate-300 uppercase tracking-wider">{log.action.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 sm:mt-0">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <pre className="mt-2 p-3 rounded-lg bg-slate-55 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-[10px] font-mono text-slate-600 dark:text-slate-500 overflow-x-auto max-w-full">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Settings & Account deletion panel (Danger Zone) */}
            <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-6 shadow-sm dark:shadow-none">
              <div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-md">Danger & Support Zone</h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">Export your configurations or delete the account mapping permanently.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleExportData}
                  disabled={isPending}
                  className="w-full sm:w-auto bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Account JSON</span>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full sm:w-auto bg-red-55 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-750 dark:text-red-400 text-xs font-semibold px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </>
        )}

      </main>

      {/* DIALOG: Add Vault Entry */}
      {showVaultAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-955 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-scaleIn">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg mb-2">{editingVaultItem ? "Edit Encrypted Secret" : "Add Encrypted Secret"}</h3>
            
            <form onSubmit={handleSaveVaultItem} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Category</label>
                <select
                  value={vaultCategory}
                  onChange={(e) => {
                    setVaultCategory(e.target.value);
                    setVaultFields({});
                  }}
                  disabled={!!editingVaultItem}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {VAULT_CATEGORIES.filter(c => c.key !== "system").map((c) => (
                    <option key={c.key} value={c.key}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Record Description / Title</label>
                <input
                  type="text"
                  placeholder="e.g. My Personal SSN, Chase Savings Account"
                  value={vaultTitle}
                  onChange={(e) => setVaultTitle(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              {/* Dynamic Category Specific Inputs */}
              {vaultCategory === "ssn" && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Social Security Number</label>
                    <input
                      type="text"
                      placeholder="000-00-0000"
                      value={vaultFields.ssn_number || ""}
                      onChange={(e) => setVaultFields(prev => ({ ...prev, ssn_number: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Full Name on Card</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={vaultFields.fullName || ""}
                      onChange={(e) => setVaultFields(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {vaultCategory === "driver_license" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">License Number</label>
                      <input
                        type="text"
                        placeholder="T1234567"
                        value={vaultFields.license_number || ""}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, license_number: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Issuing State</label>
                      <input
                        type="text"
                        placeholder="NC"
                        value={vaultFields.state || ""}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Expiration Date</label>
                    <input
                      type="text"
                      placeholder="MM/DD/YYYY"
                      value={vaultFields.expiration || ""}
                      onChange={(e) => setVaultFields(prev => ({ ...prev, expiration: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                      required
                    />
                  </div>
                </>
              )}

              {vaultCategory === "bank_account" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Bank Name</label>
                      <input
                        type="text"
                        placeholder="Chase"
                        value={vaultFields.bank_name || ""}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, bank_name: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Account Type</label>
                      <select
                        value={vaultFields.account_type || "checking"}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, account_type: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Routing Number</label>
                      <input
                        type="text"
                        placeholder="021000021"
                        value={vaultFields.routing_number || ""}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, routing_number: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Account Number</label>
                      <input
                        type="text"
                        placeholder="123456789"
                        value={vaultFields.account_number || ""}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, account_number: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {vaultCategory === "password" && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Website / Service URL</label>
                    <input
                      type="text"
                      placeholder="https://github.com"
                      value={vaultFields.website || ""}
                      onChange={(e) => setVaultFields(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Username / Email</label>
                      <input
                        type="text"
                        placeholder="user@example.com"
                        value={vaultFields.username || ""}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={vaultFields.password || ""}
                        onChange={(e) => setVaultFields(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {vaultCategory === "passkey" && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Service Name</label>
                    <input
                      type="text"
                      placeholder="e.g. AWS Console, Google Account"
                      value={vaultFields.website || ""}
                      onChange={(e) => setVaultFields(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Passkey Secret Value</label>
                    <textarea
                      placeholder="Paste your base64 or raw passkey secret key here..."
                      value={vaultFields.passkey_value || ""}
                      onChange={(e) => setVaultFields(prev => ({ ...prev, passkey_value: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none font-mono h-20 resize-none"
                      required
                    />
                  </div>
                </>
              )}

              {vaultCategory === "other" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 block mb-2 uppercase tracking-wide">Secret Details / Note</label>
                  <textarea
                    placeholder="Enter private notes or secure credentials..."
                    value={vaultFields.note || ""}
                    onChange={(e) => setVaultFields(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none font-mono h-24 resize-none"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowVaultAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVaultLoading}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                >
                  {isVaultLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{editingVaultItem ? "Save Changes" : "Save Secret"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 1: Update email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-scaleIn">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg mb-2">Update Destination Email</h3>
            
            {emailModalPhase === "ENTER_EMAIL" ? (
              <form onSubmit={handleSendEmailOTP} className="space-y-4">
                <p className="text-xs text-slate-550 dark:text-slate-400">Enter your new forwarding address. We will send a verification code to this inbox.</p>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 block mb-2 uppercase tracking-wide">New Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl text-[10px] text-orange-700 dark:text-orange-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>Warning: Forwarding will temporarily pause until both NumID is verified and Cloudflare's own routing email link is approved.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
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
                <div className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 dark:text-slate-505 dark:hover:text-white transition-colors cursor-pointer text-[10px] font-semibold" onClick={() => setEmailModalPhase("ENTER_EMAIL")}>
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change email address</span>
                </div>
                
                <p className="text-xs text-slate-550 dark:text-slate-400">We've sent a 6-digit verification code to <span className="text-slate-900 dark:text-white font-semibold">{newEmail}</span>.</p>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-550 dark:text-slate-450 block mb-2 uppercase tracking-wide">Enter Code</label>
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={newEmailOtp}
                    onChange={(e) => setNewEmailOtp(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none tracking-widest text-center text-lg font-mono"
                    required
                  />
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/40 border border-slate-250 dark:border-white/5 rounded-xl p-3 text-[10px] text-slate-650 dark:text-slate-400">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">💡 Local Sandbox Tip:</span> Check server logs for the OTP or enter <code className="font-mono text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">123456</code>.
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-red-200 dark:border-red-500/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-2 text-red-650 dark:text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Teardown Mapping Permanently?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              This action is irreversible. All of your forwards to <strong className="text-slate-900 dark:text-white font-mono">{profile?.numid_address}</strong> will fail immediately, and your settings will be purged.
            </p>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
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

      {/* DIALOG 3: Share Profile Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-6 shadow-2xl animate-scaleIn flex flex-col items-center text-center">
            
            {/* Header/Title */}
            <div className="w-full flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/5 mb-6">
              <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400">
                <QrCode className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Share Profile</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold text-lg p-1 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* QR Code Graphic Container */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/5 mb-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(profileUrl)}`}
                alt="Profile QR Code"
                className="w-48 h-48 sm:w-52 sm:h-52 bg-white p-3 rounded-xl shadow-inner mx-auto select-none"
              />
            </div>

            {/* Profile Info */}
            <div className="w-full mb-6">
              <span className="inline-flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide mb-2.5">
                <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Verified NumID Profile</span>
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {profile?.numid_address ? profile.numid_address : ""}
              </p>
            </div>

            {/* Link Copy Box */}
            <div className="w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl px-3.5 py-2 mb-6 text-xs font-mono text-slate-655 dark:text-slate-350">
              <span className="truncate flex-1 text-left">{profileUrl}</span>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-905 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer shrink-0"
                title="Copy Link"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Share / AirDrop Contact Card */}
            <button
              type="button"
              onClick={handleShareContact}
              className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-500 hover:to-violet-550 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Contact Card / AirDrop</span>
            </button>

            {/* Actions Footer */}
            <div className="w-full flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>
              
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DIALOG 4: Share Vault Modal */}
      {showVaultShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-955 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-6 shadow-2xl animate-scaleIn flex flex-col items-center text-center">
            
            {/* Header/Title */}
            <div className="w-full flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/5 mb-6">
              <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400">
                <QrCode className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Share Private Vault</h3>
              </div>
              <button
                onClick={() => setShowVaultShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold text-lg p-1 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* QR Code Graphic Container */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/5 mb-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(vaultUrl)}`}
                alt="Vault QR Code"
                className="w-48 h-48 sm:w-52 sm:h-52 bg-white p-3 rounded-xl shadow-inner mx-auto select-none"
              />
            </div>

            {/* Vault Info */}
            <div className="w-full mb-6">
              <span className="inline-flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide mb-2.5">
                <Unlock className="w-3 h-3 text-emerald-650 dark:text-emerald-400 shrink-0" />
                <span>E2EE Secure Sharing</span>
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Vault: {profile?.numid_address ? profile.numid_address : ""}
              </p>
            </div>

            {/* Link Copy Box */}
            <div className="w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl px-3.5 py-2 mb-6 text-xs font-mono text-slate-655 dark:text-slate-350">
              <span className="truncate flex-1 text-left">{vaultUrl}</span>
              <button
                onClick={handleCopyVaultLink}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-905 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer shrink-0"
                title="Copy Link"
              >
                {copiedVaultLink ? (
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
                onClick={handleDownloadVaultQR}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>
              
              <button
                type="button"
                onClick={() => setShowVaultShareModal(false)}
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

import { fetchSharedVaultItemsAction } from "@/app/actions/vault";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VaultClient from "./vault-client";

interface PageProps {
  params: Promise<{ phone: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { phone } = await params;
  if (!phone) return {};

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const title = `E2EE Secure Vault | @${cleanPhone}`;
  const description = `Enter Master PIN / Password to securely decrypt and view the E2EE vault items for @${cleanPhone}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    }
  };
}

export default async function SharedVaultPage({ params }: PageProps) {
  const { phone } = await params;
  if (!phone) {
    return notFound();
  }

  const res = await fetchSharedVaultItemsAction(phone);

  if (!res.success || !res.items || !res.profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-6 text-center font-sans">
        <div className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] rounded-full bg-red-500/[0.02] blur-[40px] pointer-events-none" />
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Vault Access Failed</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{res.message || "The requested E2EE Vault is inactive or does not exist."}</p>
          <a
            href="/"
            className="inline-block bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-all"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Sanitize the encrypted items list to make sure we don't accidentally serialize non-plain objects or extra database fields
  const sanitizedItems = res.items.map(item => ({
    category: item.category,
    title: item.title,
    encrypted_data: item.encrypted_data,
    iv: item.iv,
    salt: item.salt
  }));

  return (
    <VaultClient profile={res.profile} encryptedItems={sanitizedItems} />
  );
}

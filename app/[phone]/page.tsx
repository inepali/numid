import { createAdminClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PublicProfileClient from "./profile-client";

interface PageProps {
  params: Promise<{ phone: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { phone } = await params;
  
  if (!phone) {
    return notFound();
  }

  // Sanitize the phone parameter to look up numerical strings
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!cleanPhone) {
    return notFound();
  }

  // Generate candidates to cover various formats: 10-digit local, 11-digit with country code
  const phoneCandidates: string[] = [cleanPhone, `+${cleanPhone}`];
  const addressCandidates: string[] = [`${cleanPhone}@numid.us`];

  if (cleanPhone.length === 10) {
    const withUS = `1${cleanPhone}`;
    phoneCandidates.push(withUS, `+${withUS}`);
    addressCandidates.push(`${withUS}@numid.us`);
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) {
    const withoutUS = cleanPhone.substring(1);
    phoneCandidates.push(withoutUS, `+${withoutUS}`);
    addressCandidates.push(`${withoutUS}@numid.us`);
  }

  const orFilters = [
    ...phoneCandidates.map(p => `phone_number.eq.${p}`),
    ...addressCandidates.map(a => `numid_address.eq.${a}`),
    ...addressCandidates.map(a => `numid_address.eq.${a.replace("@numid.us", "@numid.dev")}`)
  ].join(",");

  const adminClient = createAdminClient();
  
  const { data: userProfile } = await adminClient
    .from("users")
    .select("phone_number, numid_address, social_profiles, private_profiles, status, email_verified, phone_verified, avatar_url, avatar_updated_at, first_name, last_name")
    .eq("status", "active")
    .or(orFilters)
    .maybeSingle();

  if (!userProfile) {
    return notFound();
  }

  // Verify that the user profile has completed all registration checkmarks
  if (!userProfile.phone_verified || !userProfile.email_verified) {
    return notFound();
  }

  return (
    <PublicProfileClient profile={userProfile} />
  );
}

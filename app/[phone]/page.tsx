import { createAdminClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicProfileClient from "./profile-client";

interface PageProps {
  params: Promise<{ phone: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { phone } = await params;
  if (!phone) return {};

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!cleanPhone) return {};

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

  try {
    const adminClient = createAdminClient();
    const { data: userProfile } = await adminClient
      .from("users")
      .select("phone_number, numid_address, private_profiles, first_name, last_name, status, phone_verified, email_verified")
      .eq("status", "active")
      .or(orFilters)
      .maybeSingle();

    if (!userProfile || !userProfile.phone_verified || !userProfile.email_verified) {
      return {
        title: "Profile Not Found | NumID",
        description: "The requested NumID profile does not exist or is not verified.",
      };
    }

    const privateKeys = Array.isArray(userProfile.private_profiles)
      ? (userProfile.private_profiles as string[])
      : [];

    const isFirstNamePrivate = privateKeys.includes("first_name");
    const isLastNamePrivate = privateKeys.includes("last_name");

    const firstName = isFirstNamePrivate ? "" : (userProfile.first_name || "").trim();
    const lastName = isLastNamePrivate ? "" : (userProfile.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    const displayIdentifier = userProfile.numid_address || `${cleanPhone}@numid.us`;

    const title = fullName 
      ? `${fullName} (@${cleanPhone}) | NumID Profile`
      : `${displayIdentifier} | NumID Profile`;

    const description = fullName
      ? `View ${fullName}'s verified public NumID contact details and social profiles. Send emails securely to ${displayIdentifier}.`
      : `View verified public NumID contact details and social profiles for ${displayIdentifier}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        username: cleanPhone,
      },
      twitter: {
        card: "summary",
        title,
        description,
      }
    };
  } catch (e) {
    console.error("Error generating dynamic profile metadata:", e);
    return {};
  }
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

  // Safe checks for private profiles array
  const privateKeys = Array.isArray(userProfile.private_profiles)
    ? (userProfile.private_profiles as string[])
    : [];

  // Filter social profiles on the server-side to only include public links
  const publicSocialProfiles: Record<string, string> = {};
  if (userProfile.social_profiles && typeof userProfile.social_profiles === "object") {
    for (const [key, val] of Object.entries(userProfile.social_profiles as Record<string, string>)) {
      if (!privateKeys.includes(key) && val && val.trim() !== "") {
        publicSocialProfiles[key] = val;
      }
    }
  }

  const sanitizedProfile = {
    ...userProfile,
    social_profiles: publicSocialProfiles,
    private_profiles: privateKeys,
  };

  return (
    <PublicProfileClient profile={sanitizedProfile} />
  );
}

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

  const adminClient = createAdminClient();
  
  // Search for the user profile matching the cleaned phone number in standard formats
  const { data: userProfile } = await adminClient
    .from("users")
    .select("phone_number, numid_address, social_profiles, status, email_verified, phone_verified")
    .eq("status", "active")
    .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone},numid_address.eq.${cleanPhone}@numid.us`)
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

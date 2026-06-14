import { createAdminClient } from "../lib/supabase";

async function checkDatabase() {
  console.log("Fetching users from Supabase...");
  const adminClient = createAdminClient();
  const { data: users, error } = await adminClient
    .from("users")
    .select("*");

  if (error) {
    console.error("Database query error:", error);
    return;
  }

  console.log("--- USERS DATABASE DATA ---");
  console.log(JSON.stringify(users, null, 2));
}

checkDatabase().catch(console.error);

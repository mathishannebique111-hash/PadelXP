import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=== Setup Padel Square ===\n");

  // 1. Create auth user for Brahim Bel Abbes
  const email = "admin@belantis.be";
  const password = "belantispadelxp";

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });
  const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email);

  let userId: string;

  if (existingUser) {
    console.log(`User ${email} already exists (id: ${existingUser.id})`);
    userId = existingUser.id;
  } else {
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: "Brahim",
        last_name: "Bel Abbes",
        role: "club",
      },
    });

    if (userError || !newUser.user) {
      console.error("Failed to create user:", userError);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log(`Created user ${email} (id: ${userId})`);
  }

  // 2. Create club record
  const slug = "padelsquare4340";
  const inviteCode = "PADELSQUARE4340";

  // Check if club already exists
  const { data: existingClub } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  let clubId: string;

  if (existingClub) {
    console.log(`Club ${slug} already exists (id: ${existingClub.id})`);
    clubId = existingClub.id;
  } else {
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .upsert(
        {
          name: "Padel Square",
          slug,
          code_invitation: inviteCode,
          status: "active",
          postal_code: "4340",
          city: "Awans",
          address: "Rue Jean Lambert Defrêne 113/b, 4340 Awans",
          website: "https://www.padel-square.be",
          number_of_courts: 6,
          court_type: "couvert",
          subscription_status: "active",
          offer_type: "standard",
          trial_start: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "slug" }
      )
      .select("id, slug, code_invitation")
      .single();

    if (clubError || !club) {
      console.error("Failed to create club:", clubError);
      process.exit(1);
    }

    clubId = club.id;
    console.log(`Created club "${club.slug}" (id: ${clubId}, code: ${club.code_invitation})`);
  }

  // 3. Update user metadata with club info
  const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: "Brahim",
      last_name: "Bel Abbes",
      role: "club",
      club_id: clubId,
      club_slug: slug,
      club_name: "Padel Square",
      postal_code: "4340",
    },
  });

  if (metaError) {
    console.error("Failed to update user metadata:", metaError);
  } else {
    console.log("Updated user metadata with club info");
  }

  // 4. Create club_admin entry
  const { data: existingAdmin } = await supabase
    .from("club_admins")
    .select("id")
    .eq("club_id", String(clubId))
    .eq("user_id", userId)
    .maybeSingle();

  if (existingAdmin) {
    console.log("Club admin entry already exists");
  } else {
    const { error: adminError } = await supabase.from("club_admins").insert({
      club_id: String(clubId),
      user_id: userId,
      email,
      role: "owner",
      invited_by: userId,
      activated_at: new Date().toISOString(),
    });

    if (adminError) {
      console.error("Failed to create club_admin:", adminError);
    } else {
      console.log("Created club_admin entry (role: owner)");
    }
  }

  // 5. Remove player profile if it exists (club accounts shouldn't have one)
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    await supabase.from("profiles").delete().eq("id", userId);
    console.log("Removed player profile (club accounts don't need one)");
  }

  console.log("\n=== Setup complete ===");
  console.log(`Club: Padel Square`);
  console.log(`Slug: ${slug}`);
  console.log(`Code invitation: ${inviteCode}`);
  console.log(`Admin: Brahim Bel Abbes (${email})`);
  console.log(`Password: ${password}`);
  console.log(`Club ID: ${clubId}`);
}

main().catch(console.error);

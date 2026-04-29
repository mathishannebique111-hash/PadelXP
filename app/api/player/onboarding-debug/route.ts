import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Read current state
  const { data: profileBefore, error: readError } = await admin
    .from("profiles")
    .select("niveau_padel, onboarding_reward_claimed, global_points, has_completed_onboarding")
    .eq("id", user.id)
    .single();

  // Test write: try to set onboarding_reward_claimed = true and global_points += 20
  const { error: writeError } = await admin
    .from("profiles")
    .update({ onboarding_reward_claimed: true, global_points: (profileBefore?.global_points || 0) + 20 })
    .eq("id", user.id);

  // Test RPC
  const { error: rpcError } = await admin.rpc('increment_global_points', {
    p_user_id: user.id,
    p_points: 0  // add 0 just to test if RPC works
  });

  // Read after write
  const { data: profileAfter, error: readAfterError } = await admin
    .from("profiles")
    .select("niveau_padel, onboarding_reward_claimed, global_points, has_completed_onboarding")
    .eq("id", user.id)
    .single();

  // Test notification insert
  const { error: notifError } = await admin.from("notifications").insert({
    user_id: user.id,
    type: "onboarding_reward",
    title: "test",
    message: "test",
    data: { type: "onboarding_reward" },
    is_read: true,
  });

  // Match participants
  const { data: matchData, error: matchError } = await admin
    .from("match_participants")
    .select("match_id")
    .eq("user_id", user.id)
    .eq("player_type", "user")
    .limit(1);

  return NextResponse.json({
    userId: user.id,
    before: profileBefore,
    readError: readError?.message || null,
    writeError: writeError?.message || null,
    rpcError: rpcError?.message || null,
    after: profileAfter,
    readAfterError: readAfterError?.message || null,
    notifInsertError: notifError?.message || null,
    matchParticipants: { count: matchData?.length ?? 0, error: matchError?.message || null },
  }, { headers: { "Cache-Control": "no-store" } });
}

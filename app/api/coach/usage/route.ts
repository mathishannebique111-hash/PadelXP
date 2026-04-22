import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const DAILY_LIMIT = 5;

export async function GET() {
  try {
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

    // Compteur du jour
    const { data: usageCount } = await admin.rpc("get_coach_usage", {
      p_user_id: user.id,
    });

    // Premium check
    const { data: profile } = await admin
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.is_premium || false;

    return NextResponse.json({
      used: usageCount ?? 0,
      limit: DAILY_LIMIT,
      isPremium,
      remaining: isPremium ? null : Math.max(0, DAILY_LIMIT - (usageCount ?? 0)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}

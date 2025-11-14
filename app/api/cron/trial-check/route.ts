import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Important : forcer une route dynamique pour Vercel Cron
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1) Autoriser les appels venant de Vercel Cron
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  // 2) Autoriser aussi les appels manuels avec le CRON_SECRET
  const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
  const isManualAuthorized = authToken === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3) Client Supabase (service role pour pouvoir mettre à jour les clubs)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  const results = { j10: 0, j3: 0, j1: 0, expired: 0 };

  // ---------- J-10 ----------
  const in10Days = new Date(today);
  in10Days.setDate(in10Days.getDate() + 10);

  const { data: trials10 } = await supabase
    .from("clubs")
    .select("id, name, email, trial_end_at")
    .eq("subscription_status", "trialing")
    .gte("trial_end_at", today.toISOString())
    .lte("trial_end_at", in10Days.toISOString());

  for (const club of trials10 || []) {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-trial-reminder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: club.email,
          clubName: club.name,
          daysLeft: 10,
        }),
      }
    );
    results.j10++;
  }

  // ---------- J-3 ----------
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  const { data: trials3 } = await supabase
    .from("clubs")
    .select("id, name, email, trial_end_at")
    .eq("subscription_status", "trialing")
    .gte("trial_end_at", today.toISOString())
    .lte("trial_end_at", in3Days.toISOString());

  for (const club of trials3 || []) {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-trial-reminder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: club.email,
          clubName: club.name,
          daysLeft: 3,
        }),
      }
    );
    results.j3++;
  }

  // ---------- J-1 ----------
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: trials1 } = await supabase
    .from("clubs")
    .select("id, name, email, trial_end_at")
    .eq("subscription_status", "trialing")
    .gte("trial_end_at", today.toISOString())
    .lte("trial_end_at", tomorrow.toISOString());

  for (const club of trials1 || []) {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-trial-reminder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: club.email,
          clubName: club.name,
          daysLeft: 1,
        }),
      }
    );
    results.j1++;
  }

  // ---------- Essais expirés : pause si pas de CB / auto-activation ----------
  const { data: expiring } = await supabase
    .from("clubs")
    .select("id, has_payment_method, auto_activate_at_trial_end")
    .eq("subscription_status", "trialing")
    .lte("trial_end_at", today.toISOString());

  for (const club of expiring || []) {
    if (!club.has_payment_method || !club.auto_activate_at_trial_end) {
      const grace = new Date(today);
      grace.setDate(grace.getDate() + 7);

      await supabase
        .from("clubs")
        .update({
          subscription_status: "paused",
          grace_until: grace.toISOString(),
        })
        .eq("id", club.id);

      results.expired++;
    }
  }

  return NextResponse.json({
    success: true,
    date: today.toISOString(),
    processed: results,
  });
}

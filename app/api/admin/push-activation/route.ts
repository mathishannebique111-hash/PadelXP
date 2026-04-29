import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { sendPushNotification } from "@/lib/notifications/send-push";

export const dynamic = "force-dynamic";

/**
 * One-time push to ALL users with push tokens who haven't registered a match.
 * GET = dry run (count only), POST = send
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && secret !== process.env.SUBSCRIPTION_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // All users with push tokens
  const { data: tokens } = await admin.from("push_tokens").select("user_id");
  const pushUserIds = [...new Set((tokens || []).map(t => t.user_id).filter(Boolean))];

  // Among those, who has 0 matches AND evaluated level
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, display_name, niveau_padel, matchs_joues")
    .in("id", pushUserIds)
    .not("niveau_padel", "is", null);

  const eligible = (profiles || []).filter(p => !p.matchs_joues || p.matchs_joues === 0);

  // Check who already received this specific push (dedup)
  const { data: alreadySent } = await admin
    .from("notifications")
    .select("user_id")
    .in("user_id", eligible.map(u => u.id))
    .eq("type", "system")
    .like("title", "%Ton classement t'attend%");

  const alreadySentIds = new Set((alreadySent || []).map(n => n.user_id));
  const toSend = eligible.filter(u => !alreadySentIds.has(u.id));

  return NextResponse.json({
    totalPushUsers: pushUserIds.length,
    eligibleNoMatch: eligible.length,
    alreadySent: alreadySentIds.size,
    willSend: toSend.length,
    users: toSend.map(u => ({
      id: u.id.substring(0, 8) + "...",
      name: u.first_name || u.display_name,
      level: u.niveau_padel?.toFixed(2),
    })),
  });
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && secret !== process.env.SUBSCRIPTION_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: tokens } = await admin.from("push_tokens").select("user_id");
  const pushUserIds = [...new Set((tokens || []).map(t => t.user_id).filter(Boolean))];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, display_name, niveau_padel, matchs_joues")
    .in("id", pushUserIds)
    .not("niveau_padel", "is", null);

  const eligible = (profiles || []).filter(p => !p.matchs_joues || p.matchs_joues === 0);

  const { data: alreadySent } = await admin
    .from("notifications")
    .select("user_id")
    .in("user_id", eligible.map(u => u.id))
    .eq("type", "system")
    .like("title", "%Ton classement t'attend%");

  const alreadySentIds = new Set((alreadySent || []).map(n => n.user_id));
  const toSend = eligible.filter(u => !alreadySentIds.has(u.id));

  let sent = 0;
  for (const user of toSend) {
    const firstName = user.first_name || (user.display_name ? user.display_name.split(/\s+/)[0] : "Joueur");
    const level = user.niveau_padel?.toFixed(2) || "?";

    const title = "Ton classement t'attend";
    const message = `${firstName}, tu es niveau ${level} — enregistre ton premier match pour faire évoluer ton niveau et ton classement !`;

    // In-app notification (dedup marker)
    await admin.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title,
      message,
      data: { type: "push_activation", path: "/match/new?tab=record" },
      is_read: false,
    });

    // Push notification
    sendPushNotification(user.id, title, message, { type: "push_activation" }).catch(() => {});

    sent++;
  }

  logger.info(`[push-activation] Sent ${sent} activation pushes`);
  return NextResponse.json({ sent, total: toSend.length });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Force dynamic so Vercel Cron always executes this route
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MSG_NO_MATCH =
  "Enregistre ton premier match pour faire évoluer ton niveau !";
const MSG_HAS_MATCH =
  "Tu as joué un match récemment ? Enregistre-le pour faire évoluer ton niveau !";
const TITLE = "PadelXP 🎾";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function callPushEdgeFunction(
  userId: string,
  title: string,
  message: string
) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/push-notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      record: {
        user_id: userId,
        title,
        message,
        data: { type: "engagement" },
      },
    }),
  });
  return res.ok;
}

export async function GET(req: NextRequest) {
  // Auth: accept Vercel Cron header OR manual call with CRON_SECRET
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const isManualAuthorized = authToken === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("🔔 Cron engagement-notifications started");

  try {
    // 1. All users with push tokens (notifications enabled)
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id");

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "No tokens found", sent: 0 });
    }

    const userIdsWithTokens = [
      ...new Set(tokens.map((t: any) => t.user_id as string)),
    ];

    // 2. Which of those users have at least one match
    const BATCH_SIZE = 100;
    const usersWithMatches = new Set<string>();

    for (let i = 0; i < userIdsWithTokens.length; i += BATCH_SIZE) {
      const batch = userIdsWithTokens.slice(i, i + BATCH_SIZE);
      const { data: participants } = await supabase
        .from("match_participants")
        .select("user_id")
        .in("user_id", batch)
        .eq("player_type", "user");

      (participants || []).forEach((p: any) => usersWithMatches.add(p.user_id));
    }

    // 3. Split into two segments
    const noMatchUsers = userIdsWithTokens.filter(
      (id) => !usersWithMatches.has(id)
    );
    const hasMatchUsers = userIdsWithTokens.filter((id) =>
      usersWithMatches.has(id)
    );

    logger.info(
      `📊 Segment sans match: ${noMatchUsers.length} | Avec match: ${hasMatchUsers.length}`
    );

    // 4. Send notifications
    let sentNoMatch = 0,
      failedNoMatch = 0;
    let sentHasMatch = 0,
      failedHasMatch = 0;

    for (const userId of noMatchUsers) {
      const ok = await callPushEdgeFunction(userId, TITLE, MSG_NO_MATCH);
      ok ? sentNoMatch++ : failedNoMatch++;
    }

    for (const userId of hasMatchUsers) {
      const ok = await callPushEdgeFunction(userId, TITLE, MSG_HAS_MATCH);
      ok ? sentHasMatch++ : failedHasMatch++;
    }

    logger.info(
      `✅ Sans match → ${sentNoMatch} ok, ${failedNoMatch} échoués | Avec match → ${sentHasMatch} ok, ${failedHasMatch} échoués`
    );

    return NextResponse.json({
      success: true,
      date: new Date().toISOString(),
      results: {
        noMatch: { sent: sentNoMatch, failed: failedNoMatch },
        hasMatch: { sent: sentHasMatch, failed: failedHasMatch },
        total: sentNoMatch + sentHasMatch,
      },
    });
  } catch (error: any) {
    logger.error("❌ Cron engagement-notifications error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

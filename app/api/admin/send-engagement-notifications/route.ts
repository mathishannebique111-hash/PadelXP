import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_SECRET = process.env.ADMIN_MIGRATION_SECRET || "change-me-in-production";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MSG_NO_MATCH =
  "Enregistre ton premier match pour faire évoluer ton niveau !";
const MSG_HAS_MATCH =
  "Tu as joué un match récemment ? Enregistre-le pour faire évoluer ton niveau !";
const TITLE = "PadelXP 🎾";

async function callPushEdgeFunction(userId: string, title: string, message: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/push-notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      record: { user_id: userId, title, message, data: { type: "engagement" } },
    }),
  });
  return res.ok;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, dryRun = false } = body;

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    logger.info("🚀 Début envoi notifications d'engagement");

    // 1. Récupérer tous les user_id ayant un push token (notifications activées)
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id");

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "Aucun token trouvé", sent: 0 });
    }

    // Dédupliquer les user_ids
    const userIdsWithTokens = [...new Set(tokens.map((t: any) => t.user_id as string))];
    logger.info(`📱 ${userIdsWithTokens.length} joueurs avec notifications activées`);

    // 2. Récupérer les user_id ayant au moins un match enregistré
    const { data: participants, error: participantsError } = await supabase
      .from("match_participants")
      .select("user_id")
      .in("user_id", userIdsWithTokens)
      .eq("player_type", "user");

    if (participantsError) throw participantsError;

    const usersWithMatches = new Set(
      (participants || []).map((p: any) => p.user_id as string)
    );

    // 3. Séparer les deux segments
    const noMatchUsers = userIdsWithTokens.filter((id) => !usersWithMatches.has(id));
    const hasMatchUsers = userIdsWithTokens.filter((id) => usersWithMatches.has(id));

    logger.info(`📊 Segment sans match : ${noMatchUsers.length}`);
    logger.info(`📊 Segment avec match : ${hasMatchUsers.length}`);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        segments: {
          noMatch: { count: noMatchUsers.length, message: MSG_NO_MATCH },
          hasMatch: { count: hasMatchUsers.length, message: MSG_HAS_MATCH },
        },
      });
    }

    // 4. Envoyer les notifications
    let sentNoMatch = 0;
    let sentHasMatch = 0;
    let failedNoMatch = 0;
    let failedHasMatch = 0;

    // Segment sans match
    for (const userId of noMatchUsers) {
      const ok = await callPushEdgeFunction(userId, TITLE, MSG_NO_MATCH);
      ok ? sentNoMatch++ : failedNoMatch++;
    }

    // Segment avec match
    for (const userId of hasMatchUsers) {
      const ok = await callPushEdgeFunction(userId, TITLE, MSG_HAS_MATCH);
      ok ? sentHasMatch++ : failedHasMatch++;
    }

    logger.info(
      `✅ Sans match → ${sentNoMatch} envoyées, ${failedNoMatch} échouées`
    );
    logger.info(
      `✅ Avec match → ${sentHasMatch} envoyées, ${failedHasMatch} échouées`
    );

    return NextResponse.json({
      success: true,
      results: {
        noMatch: {
          message: MSG_NO_MATCH,
          sent: sentNoMatch,
          failed: failedNoMatch,
        },
        hasMatch: {
          message: MSG_HAS_MATCH,
          sent: sentHasMatch,
          failed: failedHasMatch,
        },
        totalSent: sentNoMatch + sentHasMatch,
        totalFailed: failedNoMatch + failedHasMatch,
      },
    });
  } catch (error: any) {
    logger.error("❌ Erreur envoi notifications engagement:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "club-challenges";


const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null;


type ChallengeRecord = {
  id: string;
  club_id: string;
  title: string;
  start_date: string;
  end_date: string;
  objective: string;
  reward_type: "points" | "badge";
  reward_label: string;
  created_at: string;
};


// === AJOUT : Schéma Zod pour validation ===
const challengeSchema = z.object({
  name: z.string().trim().min(1, "Le titre est requis").max(100, "Le titre est trop long"),
  objective: z.string().trim().min(1, "L'objectif est requis").max(500, "L'objectif est trop long"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  rewardType: z.enum(["points", "badge"], { errorMap: () => ({ message: "Type de récompense invalide" }) }),
  rewardLabel: z.string().trim().min(1, "Le label de récompense est requis").max(50, "Le label est trop long"),
}).refine(
  (data) => {
    const start = new Date(data.startDate + "T00:00:00.000Z");
    const end = new Date(data.endDate + "T23:59:59.999Z");
    return end >= start;
  },
  { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] }
);

type ChallengePayload = z.infer<typeof challengeSchema>;
// === FIN AJOUT ===


function computeStatus(challenge: ChallengeRecord): "upcoming" | "active" | "completed" {
  const now = new Date();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}


async function ensureBucket() {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 1024 * 1024,
      allowedMimeTypes: ["application/json"],
    });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!message.toLowerCase().includes("exists")) {
      logger.warn(`[api/clubs/challenges] ensureBucket warning: ${message}`);
    }
  }
}


async function loadChallenges(clubId: string): Promise<ChallengeRecord[]> {
  if (!supabaseAdmin) return [];
  const storage = supabaseAdmin.storage.from(BUCKET_NAME);
  const path = `${clubId}.json`;
  const { data, error } = await storage.download(path);
  if (error || !data) {
    if (error && error.message && !error.message.toLowerCase().includes("not found")) {
      logger.warn(`[api/clubs/challenges] loadChallenges error for club ${clubId.substring(0, 8)}: ${error.message}`);
    }
    return [];
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as ChallengeRecord[];
    }
  } catch (err) {
    logger.warn(`[api/clubs/challenges] invalid JSON for club ${clubId.substring(0, 8)}: ${err}`);
  }
  return [];
}


async function saveChallenges(clubId: string, records: ChallengeRecord[]) {
  if (!supabaseAdmin) return;
  const storage = supabaseAdmin.storage.from(BUCKET_NAME);
  const path = `${clubId}.json`;
  const payload = JSON.stringify(records, null, 2);
  await storage.upload(path, payload, { upsert: true, contentType: "application/json" });
}


async function resolveClubId(userId: string) {
  if (!supabaseAdmin) return null;

  // Essayer via le profil (pour les joueurs)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("club_id, club_slug")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.club_id) {
    return profile.club_id;
  }

  // Essayer via club_slug du profil
  if (profile?.club_slug) {
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("slug", profile.club_slug)
      .maybeSingle();
    if (club?.id) {
      return club.id;
    }
  }

  // Essayer via user_metadata (pour les admins de club)
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
  const clubIdFromMeta = user?.user_metadata?.club_id;
  const clubSlugFromMeta = user?.user_metadata?.club_slug;

  if (clubIdFromMeta) {
    return clubIdFromMeta;
  }

  if (clubSlugFromMeta) {
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("slug", clubSlugFromMeta)
      .maybeSingle();
    if (club?.id) {
      return club.id;
    }
  }

  logger.warn(`[api/clubs/challenges] resolveClubId: aucun club trouvé pour userId ${userId.substring(0, 8)}`);
  return null;
}


export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
  }

  await ensureBucket();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const clubId = await resolveClubId(user.id);

  // Load club-specific challenges (if user has a club)
  let filteredRecords: ChallengeRecord[] = [];
  if (clubId) {
    const records = await loadChallenges(clubId);

    // Calculer la date d'il y a 72 heures (3 jours)
    const seventyTwoHoursAgo = new Date();
    seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

    // Filtrer pour supprimer les challenges terminés depuis plus de 72h
    filteredRecords = records.filter((record) => {
      const endDate = new Date(record.end_date);
      const status = computeStatus(record);

      // Garder les challenges actifs, à venir, et terminés depuis moins de 72h
      if (status === "completed") {
        return endDate >= seventyTwoHoursAgo;
      }
      return true;
    });

    // Si des challenges ont été supprimés, sauvegarder la liste mise à jour
    if (filteredRecords.length < records.length) {
      try {
        await saveChallenges(clubId, filteredRecords);
        logger.info(`[api/clubs/challenges] Supprimé ${records.length - filteredRecords.length} challenge(s) terminé(s) depuis plus de 72h pour le club ${clubId.substring(0, 8)}`);
      } catch (error) {
        logger.error(`[api/clubs/challenges] Erreur lors de la sauvegarde après nettoyage pour le club ${clubId.substring(0, 8)}: ${error}`);
      }
    }
  }

  // Load global PadelXP challenges
  let globalChallenges: any[] = [];
  try {
    const { data: globalData } = await supabaseAdmin.storage
      .from("challenges")
      .download("__global__/challenges.json");
    if (globalData) {
      const text = await globalData.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        globalChallenges = parsed
          .filter((gc: any) => {
            // Only include active or upcoming global challenges
            const endDate = new Date(gc.end_date);
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            return endDate >= oneDayAgo;
          })
          .map((gc: any) => ({
            id: gc.id,
            title: gc.name || gc.title,
            startDate: gc.start_date,
            endDate: gc.end_date,
            objective: gc.objective,
            rewardType: "points" as const,
            rewardLabel: gc.reward,
            createdAt: gc.created_at,
            status: (() => {
              const now = new Date();
              if (now < new Date(gc.start_date)) return "upcoming";
              if (now > new Date(gc.end_date)) return "completed";
              return "active";
            })(),
            isGlobal: true,
          }));
      }
    }
  } catch (err) {
    // Silently fail — global challenges are optional
  }

  const clubChallenges = filteredRecords
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((record) => ({
      id: record.id,
      title: record.title,
      startDate: record.start_date,
      endDate: record.end_date,
      objective: record.objective,
      rewardType: record.reward_type,
      rewardLabel: record.reward_label,
      createdAt: record.created_at,
      status: computeStatus(record),
      isGlobal: false,
    }));

  // Return only club-specific challenges (omit global ones as requested for the club account)
  const challenges = clubChallenges;

  return NextResponse.json({ challenges });
}


export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
  }

  await ensureBucket();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const clubId = await resolveClubId(user.id);
  if (!clubId) {
    return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
  }

  // === MODIFICATION : Validation Zod avec safeParse ===
  let body;
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: "Format de requête invalide" }, { status: 400 });
  }

  const parsed = challengeSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";
    return NextResponse.json({ error: firstError, details: fieldErrors }, { status: 400 });
  }

  const payload = parsed.data;
  // === FIN MODIFICATION ===

  const existing = await loadChallenges(clubId);

  const record: ChallengeRecord = {
    id: randomUUID(),
    club_id: clubId,
    title: payload.name,
    objective: payload.objective,
    start_date: payload.startDate,
    end_date: payload.endDate,
    reward_type: payload.rewardType,
    reward_label: payload.rewardLabel,
    created_at: new Date().toISOString(),
  };

  const updated = [record, ...existing];

  try {
    await saveChallenges(clubId, updated);
  } catch (error) {
    logger.error(`[api/clubs/challenges] save error for club ${clubId.substring(0, 8)}: ${error}`);
    return NextResponse.json({ error: "Impossible d'enregistrer le challenge" }, { status: 500 });
  }

  // Notify club members immediately
  try {
    const { createServerNotification, sendPushNotification } = await import("@/lib/notifications/send-push");

    const { data: clubMembers } = await supabaseAdmin
      .from("user_clubs")
      .select("user_id")
      .eq("club_id", clubId);

    const memberIds = (clubMembers || []).map((m: any) => m.user_id);
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, display_name")
        .in("id", memberIds);

      const reward = record.reward_type === "points"
        ? `${record.reward_label} points`
        : `le badge ${record.reward_label}`;

      for (const profile of (memberProfiles || [])) {
        const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "Joueur");
        await createServerNotification(
          profile.id,
          "challenge_new",
          "🆕 Nouveau challenge !",
          `${firstName}, nouveau défi : "${record.title}". Remporte ${reward} en relevant le challenge !`,
          { type: "challenge_new", challenge_id: record.id, challenge_title: record.title }
        );
        sendPushNotification(
          profile.id,
          "🆕 Nouveau challenge !",
          `${firstName}, nouveau défi : "${record.title}". Remporte ${reward} !`,
          { type: "challenge_new", challenge_id: record.id }
        ).catch(() => {});
      }
    }
  } catch (notifErr) {
    logger.error("[clubs/challenges] Notification error (non-blocking):", notifErr);
  }

  return NextResponse.json({
    challenge: {
      id: record.id,
      title: record.title,
      startDate: record.start_date,
      endDate: record.end_date,
      objective: record.objective,
      rewardType: record.reward_type,
      rewardLabel: record.reward_label,
      createdAt: record.created_at,
      status: computeStatus(record),
    },
  });
}

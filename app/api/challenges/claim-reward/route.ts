import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";

const ClaimRewardSchema = z.object({
  challengeId: z.string().uuid("challengeId doit être un UUID valide"),
});

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const BUCKET_NAME = "club-challenges";

// Liste d'emojis disponibles pour les badges de challenges
const BADGE_EMOJIS = [
  "🏅", "🎖️", "🥇", "🥈", "🥉", "🎯", "⭐", "🌟", "✨", "💫",
  "🔥", "⚡", "💪", "🚀", "🎊", "🎉", "🎁", "🏆", "👑", "💎",
  "🌈", "☀️", "🌙", "⚔️", "🛡️", "🎪", "🎨", "🎭", "🎬", "🎼"
];

// Fonction pour obtenir un emoji déterministe basé sur l'ID du challenge
function getEmojiForChallenge(challengeId: string): string {
  // Calculer un hash simple de l'ID
  let hash = 0;
  for (let i = 0; i < challengeId.length; i++) {
    const char = challengeId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Utiliser le hash pour choisir un emoji
  const index = Math.abs(hash) % BADGE_EMOJIS.length;
  return BADGE_EMOJIS[index];
}

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

async function resolveClubId(userId: string) {
  // Essayer via le profil (pour les joueurs)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("club_id")
    .eq("id", userId)
    .maybeSingle();
  
  if (profile?.club_id) {
    return profile.club_id;
  }
  
  logger.warn({ userId }, "[claim-reward] resolveClubId: aucun club trouvé pour userId");
  return null;
}

async function loadChallenges(clubId: string): Promise<ChallengeRecord[]> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(`${clubId}.json`);
  if (error || !data) {
    if (error && !error.message?.toLowerCase().includes("not found")) {
      logger.warn({ err: error }, "[claim-reward] load error");
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
    logger.warn({ err }, "[claim-reward] invalid JSON");
  }
  return [];
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/challenges/claim-reward
 * Attribue la récompense d'un challenge complété au joueur
 */
export async function POST(req: Request) {
  try {
    // Créer le client Supabase avec les cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.error("[claim-reward] ❌ Unauthorized: No user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Lecture du JSON brut
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "JSON invalide" },
        { status: 400 }
      );
    }

    // Validation avec Zod pour challengeId
    const parsed = ClaimRewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { challengeId } = parsed.data;
    const { rewardType, rewardValue } = body;

    if (!rewardType || !rewardValue) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const userIdPreview = user.id.substring(0, 8) + "…";
    logger.info({ userId: userIdPreview, challengeId }, "[claim-reward] User claiming reward");
    
    // 1) Vérifier que le challenge existe et n'est pas expiré
    const clubId = await resolveClubId(user.id);
    if (!clubId) {
      return NextResponse.json(
        { error: "Profil joueur introuvable" },
        { status: 404 }
      );
    }

    const challenges = await loadChallenges(clubId);
    const challenge = challenges.find(c => c.id === challengeId);
    
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge introuvable" },
        { status: 404 }
      );
    }

    const now = new Date();
    const endDate = new Date(challenge.end_date);
    if (now > endDate) {
      logger.info({ challengeId, endDate: challenge.end_date }, "[claim-reward] ❌ Challenge expired");
      return NextResponse.json(
        { error: "Ce challenge est terminé et ne peut plus être réclamé" },
        { status: 403 }
      );
    }

    // 2) Vérifier si la récompense a déjà été attribuée
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("challenge_rewards")
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (checkError) {
      logger.error({ err: checkError, challengeId }, "[claim-reward] ❌ Error checking existing reward");
      return NextResponse.json(
        { error: `Erreur: ${checkError.message}. Avez-vous exécuté le script SQL pour créer la table challenge_rewards ?` },
        { status: 500 }
      );
    }

    if (existing) {
      logger.info({ challengeId }, "[claim-reward] ⚠️ Reward already claimed");
      return NextResponse.json(
        { error: "Récompense déjà réclamée", alreadyClaimed: true },
        { status: 409 }
      );
    }

    // 3) Si la récompense est en points, ajouter les points au joueur
    if (rewardType === "points") {
      const points = parseInt(rewardValue, 10);
      if (isNaN(points) || points <= 0) {
        return NextResponse.json(
          { error: "Nombre de points invalide" },
          { status: 400 }
        );
      }

      // Récupérer le profil actuel du joueur
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        logger.error({ err: profileError }, "[claim-reward] Error fetching profile");
        return NextResponse.json(
          { error: "Profil introuvable" },
          { status: 404 }
        );
      }

      const currentPoints = profile.points || 0;
      const newPoints = currentPoints + points;

      logger.info({ points, currentPoints, newPoints }, "[claim-reward] Adding points");

      // Mettre à jour les points
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", user.id);

      if (updateError) {
        logger.error({ err: updateError }, "[claim-reward] ❌ Error updating points");
        return NextResponse.json(
          { error: "Erreur lors de l'ajout des points" },
          { status: 500 }
        );
      }

      logger.info({ currentPoints, newPoints }, "[claim-reward] ✅ Points updated successfully");
      
      // Vérifier que l'update a bien fonctionné
      const { data: verifyProfile } = await supabaseAdmin
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();
      
      logger.info({ pointsInDB: verifyProfile?.points }, "[claim-reward] 🔍 Verification - Points in DB after update");
    }

    // 4) Si la récompense est un badge, créer le badge
    if (rewardType === "badge") {
      const badgeName = rewardValue;
      const badgeEmoji = getEmojiForChallenge(challengeId);
      
      logger.info({ badgeEmoji, badgeName }, "[claim-reward] Creating challenge badge");
      
      // Créer le badge dans la table challenge_badges
      const { error: badgeError } = await supabaseAdmin
        .from("challenge_badges")
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          badge_name: badgeName,
          badge_emoji: badgeEmoji,
        });
      
      if (badgeError) {
        logger.error({ err: badgeError }, "[claim-reward] ❌ Error creating badge");
        return NextResponse.json(
          { error: `Erreur lors de la création du badge: ${badgeError.message}. Avez-vous exécuté le script SQL pour créer la table challenge_badges ?` },
          { status: 500 }
        );
      }
      
      logger.info({ badgeEmoji, badgeName }, "[claim-reward] ✅ Challenge badge created successfully");
    }

    // 5) Enregistrer la récompense comme attribuée
    const { error: insertError } = await supabaseAdmin
      .from("challenge_rewards")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        reward_type: rewardType,
        reward_value: rewardValue.toString(),
      });

    if (insertError) {
      logger.error({ err: insertError }, "[claim-reward] Error recording reward");
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement de la récompense" },
        { status: 500 }
      );
    }

    logger.info({ challengeId }, "[claim-reward] ✅ Reward claimed successfully");

    // Revalider les pages qui affichent les points
    revalidatePath("/home");
    revalidatePath("/challenges");
    revalidatePath("/profil");

    return NextResponse.json({
      success: true,
      rewardType,
      rewardValue,
      message: "Récompense attribuée avec succès !",
    });
  } catch (error) {
    logger.error({ err: error }, "[claim-reward] Exception");
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

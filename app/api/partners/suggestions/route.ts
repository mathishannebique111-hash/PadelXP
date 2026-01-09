import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { calculateCompatibility } from "@/lib/matching/partnerCompatibility";

// Créer un client admin pour bypass RLS
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Utiliser le cache avec revalidation pour améliorer les performances
export const dynamic = "force-dynamic";
// Revalidation rapide pour permettre un chargement quasi-instantané avec stale-while-revalidate
export const revalidate = 10; // Revalider toutes les 10 secondes côté serveur

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Récupérer l'utilisateur connecté
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn(
        { error: userError },
        "[PartnersSuggestions] Pas d'utilisateur connecté"
      );
      return NextResponse.json({ suggestions: [] }, { status: 401 });
    }

    // 2. Récupérer le profil complet de l'utilisateur connecté
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !currentUserProfile) {
      logger.error(
        { error: profileError },
        "[PartnersSuggestions] Erreur récupération profil utilisateur"
      );
      return NextResponse.json({ suggestions: [] }, { status: 500 });
    }

    // 3. Vérifier que l'utilisateur a un club_id
    if (!currentUserProfile.club_id) {
      logger.warn(
        { userId: user.id },
        "[PartnersSuggestions] Utilisateur sans club_id"
      );
      return NextResponse.json({ suggestions: [] });
    }

    // 4. Récupérer tous les joueurs du même club (avec client admin pour bypass RLS)
    const { data: allPlayers, error: playersError } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        id,
        first_name,
        last_name,
        display_name,
        avatar_url,
        niveau_padel,
        niveau_categorie,
        hand,
        preferred_side,
        frequency,
        best_shot,
        level,
        club_id
      `
      )
      .eq("club_id", currentUserProfile.club_id)
      .neq("id", user.id); // Exclure l'utilisateur lui-même

    if (playersError) {
      logger.error(
        { error: playersError },
        "[PartnersSuggestions] Erreur récupération joueurs du club"
      );
      return NextResponse.json({ suggestions: [] }, { status: 500 });
    }

    if (!allPlayers || allPlayers.length === 0) {
      logger.info(
        { clubId: currentUserProfile.club_id },
        "[PartnersSuggestions] Aucun autre joueur dans le club"
      );
      return NextResponse.json({ suggestions: [] });
    }

    // 5. Filtrer et calculer la compatibilité pour chaque joueur
    const suggestionsWithScore: Array<{
      player: typeof allPlayers[0];
      compatibility: { score: number; tags: string[] } | null;
    }> = [];

    for (const player of allPlayers) {
      // Exclure les joueurs qui jouent du même côté (sauf si l'un est indifférent)
      // Si les deux ont un côté défini et que c'est le même, on exclut
      if (
        currentUserProfile.preferred_side &&
        player.preferred_side &&
        currentUserProfile.preferred_side === player.preferred_side &&
        currentUserProfile.preferred_side !== "indifferent" &&
        player.preferred_side !== "indifferent"
      ) {
        logger.info(
          {
            userId: user.id.substring(0, 8),
            playerId: player.id.substring(0, 8),
            userSide: currentUserProfile.preferred_side,
            playerSide: player.preferred_side,
          },
          "[PartnersSuggestions] Joueur exclu : même côté"
        );
        continue; // Skip ce joueur
      }

      // Calculer la compatibilité uniquement si les deux ont un niveau évalué
      let compatibility = null;
      if (
        currentUserProfile.niveau_padel &&
        player.niveau_padel
      ) {
        compatibility = calculateCompatibility(
          currentUserProfile,
          player
        );
      }

      // Inclure le joueur même sans compatibilité calculée (pour afficher les profils)
      suggestionsWithScore.push({
        player,
        compatibility,
      });
    }

    // 6. Filtrer les suggestions
    // Si un joueur n'a pas de compatibilité calculée (pas de niveau évalué), on l'exclut
    // Sinon, on garde ceux avec >= 60% OU ceux qui ont un niveau similaire (différence <= 0.5)
    const filteredSuggestions = suggestionsWithScore.filter((item) => {
      // Si pas de compatibilité calculée, exclure
      if (!item.compatibility) {
        return false;
      }
      
      const score = item.compatibility.score;
      const levelDiff = Math.abs(
        (currentUserProfile.niveau_padel || 0) - (item.player.niveau_padel || 0)
      );
      
      // Inclure si score >= 60 OU si niveau très similaire (différence <= 0.5) même avec score < 60
      // Cela permet d'inclure des joueurs similaires même si certains facteurs ne sont pas optimaux
      return score >= 60 || (levelDiff <= 0.5 && score >= 40);
    });

    // 7. Trier par score de compatibilité (décroissant), puis par niveau évalué
    filteredSuggestions.sort((a, b) => {
      const scoreA = a.compatibility?.score || 0;
      const scoreB = b.compatibility?.score || 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Décroissant
      }

      // En cas d'égalité, trier par niveau évalué (décroissant)
      const levelA = a.player.niveau_padel || 0;
      const levelB = b.player.niveau_padel || 0;
      return levelB - levelA;
    });

    // 8. Prendre les 4 meilleurs (ou moins s'il y en a moins de 4 avec 60%+)
    const topSuggestions = filteredSuggestions.slice(0, 4);

    // 9. Formater les résultats
    const suggestions = topSuggestions.map(({ player, compatibility }) => ({
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      display_name: player.display_name,
      avatar_url: player.avatar_url,
      niveau_padel: player.niveau_padel,
      niveau_categorie: player.niveau_categorie,
      compatibilityScore: compatibility?.score || null,
      compatibilityTags: compatibility?.tags || [],
    }));

    logger.info(
      {
        userId: user.id.substring(0, 8),
        clubId: currentUserProfile.club_id.substring(0, 8),
        totalPlayers: allPlayers.length,
        filteredCount: filteredSuggestions.length,
        suggestionsCount: suggestions.length,
        excludedBySide: allPlayers.length - suggestionsWithScore.length,
      },
      "[PartnersSuggestions] Suggestions générées"
    );
    
    // Log détaillé pour chaque suggestion retenue
    suggestions.forEach((s, index) => {
      logger.info(
        {
          rank: index + 1,
          playerId: s.id.substring(0, 8),
          score: s.compatibilityScore,
          tags: s.compatibilityTags,
        },
        "[PartnersSuggestions] Suggestion retenue"
      );
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error(
      { error, errorMessage: error instanceof Error ? error.message : String(error) },
      "[PartnersSuggestions] Erreur inattendue"
    );
    return NextResponse.json(
      { suggestions: [], error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

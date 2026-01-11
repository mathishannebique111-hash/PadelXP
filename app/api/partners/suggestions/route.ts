import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getCategorieFromLevel } from "@/lib/padel/levelUtils";

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

import { calculateCompatibility } from "@/lib/matching/partnerCompatibility";

// ... (keep imports)

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
        "[PartnersSuggestions] Pas d'utilisateur connecté",
        { error: userError }
      );
      return NextResponse.json({ suggestions: [] }, { status: 401 });
    }

    // 2. Récupérer le profil COMPLET de l'utilisateur (pour le calcul de compatibilité)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*") // On a besoin de tout: hand, side, frequency, etc.
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !currentUserProfile) {
      logger.error(
        "[PartnersSuggestions] Erreur récupération profil utilisateur",
        { error: profileError }
      );
      return NextResponse.json({ suggestions: [] }, { status: 500 });
    }

    if (!currentUserProfile.club_id) {
      logger.warn(
        "[PartnersSuggestions] Utilisateur sans club_id",
        { userId: user.id }
      );
      return NextResponse.json({ suggestions: [] });
    }

    // 3. Récupérer les partenaires habituels actuels pour les exclure
    const { data: existingPartnerships } = await supabaseAdmin
      .from("player_partnerships")
      .select("player_id, partner_id")
      .eq("status", "accepted")
      .or(`player_id.eq.${user.id},partner_id.eq.${user.id}`);

    const existingPartnerIds = new Set(
      existingPartnerships?.map(p => p.player_id === user.id ? p.partner_id : p.player_id) || []
    );

    // 4. Récupérer les candidats depuis la vue (pour le filtrage de base: club, niveau, etc.)
    const { data: candidates, error: viewError } = await supabaseAdmin
      .from("suggested_partners")
      .select("partner_id") // On a juste besoin des IDs
      .eq("player_id", user.id)
      .not("partner_id", "in", `(${Array.from(existingPartnerIds).join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .limit(20); // On en prend un peu plus pour filtrer après recalcul

    if (viewError) {
      logger.warn(
        "[PartnersSuggestions] Vue suggested_partners non trouvée",
        { error: viewError }
      );
      return NextResponse.json({ suggestions: [] }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // 4. Récupérer les profils COMPLETS des candidats
    const candidateIds = candidates.map(c => c.partner_id);
    const { data: fullProfiles, error: candidatesError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", candidateIds);

    if (candidatesError || !fullProfiles) {
      logger.error("[PartnersSuggestions] Erreur fetch profils candidats", { error: candidatesError });
      return NextResponse.json({ suggestions: [] });
    }

    // 6. Calculer la compatibilité via TS et formater
    const suggestions = fullProfiles
      .map(partnerProfile => {
        const compatibility = calculateCompatibility(currentUserProfile, partnerProfile);

        // Si pas de compatibilité calculable (ex: pas de niveau), on ignore
        if (!compatibility) return null;

        const partnerLevel = partnerProfile.niveau_padel || null;
        const niveauCategorie = getCategorieFromLevel(partnerLevel);

        return {
          id: partnerProfile.id,
          first_name: partnerProfile.first_name,
          last_name: partnerProfile.last_name,
          display_name: `${partnerProfile.first_name || ''} ${partnerProfile.last_name || ''}`.trim() || null,
          avatar_url: partnerProfile.avatar_url,
          niveau_padel: partnerLevel,
          niveau_categorie: niveauCategorie,
          compatibilityScore: compatibility.score,
          compatibilityTags: compatibility.tags,
        };
      })
      .filter(s => s !== null) // Enlever les nulls
      .sort((a, b) => (b!.compatibilityScore || 0) - (a!.compatibilityScore || 0)) // Trier par nouveau score
      .slice(0, 10); // Garder le top 10

    logger.info(
      "[PartnersSuggestions] Suggestions recalculées et renvoyées",
      {
        userId: user.id.substring(0, 8),
        suggestionsCount: suggestions.length,
      }
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    // ... (keep error handling)
    logger.error(
      "[PartnersSuggestions] Erreur inattendue",
      { error, errorMessage: error instanceof Error ? error.message : String(error) }
    );
    return NextResponse.json(
      { suggestions: [], error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

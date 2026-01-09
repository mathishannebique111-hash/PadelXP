import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import PlayerProfileView from "@/components/players/PlayerProfileView";
import { calculateCompatibility } from "@/lib/matching/partnerCompatibility";

export const dynamic = "force-dynamic";

// Créer un client admin pour bypass RLS dans les requêtes critiques
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PlayerPublicProfilePage({ params }: Props) {
  try {
    // Gérer les deux cas : params peut être une Promise (Next.js 15) ou un objet direct
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;
    
    logger.info(
      { playerId: id },
      "[PlayerProfilePage] Page appelée avec ID"
    );

    const supabase = await createClient();

    // 1. Récupérer l'utilisateur connecté
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.error(
        { error: userError, playerId: id, errorDetails: JSON.stringify(userError) },
        "[PlayerProfilePage] Erreur getUser"
      );
    }

    if (!user) {
      logger.warn(
        { playerId: id },
        "[PlayerProfilePage] Pas d'utilisateur connecté - retour notFound"
      );
      // Afficher une page d'erreur au lieu de notFound pour debug
      return (
        <div className="min-h-screen bg-slate-900 p-8">
          <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">Erreur d'authentification</h1>
            <p>Vous devez être connecté pour voir ce profil.</p>
            <p className="text-sm text-gray-400 mt-2">Player ID: {id}</p>
          </div>
        </div>
      );
    }

    logger.info(
      { userId: user.id.substring(0, 8), playerId: id },
      "[PlayerProfilePage] Utilisateur connecté trouvé"
    );

    // 2. Récupérer le profil complet de l'utilisateur connecté (pour la compatibilité)
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!currentUserProfile) {
      logger.warn(
        { playerId: id, userId: user.id },
        "[PlayerProfilePage] Profil utilisateur connecté non trouvé"
      );
      return notFound();
    }

    const currentUserClubId = currentUserProfile.club_id || null;

    // 3. Récupérer le profil du joueur ciblé
    logger.info(
      { playerId: id },
      "[PlayerProfilePage] Récupération du profil du joueur"
    );

    // Essayer d'abord avec le client standard
    let { data: playerProfile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // Si erreur ou pas de résultat, essayer avec le client admin (bypass RLS)
    if (error || !playerProfile) {
      logger.warn(
        { 
          playerId: id, 
          error: error?.message,
          hasError: !!error,
          hasProfile: !!playerProfile
        },
        "[PlayerProfilePage] Tentative avec client admin (bypass RLS)"
      );

      const { data: adminPlayerProfile, error: adminError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (adminError) {
        logger.error(
          { 
            error: adminError, 
            playerId: id, 
            errorCode: adminError.code, 
            errorMessage: adminError.message 
          },
          "[PlayerProfilePage] Erreur lors de la récupération du profil (admin)"
        );
        return (
          <div className="min-h-screen bg-slate-900 p-8">
            <div className="text-white">
              <h1 className="text-2xl font-bold mb-4">Erreur serveur</h1>
              <p>Erreur lors de la récupération du profil : {adminError.message}</p>
              <p className="text-sm text-gray-400 mt-2">Player ID: {id}</p>
            </div>
          </div>
        );
      }

      if (!adminPlayerProfile) {
        logger.warn(
          { playerId: id },
          "[PlayerProfilePage] Profil non trouvé en base de données (même avec admin)"
        );
        return (
          <div className="min-h-screen bg-slate-900 p-8">
            <div className="text-white">
              <h1 className="text-2xl font-bold mb-4">Profil non trouvé</h1>
              <p>Le profil du joueur avec l&apos;ID {id} n&apos;a pas été trouvé.</p>
              <p className="text-sm text-gray-400 mt-2">Vérifiez que l&apos;ID est correct.</p>
            </div>
          </div>
        );
      }

      playerProfile = adminPlayerProfile;
      logger.info(
        { playerId: id },
        "[PlayerProfilePage] Profil trouvé via client admin"
      );
    }

    logger.info(
      {
        playerId: id,
        playerName: playerProfile.display_name || `${playerProfile.first_name} ${playerProfile.last_name}`,
        playerClubId: playerProfile.club_id,
        currentUserClubId: currentUserClubId,
      },
      "[PlayerProfilePage] Profil trouvé"
    );

    // 4. SÉCURITÉ : Vérifier que les deux joueurs sont du même club (si les deux ont un club_id)
    if (
      currentUserClubId &&
      playerProfile.club_id &&
      playerProfile.club_id !== currentUserClubId
    ) {
      logger.warn(
        { playerId: id, playerClubId: playerProfile.club_id, currentUserClubId },
        "[PlayerProfilePage] Clubs différents - accès refusé"
      );
      // Afficher une page d'erreur au lieu de notFound pour debug
      return (
        <div className="min-h-screen bg-slate-900 p-8">
          <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
            <p>Vous ne pouvez pas voir le profil d&apos;un joueur d&apos;un autre club.</p>
            <p className="text-sm text-gray-400 mt-2">
              Votre club: {currentUserClubId || "Non défini"}
            </p>
            <p className="text-sm text-gray-400">
              Club du joueur: {playerProfile.club_id || "Non défini"}
            </p>
          </div>
        </div>
      );
    }

    // 5. Ne pas permettre de voir son propre profil (rediriger vers /home)
    if (playerProfile.id === user.id) {
      logger.info(
        { playerId: id },
        "[PlayerProfilePage] Tentative de voir son propre profil - redirection"
      );
      redirect("/home?tab=padel");
    }

    // 6. NOUVEAU : Calculer la compatibilité
    let compatibility = null;
    if (
      currentUserProfile.niveau_padel &&
      playerProfile.niveau_padel
    ) {
      compatibility = calculateCompatibility(
        currentUserProfile,
        playerProfile
      );
    }

    return (
      <PlayerProfileView
        player={playerProfile}
        currentUserId={user.id}
        compatibilityScore={compatibility?.score || null}
        compatibilityTags={compatibility?.tags || undefined}
      />
    );
  } catch (error) {
    logger.error(
      { error, errorMessage: error instanceof Error ? error.message : String(error) },
      "[PlayerProfilePage] Erreur inattendue"
    );
    return notFound();
  }
}

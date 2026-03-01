"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Enregistre une visite de profil.
 * Ne s'enregistre que si le visiteur est différent de la personne vue.
 */
export async function recordProfileView(viewedId: string) {
    const supabase = await createClient();

    // 1. Récupérer l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "Non authentifié" };
    }

    // 2. Ne pas enregistrer si c'est son propre profil
    if (user.id === viewedId) {
        return { success: true, message: "Auto-visite non enregistrée" };
    }

    // 3. Insérer la visite
    const { error } = await supabase
        .from("profile_views")
        .insert({
            viewer_id: user.id,
            viewed_id: viewedId
        });

    if (error) {
        console.error("[recordProfileView] Erreur insertion:", error);
        return { success: false, error };
    }

    return { success: true };
}

/**
 * Récupère la liste des visiteurs pour l'utilisateur connecté.
 */
export async function getProfileVisitors() {
    const supabase = await createClient();

    // 1. Récupérer l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "Non authentifié" };
    }

    // 2. Récupérer le profil et le statut premium
    const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("is_premium, niveau_padel")
        .eq("id", user.id)
        .single();

    const isPremium = currentUserProfile?.is_premium || false;

    // 3. Récupérer les visites
    const { data: visits, error } = await supabase
        .from("profile_views")
        .select(`
            id,
            viewed_at,
            viewer_id,
            viewer_profile:profiles!profile_views_viewer_id_fkey (
                id,
                first_name,
                last_name,
                display_name,
                avatar_url,
                niveau_padel,
                niveau_categorie,
                is_premium
            )
        `)
        .eq("viewed_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("[getProfileVisitors] Erreur:", error);
        return { success: false, error };
    }

    // 4. Si non-premium, générer une phrase teaser unique
    let teaserPhrase = null;

    if (!isPremium && visits && visits.length > 0) {
        try {
            // Récupérer les clubs de l'utilisateur
            const { data: userClubs } = await supabase
                .from("user_clubs")
                .select("club_id")
                .eq("user_id", user.id);
            const userClubIds = userClubs?.map((uc: any) => uc.club_id) || [];

            // Récupérer les IDs des visiteurs uniques des 7 derniers jours
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const recentVisits = visits.filter((v: any) => new Date(v.viewed_at) > oneWeekAgo);
            const viewerIds = Array.from(new Set(recentVisits.map((v: any) => v.viewer_id)));

            // Vérifier les clubs des visiteurs récents
            const { data: visitorClubs } = await supabase
                .from("user_clubs")
                .select("user_id, club_id")
                .in("user_id", viewerIds);

            // Déterminer s'il y a des "Bourreaux" (Nemesis)
            // On simplifie : on regarde les matchs perdus contre ces joueurs
            const { data: participations } = await supabase
                .from("match_participants")
                .select("match_id, team")
                .eq("user_id", user.id);

            const matchIds = participations?.map((p: any) => p.match_id) || [];

            const { data: opponents } = await supabase
                .from("match_participants")
                .select("user_id, match_id")
                .in("match_id", matchIds)
                .in("user_id", viewerIds)
                .neq("user_id", user.id);

            // On va chercher les matchs gagnés par les adversaires (perdus par l'user)
            const opponentMatchIds = Array.from(new Set(opponents?.map((o: any) => o.match_id) || []));
            const { data: matches } = await supabase
                .from("matches")
                .select("id, winner_team_id, team1_id, team2_id")
                .in("id", opponentMatchIds);

            const nemesisIds = new Set();
            opponents?.forEach((opp: any) => {
                const match = matches?.find((m: any) => m.id === opp.match_id);
                if (match) {
                    const myPart = participations?.find((p: any) => p.match_id === match.id);
                    const winnerTeam = match.winner_team_id === match.team1_id ? 1 : 2;
                    if (myPart && myPart.team !== winnerTeam) {
                        nemesisIds.add(opp.user_id);
                    }
                }
            });

            // Analyse des données pour choisir la phrase
            let bestTeaser = null;

            // Priorité 1 : Nemesis
            const nemesisVisitor = recentVisits.find((v: any) => nemesisIds.has(v.viewer_id));
            if (nemesisVisitor) {
                bestTeaser = "Ton bourreau historique vient de regarder tes dernières statistiques.";
            }

            // Priorité 2 : Membre du club + Fréquence
            if (!bestTeaser) {
                const visitCounts = recentVisits.reduce((acc: any, v: any) => {
                    acc[v.viewer_id] = (acc[v.viewer_id] || 0) + 1;
                    return acc;
                }, {});

                const frequentClubVisitor = recentVisits.find((v: any) => {
                    const isClubMate = visitorClubs?.some((vc: any) => vc.user_id === v.viewer_id && userClubIds.includes(vc.club_id));
                    return isClubMate && visitCounts[v.viewer_id] >= 2;
                });

                if (frequentClubVisitor) {
                    const count = visitCounts[frequentClubVisitor.viewer_id];
                    const level = frequentClubVisitor.viewer_profile.niveau_padel ? Math.floor(frequentClubVisitor.viewer_profile.niveau_padel) : "?";
                    bestTeaser = `Un joueur de ton club (Niveau ${level}) a consulté ton profil ${count} fois cette semaine.`;
                }
            }

            // Priorité 3 : Membre du club simple
            if (!bestTeaser) {
                const clubVisitor = recentVisits.find((v: any) =>
                    visitorClubs?.some((vc: any) => vc.user_id === v.viewer_id && userClubIds.includes(vc.club_id))
                );
                if (clubVisitor) {
                    const level = clubVisitor.viewer_profile.niveau_padel ? Math.floor(clubVisitor.viewer_profile.niveau_padel) : "?";
                    bestTeaser = `Un joueur de ton club (Niveau ${level}) s'intéresse à ton profil.`;
                }
            }

            // Fallback : Phrase générique basée sur le niveau
            if (!bestTeaser) {
                const visitor = recentVisits[0];
                const level = visitor.viewer_profile.niveau_padel ? Math.floor(visitor.viewer_profile.niveau_padel) : "?";
                bestTeaser = `Un joueur de Niveau ${level} a analysé ton profil récemment.`;
            }

            teaserPhrase = bestTeaser;
        } catch (e) {
            console.error("Error generating teaser:", e);
            teaserPhrase = "Plusieurs joueurs consultent ton profil chaque semaine.";
        }
    }

    return {
        success: true,
        visitors: visits,
        isPremium,
        teaserPhrase
    };
}

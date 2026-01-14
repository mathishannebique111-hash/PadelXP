"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import PartnerSuggestions from "@/components/partners/PartnerSuggestions";
import SuggestedMatches from "@/components/partners/SuggestedMatches";
import MatchInvitationsSent from "@/components/profile/MatchInvitationsSent";
import MatchInvitationsReceived from "@/components/profile/MatchInvitationsReceived";
import AcceptedInvitations from "@/components/profile/AcceptedInvitations";
import ChallengesSent from "@/components/profile/ChallengesSent";
import ChallengesReceived from "@/components/profile/ChallengesReceived";

export default function FindPartnersTabContent() {
  const [hasLevel, setHasLevel] = useState<boolean | null>(null);
  const [hasPartner, setHasPartner] = useState<boolean>(false);
  const [hasActiveChallenges, setHasActiveChallenges] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadProfileData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Récupérer le profil pour vérifier le niveau
      const { data: profile } = await supabase
        .from("profiles")
        .select("niveau_padel, niveau_categorie")
        .eq("id", user.id)
        .maybeSingle();

      const hasEvaluatedLevel =
        typeof profile?.niveau_padel === "number" &&
        profile?.niveau_categorie;

      setHasLevel(hasEvaluatedLevel || false);

      // Vérifier s'il a un partenaire habituel
      const response = await fetch('/api/partnerships/list');
      if (response.ok) {
        const { partnerships } = await response.json();
        const hasAcceptedPartner = partnerships.some((p: any) => p.status === 'accepted');
        setHasPartner(hasAcceptedPartner);
      }

      // Vérifier s'il a des défis actifs (envoyés ou reçus)
      const { data: sentChallenges } = await supabase
        .from("team_challenges")
        .select("id")
        .or(`challenger_player_1_id.eq.${user.id},challenger_player_2_id.eq.${user.id}`)
        .in("status", ["pending", "accepted"])
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      const { data: receivedChallenges } = await supabase
        .from("team_challenges")
        .select("id")
        .or(`defender_player_1_id.eq.${user.id},defender_player_2_id.eq.${user.id}`)
        .in("status", ["pending", "accepted"])
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      const hasActiveChallengesResult = (sentChallenges && sentChallenges.length > 0) ||
        (receivedChallenges && receivedChallenges.length > 0);
      setHasActiveChallenges(hasActiveChallengesResult);
    } catch (error) {
      console.error("[FindPartnersTabContent] Erreur chargement profil:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadProfileData();

    // Écouter les événements de mise à jour du profil et du questionnaire
    const handleProfileUpdate = () => {
      loadProfileData();
    };

    const handleQuestionnaireCompleted = () => {
      loadProfileData();
    };

    // Écouter les événements de mise à jour des défis
    const handleChallengeEvent = () => {
      loadProfileData();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    window.addEventListener("questionnaireCompleted", handleQuestionnaireCompleted);
    window.addEventListener("teamChallengeCreated", handleChallengeEvent);
    window.addEventListener("teamChallengeUpdated", handleChallengeEvent);
    window.addEventListener("teamChallengeDeleted", handleChallengeEvent);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("questionnaireCompleted", handleQuestionnaireCompleted);
      window.removeEventListener("teamChallengeCreated", handleChallengeEvent);
      window.removeEventListener("teamChallengeUpdated", handleChallengeEvent);
      window.removeEventListener("teamChallengeDeleted", handleChallengeEvent);
    };
  }, [loadProfileData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section "Trouve ton partenaire" */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Trouve ton partenaire</h2>

        {!hasLevel ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 text-sm text-white/70 font-normal">
            <p>Évalue ton niveau dans l'onglet "Mon profil" pour pouvoir accéder aux suggestions de partenaires.</p>
          </div>
        ) : (
          <>
            {/* Partenaires suggérés */}
            <PartnerSuggestions />

            {/* Propositions de paires envoyées */}
            <MatchInvitationsSent />

            {/* Propositions de paires reçues */}
            <MatchInvitationsReceived />

            {/* Invitations de paires acceptées */}
            <AcceptedInvitations />
          </>
        )}
      </div>

      {/* Section "Trouve ton match" */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Trouve ton match</h2>

        {!hasLevel ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 text-sm text-white/70 font-normal">
            <p>Évalue ton niveau et ajoute un partenaire habituel dans l'onglet "Mon profil" pour pouvoir accéder aux suggestions de matchs personnalisées.</p>
          </div>
        ) : (
          <>
            {/* Matchs suggérés - seulement si le joueur a un partenaire habituel */}
            {hasPartner ? (
              <div className="border-2 border-blue-500/40 rounded-2xl overflow-hidden bg-blue-500/5">
                <SuggestedMatches />
              </div>
            ) : hasActiveChallenges ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 text-sm text-white/70 font-normal">
                <p>Ajoute un partenaire habituel dans l'onglet "Mon profil" pour pouvoir accéder aux suggestions de matchs personnalisées.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 text-sm text-white/70 font-normal">
                <p>Ajoute un partenaire habituel dans l'onglet "Mon profil" pour pouvoir accéder aux suggestions de matchs personnalisées.</p>
              </div>
            )}

            {/* Défis envoyés - toujours visible si le joueur a un niveau évalué */}
            <ChallengesSent />

            {/* Défis reçus - toujours visible si le joueur a un niveau évalué */}
            <ChallengesReceived />
          </>
        )}
      </div>
    </div>
  );
}

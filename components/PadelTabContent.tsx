"use client";

import { useState } from "react";
import PadelProfileSection from "@/components/onboarding/PadelProfileSection";
import LevelAssessmentWizard from "@/components/padel-level/LevelAssessmentWizard";
import LevelBadge from "@/components/padel-level/LevelBadge";
import PartnerSuggestions from "@/components/partners/PartnerSuggestions";
import SuggestedMatches from "@/components/partners/SuggestedMatches";
import { PlayerPartnerCard } from "@/components/mobile/PlayerPartnerCard";
import { Lightbulb, ArrowRight } from "lucide-react";
import MatchInvitationsReceived from "@/components/profile/MatchInvitationsReceived";
import MatchInvitationsSent from "@/components/profile/MatchInvitationsSent";
import AcceptedInvitations from "@/components/profile/AcceptedInvitations";

interface Props {
  profile: any;
}

export default function PadelTabContent({ profile }: Props) {
  const [showWizard, setShowWizard] = useState(false);
  const hasLevel =
    typeof profile.niveau_padel === "number" && profile.niveau_categorie;

  // Cas sans niveau : on affiche uniquement le wizard + le profil padel
  if (!hasLevel) {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <LevelAssessmentWizard />
        </div>
        <PadelProfileSection userId={profile.id} />
        {/* Suggestions de partenaires */}
        <PartnerSuggestions />
        {/* Matchs suggérés (paires) */}
        <SuggestedMatches />
      </div>
    );
  }

  return (
    <div className="space-y-4">


      {/* Résumé niveau + progression + recommandations */}
      <div className="mb-2">
        <div className="bg-white/5 rounded-2xl border border-white/80 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Niveau en petit à gauche */}
            <div className="flex-1 md:max-w-xs">
              <p className="text-xs text-gray-400 mb-1">Niveau actuel</p>
              <p className="text-lg font-semibold text-white mb-2">
                {profile.niveau_padel.toFixed(1)}/10
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {profile.niveau_categorie}
              </p>
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="hidden md:block w-full px-2 py-1.5 text-[10px] rounded-lg border border-white/20 text-white/80 font-medium active:bg-white/10"
              >
                Refaire l&apos;évaluation
              </button>
            </div>

            {/* Progression + recommandations à droite */}
            <div className="flex-1 space-y-3">
              {profile.niveau_padel < 10 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] sm:text-xs text-gray-400">
                      Vers niveau {Math.floor(profile.niveau_padel) + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-blue-400 font-semibold">
                      {(() => {
                        const currentLevel = Math.floor(profile.niveau_padel);
                        const nextThreshold = currentLevel + 0.5;
                        const prevThreshold = currentLevel - 0.5;
                        const progress =
                          ((profile.niveau_padel - prevThreshold) /
                            (nextThreshold - prevThreshold)) *
                          100;
                        return Math.round(
                          Math.min(Math.max(progress, 0), 100)
                        );
                      })()}
                      %
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                      style={{
                        width: `${(() => {
                          const currentLevel = Math.floor(
                            profile.niveau_padel
                          );
                          const nextThreshold = currentLevel + 0.5;
                          const prevThreshold = currentLevel - 0.5;
                          const progress =
                            ((profile.niveau_padel - prevThreshold) /
                              (nextThreshold - prevThreshold)) *
                            100;
                          return Math.min(Math.max(progress, 0), 100);
                        })()}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {profile.niveau_recommendations &&
                Array.isArray(profile.niveau_recommendations) &&
                profile.niveau_recommendations.length > 0 && (
                  <div className="bg-slate-900/40 rounded-xl p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Lightbulb size={16} className="text-yellow-400" />
                      Recommandations
                    </h4>
                    <ul className="space-y-1.5">
                      {profile.niveau_recommendations.map(
                        (rec: string, i: number) => (
                          <li
                            key={i}
                            className="text-[11px] sm:text-xs text-gray-300 flex items-start gap-1.5"
                          >
                            <ArrowRight
                              size={12}
                              className="text-blue-400 flex-shrink-0 mt-0.5"
                            />
                            <span>{rec}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              
              {/* Bouton "Refaire l'évaluation" en bas sur mobile */}
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="md:hidden w-full px-4 py-2.5 text-xs rounded-lg border border-white/20 text-white/80 font-medium active:bg-white/10"
              >
                Refaire l&apos;évaluation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Partenaire habituel */}
      <PlayerPartnerCard />

      {/* Invitations acceptées */}
      <AcceptedInvitations />

      {/* Invitations reçues */}
      <MatchInvitationsReceived />

      {/* Suggestions de partenaires */}
      <PartnerSuggestions />

      {/* Matchs suggérés (paires) */}
      <SuggestedMatches />

      {/* Profil padel détaillé */}
      <PadelProfileSection userId={profile.id} />

      {/* Invitations envoyées */}
      <MatchInvitationsSent />

      {showWizard && <LevelAssessmentWizard />}
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import PadelProfileSection from "@/components/onboarding/PadelProfileSection";
import LevelAssessmentWizard from "@/components/padel-level/LevelAssessmentWizard";
import LevelBadge from "@/components/padel-level/LevelBadge";
import { PlayerPartnerCard } from "@/components/mobile/PlayerPartnerCard";
import { Lightbulb, ArrowRight, Share2 } from "lucide-react";

interface Props {
  profile: any;
}

export default function PadelTabContent({ profile: initialProfile }: Props) {
  const [showWizard, setShowWizard] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [pendingPartnershipRequest, setPendingPartnershipRequest] = useState<{ first_name: string; last_name: string } | null>(null);
  const supabase = createClient();

  // Charger les demandes de partenaires reçues
  useEffect(() => {
    const loadPendingPartnershipRequest = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const response = await fetch('/api/partnerships/list');
        if (response.ok) {
          const { partnerships } = await response.json();
          const receivedRequest = partnerships.find((p: any) => p.status === 'pending' && p.partner_id === user.id);

          if (receivedRequest) {
            // Récupérer le profil du joueur qui a envoyé la demande
            const profileResponse = await fetch('/api/profiles/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: [receivedRequest.player_id] })
            });

            if (profileResponse.ok) {
              const { profiles } = await profileResponse.json();
              const senderProfile = profiles?.find((p: any) => p.id === receivedRequest.player_id);
              if (senderProfile) {
                setPendingPartnershipRequest({
                  first_name: senderProfile.first_name || '',
                  last_name: senderProfile.last_name || ''
                });
              } else {
                setPendingPartnershipRequest(null);
              }
            } else {
              setPendingPartnershipRequest(null);
            }
          } else {
            setPendingPartnershipRequest(null);
          }
        }
      } catch (error) {
        console.error("[PadelTabContent] Erreur chargement demande partenaire:", error);
      }
    };

    loadPendingPartnershipRequest();

    const handleProfileUpdate = () => {
      loadPendingPartnershipRequest();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [supabase]);

  // Écouter les événements de mise à jour du profil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("niveau_padel, niveau_categorie, niveau_recommendations")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("[PadelTabContent] Erreur chargement profil:", error);
          return;
        }

        if (profileData) {
          setProfile((prev: any) => {
            // Ne mettre à jour que si les valeurs existent dans la DB
            // Ne pas écraser avec null si on a déjà des valeurs
            const updated = { ...prev };

            // Mettre à jour seulement si la valeur existe dans la DB
            if (profileData.niveau_padel !== null && profileData.niveau_padel !== undefined) {
              updated.niveau_padel = profileData.niveau_padel;
            }
            if (profileData.niveau_categorie !== null && profileData.niveau_categorie !== undefined) {
              updated.niveau_categorie = profileData.niveau_categorie;
            }
            if (profileData.niveau_recommendations !== null && profileData.niveau_recommendations !== undefined) {
              updated.niveau_recommendations = profileData.niveau_recommendations;
            }

            return updated;
          });
        }
      } catch (error) {
        console.error("[PadelTabContent] Erreur inattendue:", error);
      }
    };

    const handleProfileUpdate = () => {
      loadProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    window.addEventListener("questionnaireCompleted", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("questionnaireCompleted", handleProfileUpdate);
    };
  }, [supabase]);

  const hasLevel =
    typeof profile.niveau_padel === "number" && profile.niveau_categorie;

  // Cas sans niveau : on affiche le wizard + le cadre partenaire habituel (bloqué) + le profil padel
  if (!hasLevel) {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <LevelAssessmentWizard
            onComplete={() => {
              // Le wizard se fermera automatiquement après sauvegarde
              // L'événement profileUpdated déclenchera le rechargement du profil
            }}
          />
        </div>

        {/* Partenaire habituel - toujours affiché, même sans niveau (bloqué) */}
        <PlayerPartnerCard hasLevel={false} pendingRequestSender={pendingPartnershipRequest} />

        {/* Profil padel détaillé */}
        <PadelProfileSection userId={profile.id} />
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
              <div className="flex flex-col gap-2 mt-1">
                {profile.username && (
                  <button
                    type="button"
                    onClick={() => {
                      const username = profile.username.startsWith('@') ? profile.username.substring(1) : profile.username;
                      const url = `${window.location.host === 'localhost:3000' ? 'http://' : 'https://'}${window.location.host}/player/${username}`;

                      if (navigator.share) {
                        navigator.share({
                          title: `Profil PadelXP de ${profile.display_name}`,
                          text: `Découvre mon profil PadelXP et mes stats !`,
                          url: url
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(url).then(() => {
                          alert("Lien copié !");
                        });
                      }
                    }}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-padel-green text-[#071554] font-bold hover:bg-padel-green/90 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-padel-green/20"
                  >
                    <Share2 size={12} className="stroke-[3px]" />
                    Partager mon profil
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-white/10 bg-white/5 text-white/50 font-medium hover:bg-white/10 transition-all"
                >
                  Refaire l&apos;évaluation
                </button>
              </div>
            </div>

            {/* Progression + recommandations à droite */}
            <div className="flex-1 space-y-3">
              {profile.niveau_padel < 10 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] sm:text-xs text-gray-400">
                      Vers niveau {Math.floor(profile.niveau_padel) + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-padel-green font-semibold">
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
                      className="h-full bg-padel-green transition-all duration-500"
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
                      <Lightbulb size={16} className="text-white" />
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
                              className="text-padel-green flex-shrink-0 mt-0.5"
                            />
                            <span>{rec}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

            </div>
          </div>
        </div>
      </div>

      {/* Partenaire habituel */}
      <PlayerPartnerCard hasLevel={true} />

      {/* Profil padel détaillé */}
      <PadelProfileSection userId={profile.id} />

      {showWizard && <LevelAssessmentWizard />}
    </div>
  );
}


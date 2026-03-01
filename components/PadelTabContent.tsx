"use client";

import { useState } from "react";
import { Share2, Lightbulb, ArrowRight } from "lucide-react";
import LevelAssessmentWizard from "@/components/padel-level/LevelAssessmentWizard";
import PadelProfileSection from "@/components/onboarding/PadelProfileSection";
import { PlayerPartnerCard } from "@/components/mobile/PlayerPartnerCard";

interface PadelTabContentProps {
  profile: any;
}

export default function PadelTabContent({ profile }: PadelTabContentProps) {
  const [showWizard, setShowWizard] = useState(false);

  if (!profile || !profile.niveau_padel) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-2xl border border-white/10 text-center">
        <div className="w-16 h-16 bg-padel-green/10 rounded-full flex items-center justify-center mb-4">
          <Lightbulb className="text-padel-green" size={32} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Configure ton profil Padel</h3>
        <p className="text-gray-400 mb-6 max-w-xs">
          Évalue ton niveau pour trouver les meilleurs partenaires et suivre ta progression.
        </p>
        <button
          onClick={() => setShowWizard(true)}
          className="px-6 py-3 bg-padel-green text-[#071554] font-black rounded-xl hover:bg-padel-green/90 transition-all shadow-lg shadow-padel-green/20"
        >
          DÉMARRER L'ÉVALUATION
        </button>

        {showWizard && (
          <LevelAssessmentWizard
            forceStart={true}
            onCancel={() => setShowWizard(false)}
            onComplete={() => setShowWizard(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé niveau + progression + recommandations */}
      <div className="mb-2">
        <div className="bg-white/5 rounded-2xl border border-white/80 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Niveau - Design Circulaire Élégant */}
            <div className="flex-1 md:max-w-xs flex flex-col items-center md:items-start group">
              <div className="relative mb-6">
                {/* Lueur subtile en arrière-plan */}
                <div className="absolute inset-0 bg-padel-green/5 blur-2xl rounded-full scale-110 pointer-events-none"></div>

                {/* Cercle Unique Élégant + Jauge de Progression */}
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-slate-900/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(185,255,0,0.05)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(185,255,0,0.1)]">

                  {/* SVG Jauge Circulaire */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Fond de la jauge (gris transparent) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-white/10"
                    />
                    {/* Jauge active (vert padel) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="#BFFF00"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="289"
                      strokeDashoffset={289 - (289 * (profile.niveau_padel % 1))}
                      className="transition-all duration-1000 ease-out drop-shadow-[0_0_6px_rgba(191,255,0,0.4)]"
                    />
                  </svg>

                  {/* Contenu textuel au centre */}
                  <div className="flex flex-col items-center justify-center z-10">
                    <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-medium text-padel-green/80 mb-1">
                      Niveau
                    </span>
                    <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-md">
                      {profile.niveau_padel.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-[220px]">
                {profile.username && (
                  <button
                    type="button"
                    onClick={() => {
                      const username = profile.username.startsWith('@') ? profile.username.substring(1) : profile.username;
                      const url = `${window.location.host === 'localhost:3000' ? 'http://' : 'https://'}${window.location.host}/share/${username}`;

                      if (navigator.share) {
                        navigator.share({
                          title: `Profil PadelXP de ${profile.display_name}`,
                          text: `Découvre mon profil PadelXP !`,
                          url: url
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(url).then(() => {
                          alert("Lien copié !");
                        });
                      }
                    }}
                    className="w-full px-4 py-3 text-[13px] rounded-xl bg-padel-green text-[#071554] font-black hover:bg-padel-green/90 flex items-center justify-center gap-2 transition-all shadow-lg shadow-padel-green/20 active:scale-95"
                  >
                    <Share2 size={14} className="stroke-[3px]" />
                    PARTAGER MON PROFIL
                  </button>
                )}
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
                      {Math.round((profile.niveau_padel % 1) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-padel-green transition-all duration-500"
                      style={{
                        width: `${Math.round((profile.niveau_padel % 1) * 100)}%`,
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

              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="w-full px-4 py-3 text-[13px] rounded-xl border border-white/10 bg-white/5 text-white/50 font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                REFAIRE L'ÉVALUATION
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Partenaire habituel */}
      <PlayerPartnerCard hasLevel={true} />

      {/* Profil padel détaillé */}
      <PadelProfileSection userId={profile.id} initialData={profile} />

      {showWizard && (
        <LevelAssessmentWizard
          forceStart={true}
          onCancel={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

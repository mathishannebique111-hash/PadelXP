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
  const isClub = typeof window !== 'undefined' && !!document.body.dataset.clubSubdomain;
  const isLightBg = typeof window !== 'undefined' && document.documentElement.classList.contains('club-light-bg');


  if (!profile || !profile.niveau_padel) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-2xl border border-white/10 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 191,255,0), 0.1)' }}>
          <Lightbulb size={32} style={{ color: 'rgb(var(--theme-secondary-accent))' }} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Configure ton profil Padel</h3>
        <p className="text-gray-400 mb-6 max-w-xs">
          Évalue ton niveau pour trouver les meilleurs partenaires et suivre ta progression.
        </p>
        <button
          onClick={() => setShowWizard(true)}
          className="px-6 py-3 font-black rounded-xl transition-all shadow-lg"
          style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: 'var(--theme-player-page, #071554)', boxShadow: '0 0 15px rgba(var(--theme-secondary-accent, 191,255,0), 0.2)' }}
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
        <div className="bg-white/5 rounded-2xl border p-4 sm:p-5" style={{ borderColor: typeof window !== 'undefined' && document.body.dataset.clubSubdomain ? 'rgb(var(--theme-accent))' : 'rgba(255,255,255,0.8)' }}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Niveau - Design Circulaire Élégant */}
            <div className="flex-1 md:max-w-xs flex flex-col items-center md:items-start group">
              <div className="relative mb-6">
                {/* Lueur subtile en arrière-plan */}
                <div className="absolute inset-0 blur-2xl rounded-full scale-110 pointer-events-none" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 191,255,0), 0.05)' }}></div>

                {/* Cercle Unique Élégant + Jauge de Progression */}
                <div className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-all duration-300 ${isClub ? '' : 'bg-slate-900/50 backdrop-blur-md shadow-[0_0_20px_rgba(185,255,0,0.05)] hover:shadow-[0_0_25px_rgba(185,255,0,0.1)]'}`}
                  style={isClub ? { backgroundColor: isLightBg ? 'rgb(var(--theme-page))' : 'rgba(0,0,0,0.2)', backdropBlur: '10px' } : {}}>

                  {/* SVG Jauge Circulaire */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Fond de la jauge (gris transparent ou fond page) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={isClub && isLightBg ? "" : "text-white/10"}
                      style={isClub && isLightBg ? { color: 'rgb(var(--theme-page))' } : {}}
                    />
                    {/* Jauge active (vert padel / club accent) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke={isClub ? "rgb(var(--theme-accent))" : "rgb(var(--theme-secondary-accent))"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="289"
                      strokeDashoffset={289 - (289 * (profile.niveau_padel % 1))}
                      className="transition-all duration-1000 ease-out"
                      style={{ filter: isClub ? `drop-shadow(0 0 6px rgba(var(--theme-accent), 0.4))` : "drop-shadow(0 0 6px rgba(var(--theme-secondary-accent, 191, 255, 0), 0.4))" }}
                    />
                  </svg>

                  {/* Contenu textuel au centre */}
                  <div className="flex flex-col items-center justify-center z-10">
                    <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-medium mb-1" style={{ color: isClub ? 'rgb(var(--theme-accent))' : 'rgba(var(--theme-secondary-accent, 191,255,0), 0.8)' }}>
                      Niveau
                    </span>
                    <span className="text-5xl sm:text-6xl font-black tracking-tighter drop-shadow-md" style={{ color: isClub ? 'rgb(var(--theme-accent))' : 'white' }}>
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
                    className="w-full px-4 py-3 text-[13px] rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: 'var(--theme-player-page, #071554)', boxShadow: '0 0 15px rgba(var(--theme-secondary-accent, 191,255,0), 0.2)' }}
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
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>
                      {Math.round((profile.niveau_padel % 1) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        backgroundColor: 'rgb(var(--theme-secondary-accent))',
                        width: `${Math.round((profile.niveau_padel % 1) * 100)}%`
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
                              className="flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--theme-secondary-accent))' }}
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

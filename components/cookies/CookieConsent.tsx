"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { logger } from '@/lib/logger';

type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_CONSENT_KEY = "cookie_consent";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Toujours activé
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Vérifier si le consentement a déjà été donné
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Afficher le bandeau après un court délai pour une meilleure UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Charger les préférences sauvegardées
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch (e) {
        logger.error("Error parsing cookie consent:", e);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setShowBanner(false);
    setShowPreferences(false);

    // Appliquer les cookies selon les préférences
    if (prefs.analytics) {
      // Ici, vous pourriez initialiser Google Analytics ou autre outil analytique
      logger.info("Analytics cookies enabled");
    }
    if (prefs.marketing) {
      // Ici, vous pourriez initialiser des cookies marketing
      logger.info("Marketing cookies enabled");
    }
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    savePreferences(onlyNecessary);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner && !showPreferences) {
    return null;
  }

  return (
    <>
      {/* Bandeau de consentement */}
      {showBanner && !showPreferences && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="flex justify-center w-full mb-4 is-app:mb-12">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-md w-full backdrop-blur-xl bg-opacity-95 ring-1 ring-white/20">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-white text-base font-bold leading-relaxed">
                    🍪 Vos préférences de cookies
                  </p>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Nous utilisons des cookies pour assurer le bon fonctionnement du site et améliorer votre expérience.
                    Merci de faire votre choix avant de continuer.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleAcceptAll}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-lg active:scale-95"
                  >
                    Tout accepter
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowPreferences(true)}
                      className="py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition-colors border border-white/10"
                    >
                      Personnaliser
                    </button>
                    <button
                      onClick={handleRejectAll}
                      className="py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition-colors border border-white/10"
                    >
                      Tout refuser
                    </button>
                  </div>
                </div>

                <p className="text-white/40 text-[10px]">
                  En acceptant, vous consentez à notre{" "}
                  <Link href="/cookies" className="text-white/60 underline hover:text-white/80">
                    Politique des Cookies
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de préférences détaillées */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">
              Gérer vos préférences de cookies
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Vous pouvez accepter ou refuser les cookies par catégorie. Les cookies
              strictement nécessaires ne peuvent pas être désactivés.
            </p>

            <div className="space-y-4 mb-6">
              {/* Cookies nécessaires */}
              <div className="border border-white/20 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-white">Cookies strictement nécessaires</h3>
                    <p className="text-sm text-white/60 mt-1">
                      Ces cookies sont essentiels au fonctionnement du site (authentification, sécurité).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.necessary}
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-xs text-white/40 italic">
                  Toujours activés (obligatoires)
                </p>
              </div>

              {/* Cookies analytiques */}
              <div className="border border-white/20 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-white">Cookies analytiques</h3>
                    <p className="text-sm text-white/60 mt-1">
                      Ces cookies nous aident à comprendre comment vous utilisez le site pour l'améliorer.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-xs text-white/40">
                  Actuellement non utilisés sur PadelXP
                </p>
              </div>

              {/* Cookies marketing */}
              <div className="border border-white/20 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-white">Cookies marketing</h3>
                    <p className="text-sm text-white/60 mt-1">
                      Ces cookies sont utilisés pour la publicité et le ciblage personnalisé.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences({ ...preferences, marketing: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-xs text-white/40">
                  Actuellement non utilisés sur PadelXP
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/20">
              <button
                onClick={handleSavePreferences}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-lg active:scale-95 order-1 sm:order-2"
              >
                Confirmer mes choix
              </button>
              <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
                <button
                  onClick={handleRejectAll}
                  className="flex-1 sm:px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors border border-white/10"
                >
                  Refuser
                </button>
                <button
                  onClick={() => {
                    setShowPreferences(false);
                    setShowBanner(true);
                  }}
                  className="flex-1 sm:px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors border border-white/10"
                >
                  Annuler
                </button>
              </div>
            </div>

            <p className="text-xs text-white/40 mt-4">
              Vous pouvez modifier vos préférences à tout moment.{" "}
              <Link href="/cookies" className="text-white/60 underline hover:text-white/80">
                En savoir plus
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}


"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logger } from '@/lib/logger';

type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_CONSENT_KEY = "cookie_consent";

export default function CookiePreferencesManager() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Charger les préférences depuis localStorage
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent) {
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
        setHasConsent(true);
      } catch (e) {
        logger.error("Error parsing cookie consent:", e);
      }
    }
    setLoading(false);
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setHasConsent(true);
    setSaved(true);

    // Appliquer les cookies selon les préférences
    if (prefs.analytics) {
      logger.info("Analytics cookies enabled");
      // Ici, vous pourriez initialiser Google Analytics ou autre outil analytique
    } else {
      // Désactiver les cookies analytiques si nécessaire
      logger.info("Analytics cookies disabled");
    }

    if (prefs.marketing) {
      logger.info("Marketing cookies enabled");
      // Ici, vous pourriez initialiser des cookies marketing
    } else {
      // Désactiver les cookies marketing si nécessaire
      logger.info("Marketing cookies disabled");
    }

    // Cacher le message de confirmation après 3 secondes
    setTimeout(() => setSaved(false), 3000);
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

  const handleSave = () => {
    savePreferences(preferences);
    // Rediriger vers la page de facturation après un court délai pour laisser voir le message de confirmation
    setTimeout(() => {
      router.push("/dashboard/facturation");
    }, 1500);
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/20 rounded-2xl p-8 text-center">
        <p className="text-white/60">Chargement de vos préférences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message de confirmation */}
      {saved && (
        <div className="bg-emerald-500/20 border border-emerald-400/50 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-emerald-300 font-semibold">Préférences sauvegardées</p>
            <p className="text-emerald-200/80 text-sm">Vos préférences de cookies ont été mises à jour.</p>
          </div>
        </div>
      )}

      {/* Statut actuel */}
      <div className="bg-white/5 border border-white/20 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Statut du consentement</p>
            <p className="text-white/60 text-sm mt-1">
              {hasConsent
                ? "Vous avez déjà configuré vos préférences de cookies"
                : "Aucune préférence enregistrée. Configurez vos préférences ci-dessous."
              }
            </p>
          </div>
          {hasConsent && (
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 text-xs font-semibold">
              Configuré
            </span>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white/5 border border-white/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Actions rapides</h2>
        <p className="text-white/60 text-sm mb-4">
          Accepter ou refuser tous les cookies d'un coup.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAcceptAll}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Accepter tout
          </button>
          <button
            onClick={handleRejectAll}
            className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/20"
          >
            Refuser tout (nécessaires uniquement)
          </button>
        </div>
      </div>

      {/* Préférences détaillées */}
      <div className="bg-white/5 border border-white/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Préférences détaillées</h2>
        <p className="text-white/60 text-sm mb-6">
          Personnalisez vos préférences par catégorie. Les cookies strictement nécessaires
          ne peuvent pas être désactivés car ils sont essentiels au fonctionnement du site.
        </p>

        <div className="space-y-4 mb-6">
          {/* Cookies nécessaires */}
          <div className="border border-white/20 rounded-lg p-5 bg-black/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white text-lg">Cookies strictement nécessaires</h3>
                  <span className="rounded-full bg-blue-500/20 text-blue-300 px-2 py-0.5 text-xs font-semibold">
                    Obligatoire
                  </span>
                </div>
                <p className="text-sm text-white/70 mb-2">
                  Ces cookies sont essentiels au fonctionnement du site. Ils permettent l'authentification,
                  la sécurité, la gestion de session et le stockage de vos préférences.
                </p>
                <p className="text-xs text-white/50">
                  Exemples : cookies de session, tokens d'authentification, préférences utilisateur.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.necessary}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <p className="text-xs text-white/40 italic mt-3 pt-3 border-t border-white/10">
              Toujours activés (obligatoires pour le fonctionnement du site)
            </p>
          </div>

          {/* Cookies analytiques */}
          <div className="border border-white/20 rounded-lg p-5 bg-black/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white text-lg">Cookies analytiques</h3>
                  <span className="rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.5 text-xs font-semibold">
                    Optionnel
                  </span>
                </div>
                <p className="text-sm text-white/70 mb-2">
                  Ces cookies nous aident à comprendre comment vous utilisez le site pour l'améliorer.
                  Ils collectent des informations anonymes sur votre navigation (pages visitées, temps passé, etc.).
                </p>
                <p className="text-xs text-white/50">
                  Exemples : Google Analytics, outils d'analyse de trafic, statistiques d'utilisation.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences({ ...preferences, analytics: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${preferences.analytics
                    ? "bg-emerald-600 peer-checked:bg-emerald-600"
                    : "bg-gray-600 peer-checked:bg-emerald-600"
                  }`}></div>
              </label>
            </div>
            <p className="text-xs text-white/50 mt-3">
              {preferences.analytics
                ? "✅ Cookies analytiques activés"
                : "❌ Cookies analytiques désactivés (actuellement non utilisés sur PadelXP)"}
            </p>
          </div>

          {/* Cookies marketing */}
          <div className="border border-white/20 rounded-lg p-5 bg-black/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white text-lg">Cookies marketing</h3>
                  <span className="rounded-full bg-orange-500/20 text-orange-300 px-2 py-0.5 text-xs font-semibold">
                    Optionnel
                  </span>
                </div>
                <p className="text-sm text-white/70 mb-2">
                  Ces cookies sont utilisés pour la publicité personnalisée, le ciblage publicitaire
                  et le suivi de vos interactions avec nos campagnes marketing.
                </p>
                <p className="text-xs text-white/50">
                  Exemples : cookies publicitaires, pixels de suivi, outils de remarketing.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) =>
                    setPreferences({ ...preferences, marketing: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${preferences.marketing
                    ? "bg-emerald-600 peer-checked:bg-emerald-600"
                    : "bg-gray-600 peer-checked:bg-emerald-600"
                  }`}></div>
              </label>
            </div>
            <p className="text-xs text-white/50 mt-3">
              {preferences.marketing
                ? "✅ Cookies marketing activés"
                : "❌ Cookies marketing désactivés (actuellement non utilisés sur PadelXP)"}
            </p>
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end pt-4 border-t border-white/20">
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enregistrer mes préférences
          </button>
        </div>
      </div>

      {/* Informations supplémentaires */}
      <div className="bg-white/5 border border-white/20 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-3">Informations supplémentaires</h3>
        <div className="space-y-2 text-sm text-white/70">
          <p>
            • Vous pouvez modifier vos préférences à tout moment en revenant sur cette page.
          </p>
          <p>
            • Les modifications sont appliquées immédiatement après sauvegarde.
          </p>
          <p>
            • Pour plus d'informations, consultez notre{" "}
            <Link href="/cookies" className="text-white underline hover:text-white/80">
              Politique des Cookies
            </Link>
            {" "}et notre{" "}
            <Link href="/privacy" className="text-white underline hover:text-white/80">
              Politique de Confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}


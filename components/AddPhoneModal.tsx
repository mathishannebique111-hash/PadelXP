"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AddPhoneModalProps {
  isOpen: boolean;
  partnerFirstName?: string;
  onClose: () => void;
  onActivated?: () => Promise<void> | void;
}

const CGU_VERSION = "v1_whatsapp_coordination";

type CountryOption = {
  code: string;
  label: string;
  flag: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+32", label: "Belgique", flag: "🇧🇪" },
  { code: "+41", label: "Suisse", flag: "🇨🇭" },
];

export default function AddPhoneModal({
  isOpen,
  partnerFirstName,
  onClose,
  onActivated,
}: AddPhoneModalProps) {
  const [country, setCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [localDigits, setLocalDigits] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const subtitleName = partnerFirstName || "votre partenaire";

  // Détection simple du pays via la langue du navigateur
  useEffect(() => {
    if (typeof window === "undefined") return;
    const lang = navigator.language?.toLowerCase() || "";

    if (lang.includes("ch")) {
      const ch = COUNTRY_OPTIONS.find((c) => c.code === "+41");
      if (ch) setCountry(ch);
    } else if (lang.includes("be")) {
      const be = COUNTRY_OPTIONS.find((c) => c.code === "+32");
      if (be) setCountry(be);
    } else {
      const fr = COUNTRY_OPTIONS.find((c) => c.code === "+33");
      if (fr) setCountry(fr);
    }
  }, []);

  const handleClose = () => {
    if (isSaving) return;
    setError(null);
    onClose();
  };

  const handleLocalChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    // Accepte 06... mais enlève le 0 pour le stockage / formatage
    const withoutLeadingZero = digitsOnly.replace(/^0/, "");
    const trimmed = withoutLeadingZero.slice(0, 10);
    setLocalDigits(trimmed);
  };

  const formattedLocal = (() => {
    if (!localDigits) return "";
    const d = localDigits;
    const parts: string[] = [];
    if (d.length >= 1) {
      parts.push(d.slice(0, 1));
    }
    for (let i = 1; i < d.length; i += 2) {
      parts.push(d.slice(i, i + 2));
    }
    return parts.join(" ");
  })();

  const handleActivate = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validation très permissive sur la partie locale
      const cleanPhone = localDigits;
      const isValidLength = cleanPhone.length >= 9 && cleanPhone.length <= 15;
      const isValidFormat = /^[0-9]+$/.test(cleanPhone);

      if (!isValidLength || !isValidFormat) {
        setError("Merci de renseigner un numéro valide.");
        setIsSaving(false);
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Session expirée. Veuillez vous reconnecter.");
        setIsSaving(false);
        return;
      }

      const fullNumber = `${country.code}${localDigits}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone_number: fullNumber,
          whatsapp_enabled: true,
          phone_consent_at: new Date().toISOString(),
          phone_consent_version: CGU_VERSION,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("[AddPhoneModal] Erreur update profil", updateError);
        setError("Impossible d'enregistrer votre numéro. Merci de réessayer.");
        setIsSaving(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }

      if (onActivated) {
        await onActivated();
      }

      setIsSaving(false);
      onClose();
    } catch (e) {
      console.error("[AddPhoneModal] Erreur inattendue", e);
      setError("Erreur inattendue. Merci de réessayer.");
      setIsSaving(false);
    }
  };

  // Validation simple sur longueur locale + consentement (même logique que dans handleActivate)
  const baseValidLength = localDigits.length >= 9 && localDigits.length <= 15;
  const baseValidFormat = /^[0-9]+$/.test(localDigits || "");
  const canActivate = baseValidLength && baseValidFormat && hasConsent && !isSaving;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/15 border border-blue-400/40">
                  <Phone className="w-4 h-4 text-blue-300" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base font-semibold text-white">
                    Ajoutez votre numéro
                  </h2>
                  <p className="text-xs text-slate-300/80 mt-0.5">
                    Pour organiser le match avec {subtitleName}, partagez votre
                    WhatsApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pt-4 pb-5 space-y-4">
              {/* Champ téléphone : indicatif + numéro local */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">
                  Numéro de téléphone
                </label>
                <div className="flex gap-2">
                  {/* Sélecteur d'indicatif pays */}
                  <div className="relative">
                    {/* Drapeau caché sur mobile */}
                    <div className="hidden md:flex pointer-events-none absolute inset-y-0 left-3 items-center">
                      <span className="text-sm">{country.flag}</span>
                    </div>
                    <select
                      value={country.code}
                      onChange={(e) => {
                        const next = COUNTRY_OPTIONS.find(
                          (c) => c.code === e.target.value
                        );
                        if (next) setCountry(next);
                      }}
                      className="appearance-none pr-6 md:pl-8 pl-3 py-2.5 rounded-lg border border-white/10 bg-slate-900/80 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-400"
                    >
                      {COUNTRY_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label} ({opt.code})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>

                  {/* Numéro local */}
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={formattedLocal}
                      onChange={(e) => handleLocalChange(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/80 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-400"
                      placeholder="6 12 34 56 78"
                    />
                  </div>
                </div>
              </div>

              {/* Consentement */}
              <div className="space-y-1">
                <label className="flex items-start gap-2 rounded-lg bg-slate-900/70 border border-slate-700/80 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConsent}
                    onChange={(e) => setHasConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-500 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-200">
                    J&apos;accepte de partager mon numéro avec mes partenaires.
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 px-1">
                  Vous pourrez le supprimer à tout moment dans vos paramètres.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 pt-2 border-t border-white/5 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="w-full sm:w-auto rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 active:bg-white/10 disabled:opacity-60"
              >
                Plus tard
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={!canActivate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? "Activation..." : "Activer"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


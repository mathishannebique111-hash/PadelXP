"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  Target,
  RefreshCw,
  Save,
  Award,
  Lightbulb,
  ArrowRight,
  Brain,
  Zap,
  Check,
} from "lucide-react";
import type { LevelResult } from "@/lib/padel/levelCalculator";
import LevelResultContent from "./LevelResultContent";

interface Props {
  result: LevelResult;
  onRetake: () => void;
  onSaved?: () => void;
}

export default function LevelResultCard({ result, onRetake, onSaved }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (isSaving || isSaved) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/padel-level/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niveau: result.niveau,
          categorie: result.categorie,
          breakdown: result.breakdown,
          recommendations: [result.tips.technique, result.tips.tactique, result.tips.mental],
        }),
      });

      if (response.ok) {
        setIsSaved(true);

        // Déclencher la mise à jour des suggestions de partenaires
        if (typeof window !== "undefined") {
          // Événement personnalisé pour mettre à jour les suggestions
          window.dispatchEvent(new Event("questionnaireCompleted"));

          // Synchroniser avec localStorage pour cross-tab
          try {
            localStorage.setItem("questionnaireCompleted", "true");
            // Retirer le flag après un court délai
            setTimeout(() => {
              localStorage.removeItem("questionnaireCompleted");
            }, 1000);
          } catch (e) {
            // Ignorer les erreurs localStorage
          }

          // Notifier les composants pour mettre à jour le profil sans recharger
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("profileUpdated"));
            window.dispatchEvent(new CustomEvent("questionnaireCompleted"));
          }
        }

        // Fermer le wizard après un court délai pour laisser voir le message "Niveau sauvegardé !"
        if (onSaved) {
          setTimeout(() => {
            onSaved();
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Erreur sauvegarde niveau padel", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#172554] pb-28">
      {/* Header fixe avec logo - Identique au questionnaire */}
      <div className="sticky top-0 z-50 px-4 pt-6 pb-2 bg-[#172554]/80 backdrop-blur-md" style={{ paddingTop: 'calc(var(--sat, 0px) + 1.5rem)' }}>
        <div className="flex justify-center mb-4 relative z-[100001]">
          <div className="relative w-32 h-10">
            <Image
              src="/padelxp-logo-transparent.png"
              alt="PadelXP"
              fill
              className="object-contain"
              style={{
                filter: 'brightness(0) invert(1)'
              }}
              priority
            />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-3xl mx-auto px-4 mt-4"
      >
        <LevelResultContent result={result} />
      </motion.div>

      {/* Boutons fixés en bas - mobile-first */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 px-4 py-4 pb-8 sm:pb-10">
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className="w-full sm:flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/40"
          >
            {isSaved ? (
              <>
                <Check size={18} />
                <span>NIVEAU ENREGISTRÉ</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{isSaving ? "CHARGEMENT..." : "SAUVEGARDER MON NIVEAU"}</span>
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onRetake}
            className="w-full sm:w-auto px-6 py-4 rounded-xl border border-white/10 text-white/60 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={14} />
            <span>Refaire</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}


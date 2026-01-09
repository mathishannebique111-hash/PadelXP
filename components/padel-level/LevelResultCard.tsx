"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { LevelResult } from "@/lib/padel/levelCalculator";
import LevelRadarChart from "./LevelRadarChart";

interface Props {
  result: LevelResult;
  onRetake: () => void;
}

export default function LevelResultCard({ result, onRetake }: Props) {
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
          recommendations: result.recommendations,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        if (typeof window !== "undefined") {
          // Rafraîchir le profil pour afficher le niveau sauvegardé
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("Erreur sauvegarde niveau padel", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6 pb-24">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-6 max-w-3xl mx-auto"
      >
        {/* En-tête résultat - mobile-first */}
        <div className="text-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <div className="relative z-10">
            <Trophy
              size={48}
              className="mx-auto text-yellow-500 mb-3 md:hidden"
            />
            <Trophy
              size={64}
              className="mx-auto text-yellow-500 mb-4 hidden md:block"
            />

            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-3">
              Niveau {result.niveau}/10
            </h1>

            <p className="text-lg md:text-2xl text-gray-300 font-medium">
              {result.categorie}
            </p>

            {result.niveau >= 9 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 inline-block px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white text-sm md:text-base font-bold flex items-center gap-2"
              >
                <Award size={18} />
                Niveau d&apos;élite !
              </motion.div>
            )}
          </div>
        </div>

        {/* Graphique radar */}
        <div className="bg-slate-800 rounded-2xl p-4 md:p-8 shadow-xl">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Target size={20} />
            Analyse détaillée
          </h2>
          <LevelRadarChart breakdown={result.breakdown} />
        </div>

        {/* Points forts / faibles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
              <TrendingUp size={18} />
              Points forts
            </h3>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <motion.li
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-sm md:text-base text-green-300 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
              <Target size={18} />
              Axes d'amélioration
            </h3>
            <ul className="space-y-2">
              {result.weaknesses.map((w, i) => (
                <motion.li
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-sm md:text-base text-orange-300 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  {w}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommandations */}
        <div className="bg-slate-800 rounded-2xl p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Lightbulb size={20} className="text-yellow-400" />
            Recommandations
          </h3>
          <ul className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <motion.li
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.15 }}
                className="text-sm md:text-base text-gray-300 flex items-center gap-2"
              >
                <ArrowRight size={16} className="text-blue-400 flex-shrink-0" />
                <span>{rec}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Progression vers niveau suivant */}
        {result.niveau < 10 && (
          <div className="bg-slate-800 rounded-2xl p-4 md:p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs md:text-sm text-gray-400">
                Vers niveau {result.niveau + 1}
              </span>
              <span className="text-sm md:text-base text-blue-400 font-bold">
                {Math.round(result.nextLevelProgress)}%
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${result.nextLevelProgress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Boutons fixés en bas - mobile-first */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900 border-t border-slate-800 px-4 py-4">
        <div className="flex flex-col md:flex-row gap-3 max-w-3xl mx-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className="w-full md:flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          >
            {isSaved ? (
              <>
                <Trophy size={18} />
                <span>Niveau sauvegardé !</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{isSaving ? "Sauvegarde..." : "Sauvegarder"}</span>
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onRetake}
            className="w-full md:w-auto px-6 py-4 rounded-xl border border-gray-700 text-gray-300 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <RefreshCw size={18} />
            <span>Refaire</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}


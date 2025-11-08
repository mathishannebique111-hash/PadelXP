"use client";

import { motion } from "framer-motion";
import LeaderboardPreviewMini from "@/components/landing/LeaderboardPreviewMini";

const features = [
  // Inversés: le premier devient "Système de badges" et le second "Classement en temps réel"
  {
    title: "🏅 Système de badges",
    description: "Gagne des badges uniques selon tes performances.",
    gridClass: "md:col-span-1 md:row-span-2",
    gradient: "from-[#0066FF] to-[#0052CC]",
    showBadgesPreview: true,
  },
  {
    title: "📊 Classement en temps réel",
    description: "Classement mis à jour après chaque match.",
    gridClass: "md:col-span-2 md:row-span-2",
    gradient: "from-[#0066FF] to-[#0052CC]",
    showLeaderboard: true,
  },
  {
    title: "⚡ Enregistrement instantané",
    description: "Soumets un résultat en quelques secondes.",
    gridClass: "md:col-span-2 md:row-span-1",
    gradient: "from-[#0066FF] to-[#0052CC]",
    showForm: true,
  },
  {
    title: "📊 Historique des matchs",
    description: "Retrouve tous tes résultats et scores par date.",
    gridClass: "md:col-span-1 md:row-span-1",
    gradient: "from-[#0066FF] to-[#0052CC]",
  },
];

function MatchFormPreview() {
  return (
    <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="space-y-5">
        {/* Titre */}
        <div className="text-white/80 font-semibold">Équipe gagnante</div>
        {/* Boutons équipes */}
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-xl bg-lime-400 text-gray-900 font-semibold py-3 shadow-[0_8px_26px_rgba(191,255,0,0.35)] ring-1 ring-lime-300/60 flex items-center justify-center gap-2"
            aria-label="Équipe 1 sélectionnée"
            type="button"
          >
            <span>🏆</span>
            <span>Équipe 1</span>
          </button>
          <button
            className="flex-1 rounded-xl bg-transparent text-white/80 border border-white/30 py-3 flex items-center justify-center gap-2"
            aria-label="Choisir l’équipe 2"
            type="button"
          >
            <span>🏆</span>
            <span>Équipe 2</span>
          </button>
        </div>

        {/* Scores des sets */}
        <div className="space-y-3">
          <div className="text-white/80 font-semibold">Scores des sets <span className="text-white/50">*</span></div>
          <div className="space-y-3">
            {[1,2].map((i)=> (
              <div key={i} className="flex items-center justify-between">
                <div className="text-white/80">Set {i}</div>
                <div className="flex items-center gap-3">
                  <input
                    className="w-16 h-10 rounded-xl bg-white text-gray-900 text-center font-semibold outline-none focus:ring-2 focus:ring-[#0066FF]"
                    value={0}
                    readOnly
                  />
                  <span className="text-white/60">-</span>
                  <input
                    className="w-16 h-10 rounded-xl bg-white text-gray-900 text-center font-semibold outline-none focus:ring-2 focus:ring-[#0066FF]"
                    value={0}
                    readOnly
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton d'action retiré pour la preview */}
      </div>
    </div>
  );
}

export default function FeaturesGrid() {
  return (
    <section className="relative py-24 bg-black">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            Tout pour{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              dominer le terrain
            </span>
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              whileHover={{ scale: 1.02, rotateY: 5 }}
              className={`${feature.gridClass} relative group rounded-2xl p-8 bg-black border-2 border-white/10 hover:border-[#0066FF]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,102,255,0.3)]`}
            >
              {/* Gradient background au hover */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              />

              {/* Contenu */}
              <div className="relative z-10">
                <div className="text-4xl mb-4">{feature.title.split(" ")[0]}</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {feature.title.split(" ").slice(1).join(" ")}
                </h3>
                <p className="text-white/60 text-sm">{feature.description}</p>

                {/* Détails visuels */}
                {feature.showLeaderboard && (
                  <div className="mt-4">
                    <LeaderboardPreviewMini />
                  </div>
                )}

                {feature.showBadgesPreview && (
                  <div className="mt-6 flex gap-2 flex-wrap">
                    {["🏆", "🔥", "👑", "⭐", "🎖️", "💯"].map((badge, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="text-3xl"
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      >
                        {badge}
                      </motion.div>
                    ))}
                  </div>
                )}

                {feature.showForm && <MatchFormPreview />}

                {idx === 3 && (
                  <div className="mt-6 space-y-3">
                    {[
                      { date: "Hier", score: "6-3, 6-4", result: "W" },
                      { date: "Lundi", score: "4-6, 6-4", result: "W" },
                      { date: "Dimanche", score: "5-7, 4-6", result: "L" }
                    ].map((m, i) => {
                      const won = m.result === 'W';
                      return (
                        <div
                          key={i}
                          className={`rounded-2xl border-2 p-4 transition-all ${
                            won
                              ? "border-green-500 bg-green-50"
                              : "border-red-300 bg-red-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl ${won ? "text-green-600" : "text-red-600"}`}>
                              {won ? "🏆" : "❌"}
                            </span>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">
                                {won ? "Victoire" : "Défaite"}
                              </div>
                              <div className="text-xs text-gray-600">{m.date}</div>
                              <div className="text-xs text-gray-700 mt-1">{m.score}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

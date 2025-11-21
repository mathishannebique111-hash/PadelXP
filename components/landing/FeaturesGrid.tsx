"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import LeaderboardPreviewMini from "@/components/landing/LeaderboardPreviewMini";

const features = [
  // Échangés: les deux premiers cadres sont maintenant en bas
  {
    title: "Enregistrement instantané",
    description: "Soumets un résultat en quelques secondes.",
    gridClass: "md:col-span-2 md:row-span-1",
    gradient: "from-[#0066FF] to-[#0052CC]",
    showForm: true,
    iconType: "lightning",
  },
  {
    title: "Historique des matchs",
    description: "Retrouve tous tes résultats et scores par date.",
    gridClass: "md:col-span-1 md:row-span-1",
    gradient: "from-[#0066FF] to-[#0052CC]",
    iconType: "graph",
    showHistory: true,
  },
  {
    title: "Système de badges",
    description: "Gagne des badges uniques selon tes performances.",
    gridClass: "md:col-span-1 md:row-span-2",
    gradient: "from-[#0066FF] to-[#0052CC]",
    showBadgesPreview: true,
    iconType: "badge",
  },
  {
    title: "Classement en temps réel",
    description: "Classement mis à jour après chaque match.",
    gridClass: "md:col-span-2 md:row-span-2",
    gradient: "from-[#0066FF] to-[#0052CC]",
    showLeaderboard: true,
    iconType: "graph",
  },
];

function MatchFormPreview() {
  return (
    <div className="mt-4 sm:mt-5 md:mt-6 p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-white/10">
      <div className="space-y-3 sm:space-y-4 md:space-y-5">
        {/* Titre */}
        <div className="text-white/80 font-semibold text-sm sm:text-base">Équipe gagnante</div>
        {/* Boutons équipes */}
        <div className="flex gap-2 sm:gap-3">
          <button
            className="flex-1 rounded-lg sm:rounded-xl bg-lime-400 text-gray-900 font-semibold py-2 sm:py-2.5 md:py-3 shadow-[0_8px_26px_rgba(191,255,0,0.35)] ring-1 ring-lime-300/60 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            aria-label="Équipe 1 sélectionnée"
            type="button"
          >
            <Image 
              src="/images/Trophée page badges.png" 
              alt="Trophée" 
              width={20} 
              height={20} 
              className="flex-shrink-0"
              unoptimized
            />
            <span>Équipe 1</span>
          </button>
          <button
            className="flex-1 rounded-lg sm:rounded-xl bg-transparent text-white/80 border border-white/30 py-2 sm:py-2.5 md:py-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            aria-label="Choisir l'équipe 2"
            type="button"
          >
            <Image 
              src="/images/Trophée page badges.png" 
              alt="Trophée" 
              width={20} 
              height={20} 
              className="flex-shrink-0"
              unoptimized
            />
            <span>Équipe 2</span>
          </button>
        </div>

        {/* Scores des sets */}
        <div className="space-y-2 sm:space-y-3">
          <div className="text-white/80 font-semibold text-xs sm:text-sm">Scores des sets <span className="text-white/50">*</span></div>
          <div className="space-y-2 sm:space-y-3">
            {[1,2].map((i)=> (
              <div key={i} className="flex items-center justify-between">
                <div className="text-white/80 text-xs sm:text-sm">Set {i}</div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    className="w-12 sm:w-14 md:w-16 h-8 sm:h-9 md:h-10 rounded-lg sm:rounded-xl bg-white text-gray-900 text-center font-semibold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#0066FF]"
                    value={0}
                    readOnly
                  />
                  <span className="text-white/60">-</span>
                  <input
                    className="w-12 sm:w-14 md:w-16 h-8 sm:h-9 md:h-10 rounded-lg sm:rounded-xl bg-white text-gray-900 text-center font-semibold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#0066FF]"
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
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 sm:mb-4 px-2">
            Tout pour{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent block sm:inline">
              dominer le terrain
            </span>
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              whileHover={{ scale: 1.02, rotateY: 5 }}
              className={`${feature.gridClass} relative group rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 bg-black border-2 border-white/10 hover:border-[#0066FF]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,102,255,0.3)]`}
            >
              {/* Gradient background au hover */}
              <div
                className={`absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              />

              {/* Contenu */}
              <div className="relative z-10">
                <div className="mb-2 sm:mb-3 md:mb-4 flex items-center gap-2">
                  {feature.iconType === "graph" ? (
                    <Image 
                      src="/images/Historique des matchs joueur.png" 
                      alt="Graphique" 
                      width={32} 
                      height={32} 
                      className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                      unoptimized
                    />
                  ) : feature.iconType === "lightning" ? (
                    <Image 
                      src="/images/Éclair page avis.png" 
                      alt="Éclair" 
                      width={32} 
                      height={32} 
                      className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                      unoptimized
                    />
                  ) : feature.iconType === "badge" ? (
                    <Image 
                      src="/images/Badge Centurion.png" 
                      alt="Badge Centurion" 
                      width={32} 
                      height={32} 
                      className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                      unoptimized
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl md:text-4xl">{feature.title.split(" ")[0]}</span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                  {feature.iconType === "graph" || feature.iconType === "lightning" || feature.iconType === "badge" ? feature.title : feature.title.split(" ").slice(1).join(" ")}
                </h3>
                <p className="text-white/60 text-xs sm:text-sm">{feature.description}</p>

                {/* Détails visuels */}
                {feature.showLeaderboard && (
                  <div className="mt-4">
                    <LeaderboardPreviewMini />
                  </div>
                )}

                {feature.showBadgesPreview && (
                  <div className="mt-4 sm:mt-5 md:mt-6 flex gap-1.5 sm:gap-2 flex-wrap">
                    {[
                      { emoji: "🏆", title: "Première victoire" },
                      { emoji: "🔥", title: "Série de 3" },
                      { emoji: "🏅", title: "Centurion" },
                      { emoji: "💎", title: "Diamant" },
                      { emoji: "🎖️", title: "Marathonien" },
                      { emoji: "💯", title: "Top Scorer" }
                    ].map((badge, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      >
                        <BadgeIconDisplay 
                          icon={badge.emoji} 
                          title={badge.title}
                          size={32}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {feature.showForm && <MatchFormPreview />}

                {feature.showHistory && (
                  <div className="mt-4 sm:mt-5 md:mt-6 space-y-2 sm:space-y-3">
                    {[
                      { date: "Hier", score: "6-3, 6-4", result: "W" },
                      { date: "Lundi", score: "4-6, 6-4", result: "W" },
                      { date: "Dimanche", score: "5-7, 4-6", result: "L" }
                    ].map((m, i) => {
                      const won = m.result === 'W';
                      return (
                        <div
                          key={i}
                          className={`rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                            won
                              ? "border-green-500 bg-green-50"
                              : "border-red-300 bg-red-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            {won ? (
                              <Image 
                                src="/images/Trophée page badges.png" 
                                alt="Trophée" 
                                width={24} 
                                height={24} 
                                className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8"
                                unoptimized
                              />
                            ) : (
                              <span className="text-xl sm:text-2xl text-red-600">❌</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {won ? "Victoire" : "Défaite"}
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-600">{m.date}</div>
                              <div className="text-[10px] sm:text-xs text-gray-700 mt-0.5 sm:mt-1">{m.score}</div>
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

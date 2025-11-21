"use client";

import { motion } from "framer-motion";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";

export default function ProblemSolution() {
  return (
    <section id="problem-solution" className="relative pt-12 pb-24 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-8">
        {/* Section "Vos défis quotidiens" */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8 text-center">
            ❌ AVANT : LA RÉALITÉ DE NOMBREUX CLUBS / COMPLEXES
          </h2>
          
          <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 rounded-2xl p-8 border-2 border-red-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <Image src="/images/Graphique bas.png" alt="Graphique bas" width={48} height={48} className="flex-shrink-0" unoptimized />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Membres déconnectés</h3>
                  <p className="text-white/70">Ils jouent, repartent, zéro lien communautaire</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Image src="/images/Historique des matchs joueur.png" alt="Historique" width={48} height={48} className="flex-shrink-0" unoptimized />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Aucune visibilité sur les performances</h3>
                  <p className="text-white/70">Impossible de suivre sa progression, classements imprécis, pas de données exploitables</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Image src="/images/historiqueclubslandingpage.png" alt="Historique" width={48} height={48} className="flex-shrink-0" unoptimized />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Pas d'historique automatique des matchs</h3>
                  <p className="text-white/70">Impossible de consulter facilement l'historique de ses matchs</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Image src="/images/ZZZ.png" alt="ZZZ" width={48} height={48} className="flex-shrink-0" unoptimized />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Pas de stimulation pour les membres</h3>
                  <p className="text-white/70">Aucun système de récompenses ou reconnaissance</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section "La Solution Padel Club Pro" */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            La Solution{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              Padel Pro
            </span>
          </h2>
        </motion.div>

        {/* 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              emoji: "🏆",
              image: "/images/Trophée page badges.png",
              title: "CLASSEMENT VIVANT",
              items: [
                "• En temps réel",
                "• Top 3 mis en avant",
                "• Statistiques personnelles détaillées"
              ]
            },
            {
              emoji: "🎯",
              title: "CRÉATION DE CHALLENGES",
              items: [
                "• Création en 3 clics",
                "• Inscriptions automatiques",
                "• Récompenses gérées automatiquement"
              ]
            },
            {
              emoji: "🎮",
              image: "/images/Manette landing page.png",
              title: "ENGAGEMENT MAXIMAL",
              items: [
                "• Historique automatique des matchs",
                "• Badges de récompenses",
                "• Code d'invitation pour les membres"
              ]
            }
          ].map((solution, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border-2 border-[#0066FF]/30 hover:border-[#0066FF]/60 transition-all hover:shadow-[0_0_30px_rgba(0,102,255,0.3)]"
            >
              <div className="mb-4 flex items-center justify-center">
                {solution.image ? (
                  <Image src={solution.image} alt="" width={48} height={48} className="flex-shrink-0" unoptimized />
                ) : (
                  <BadgeIconDisplay icon={solution.emoji} size={48} className="flex-shrink-0" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-6 text-center">{solution.title}</h3>
              <ul className="space-y-3">
                {solution.items.map((item, i) => (
                  <li key={i} className="text-white/80 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


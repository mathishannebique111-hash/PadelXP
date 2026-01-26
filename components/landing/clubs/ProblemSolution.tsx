"use client";

import { motion } from "framer-motion";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";
import { TrendingDown, EyeOff, UserMinus, ZapOff, XCircle } from "lucide-react";

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
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8 text-center flex items-center justify-center gap-3">
            <XCircle className="w-8 h-8 md:w-10 h-10 text-red-500" />
            AVANT : LA RÉALITÉ DE NOMBREUX CLUBS / COMPLEXES
          </h2>

          <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 rounded-2xl p-8 border-2 border-red-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Membres déconnectés</h3>
                  <p className="text-white/70">Ils jouent, repartent, zéro lien communautaire</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                  <EyeOff className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Aucune visibilité sur les performances</h3>
                  <p className="text-white/70">Impossible de suivre sa progression, classements imprécis, pas de données exploitables</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                  <UserMinus className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Une rétention difficile à mettre en place</h3>
                  <p className="text-white/70">En moyenne, 50% des nouveaux joueurs partent dans les 12 mois</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                  <ZapOff className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Pas de stimulation pour les joueurs</h3>
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
              Padel XP
            </span>
          </h2>
        </motion.div>

        {/* 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              emoji: "🎮",
              title: "ENGAGEMENT MAXIMAL",
              color: "#0066FF",
              items: [
                "Suggestions de partenaires et de matchs",
                "Historique automatique des matchs",
                "Badges de récompenses"
              ]
            },
            {
              emoji: "🎯",
              title: "CRÉATION DE CHALLENGES",
              color: "#BFFF00",
              items: [
                "Création en quelques clics",
                "Animation du club tout au long de l'année",
                "Récompenses gérées automatiquement"
              ]
            },
            {
              emoji: "🏆",
              title: "CLASSEMENT VIVANT",
              color: "#FBBF24",
              items: [
                "Augmente la rétention",
                "Inclue tous les joueurs du club",
                "Statistiques personnelles détaillées"
              ]
            }
          ].map((solution, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border-2 border-[#0066FF]/30 hover:border-[#0066FF]/60 transition-all hover:shadow-[0_0_30px_rgba(0,102,255,0.3)] flex flex-col items-start"
            >
              <div className="mb-6 h-12 flex items-center justify-start" style={{ color: solution.color }}>
                <BadgeIconDisplay icon={solution.emoji} size={48} className="flex-shrink-0" color={solution.color} />
              </div>
              <h3 className="text-xl font-bold text-white mb-6 text-left">{solution.title}</h3>
              <ul className="space-y-4">
                {solution.items.map((item, i) => (
                  <li key={i} className="text-white/80 text-sm flex items-start gap-3">
                    <span
                      className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: solution.color }}
                    />
                    <span>{item}</span>
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


"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import RankBadge from "@/components/RankBadge";
import TierBadge from "@/components/TierBadge";
import { ALL_BADGES } from "@/lib/badges";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";
import * as LucideIcons from "lucide-react";
import {
  Trophy,
  Gamepad2,
  Swords,
  Building2,
  UserPlus,
  Flame,
  Target,
  Timer,
  Gem,
  Milestone,
  MapPin,
  Phone,
  Globe,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Users,
  ExternalLink,
  LayoutGrid,
  Zap
} from "lucide-react";

export default function FeaturesDetailed() {
  const [activeTab, setActiveTab] = useState("ranking");

  const tabs = [
    { id: "ranking", label: "Classement", icon: Trophy },
    { id: "gamification", label: "Gamification", icon: Gamepad2 },
    { id: "match-entry", label: "Matchs et Historique", icon: Calendar },
    { id: "partnerships", label: "Partenaires et matchs", icon: UserPlus },
    { id: "tournaments", label: "Tournois", icon: Swords },
  ];

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
            Fonctionnalités{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              détaillées
            </span>
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === tab.id
                ? "bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white shadow-[0_0_20px_rgba(0,102,255,0.5)] border-transparent"
                : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-[#BFFF00]/30"
                }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[600px]">
          {activeTab === "ranking" && <RankingFeature />}
          {activeTab === "gamification" && <GamificationFeature />}
          {activeTab === "tournaments" && <TournamentsFeature />}
          {activeTab === "match-entry" && <MatchEntryFeature />}
          {activeTab === "partnerships" && <PartnershipsFeature />}
        </div>
      </div>
    </section>
  );
}

function tierForPoints(points: number) {
  if (points >= 500) return "Champion";
  if (points >= 300) return "Diamant";
  if (points >= 200) return "Or";
  if (points >= 100) return "Argent";
  return "Bronze";
}

function getTierColor(tier: string) {
  switch (tier) {
    case "Champion": return "text-fuchsia-400";
    case "Diamant": return "text-cyan-400";
    case "Or": return "text-amber-400";
    case "Argent": return "text-zinc-400";
    default: return "text-orange-400";
  }
}


function RankingFeature() {
  const mockPlayersUnsorted = [
    { name: "Marc L.", points: 156, wins: 12, losses: 2, matches: 14, tier: "Or" },
    { name: "Sophie D.", points: 148, wins: 11, losses: 3, matches: 14, tier: "Or" },
    { name: "Thomas R.", points: 142, wins: 10, losses: 2, matches: 12, tier: "Argent" },
    { name: "Julie M.", points: 128, wins: 9, losses: 4, matches: 13, tier: "Argent" },
    { name: "Alex K.", points: 124, wins: 9, losses: 5, matches: 14, tier: "Argent" },
    { name: "Lucas B.", points: 320, wins: 28, losses: 4, matches: 32, tier: "Diamant" },
    { name: "Pierre M.", points: 65, wins: 5, losses: 5, matches: 10, tier: "Bronze" },
  ];

  // Trier par points décroissants et assigner les rangs
  const mockPlayers = mockPlayersUnsorted
    .sort((a, b) => b.points - a.points)
    .map((player, idx) => ({ ...player, rank: idx + 1 }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {/* Profil joueur - Style réel avec fond sombre */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">MARC L.</h3>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/50 text-violet-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(139,92,246,0.5)]">
              CHAMPION
            </div>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          {/* Statistiques - Grille de 6 */}
          {/* Statistiques - Grille de 8 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-[0.2em]">
                MES STATISTIQUES
              </h4>
            </div>

            {/* Série actuelle - Header Card */}
            <div className="mb-4 rounded-xl border border-[#CCFF00] bg-gradient-to-r from-gray-900 to-gray-800 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                <Flame size={120} className="text-[#CCFF00]" />
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#CCFF00] font-bold mb-1">
                    Série de victoires en cours
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white tabular-nums">9</span>
                    <span className="text-sm font-medium text-white/60 uppercase tracking-wider">Victoires</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <Flame size={32} className="text-white mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" fill="currentColor" />
                  <div className="text-[10px] text-[#CCFF00] font-bold">Meilleure : 13</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Points */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Points</div>
                <div className="text-3xl font-bold text-[#172554] tabular-nums">531</div>
              </div>

              {/* Matchs */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Matchs</div>
                <div className="text-3xl font-bold text-[#172554] tabular-nums">48</div>
              </div>

              {/* Victoires */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Victoires</div>
                <div className="text-3xl font-bold text-[#172554] tabular-nums">41</div>
              </div>

              {/* Défaites */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Défaites</div>
                <div className="text-3xl font-bold text-[#172554] tabular-nums">7</div>
              </div>

              {/* Sets Gagnés */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Sets Gagnés</div>
                <div className="text-3xl font-bold text-[#172554] tabular-nums">82</div>
              </div>

              {/* Sets Perdus */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Sets Perdus</div>
                <div className="text-3xl font-bold text-[#172554] tabular-nums">14</div>
              </div>

              {/* Winrate */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Winrate</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                  <div className="text-3xl font-bold text-emerald-500 tabular-nums">85%</div>
                </div>
              </div>

              {/* Badges */}
              <div
                className="rounded-lg border-l-4 border-l-[#CCFF00] bg-white px-4 py-3 shadow-lg"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Badges</div>
                <div className="text-3xl font-bold text-[#172554] tabular-nums">10 / 16</div>
              </div>
            </div>
          </div>

          {/* Historique */}
          <div>
          </div>
        </div>
      </div>

      {/* Colonne de droite : Classement (Podium + Table) DUO FUSIONNÉ */}
      <div className="h-full">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl p-6 flex flex-col h-full">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white text-center">
              CLASSEMENT - PADEL CLUB
            </h3>
          </div>

          {/* Top 3 Podium */}
          <div className="mb-8 flex items-end justify-center gap-4">
            {/* 2ème place */}
            <div className="flex-1 max-w-[140px] rounded-xl p-4 bg-gradient-to-b from-gray-300/20 to-gray-400/10 border-2 border-gray-400">
              <div className="text-center">
                <div className="text-3xl mb-2">🥈</div>
                <div className="text-sm font-semibold text-white mb-1">{mockPlayers[1]?.name || "—"}</div>
                <div className="text-xs text-white/70 tabular-nums">{mockPlayers[1]?.points || 0} pts</div>
              </div>
            </div>

            {/* 1ère place */}
            <div className="flex-1 max-w-[160px] rounded-xl p-5 bg-gradient-to-b from-yellow-600/20 to-yellow-700/10 border-2 border-yellow-500 scale-110 relative z-10">
              <div className="text-center">
                <div className="text-4xl mb-2">🥇</div>
                <div className="text-base font-bold text-white mb-1">{mockPlayers[0]?.name || "—"}</div>
                <div className="text-xs text-yellow-300 font-semibold tabular-nums">{mockPlayers[0]?.points || 0} pts</div>
              </div>
            </div>

            {/* 3ème place */}
            <div className="flex-1 max-w-[140px] rounded-xl p-4 bg-gradient-to-b from-orange-400/20 to-orange-600/10 border-2 border-orange-500">
              <div className="text-center">
                <div className="text-3xl mb-2">🥉</div>
                <div className="text-sm font-semibold text-white mb-1">{mockPlayers[2]?.name || "—"}</div>
                <div className="text-xs text-white/70 tabular-nums">{mockPlayers[2]?.points || 0} pts</div>
              </div>
            </div>
          </div>

          {/* Tableau intégré */}
          <div className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="text-[#CCFF00] w-5 h-5" />
                TOP JOUEURS
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold text-white/50 uppercase tracking-wider">
                    <th className="px-4 py-3">Rang</th>
                    <th className="px-4 py-3">Joueur</th>
                    <th className="px-4 py-3 text-center">Pts</th>
                    <th className="px-4 py-3 text-center text-emerald-400">V</th>
                    <th className="px-4 py-3 text-center text-red-400">D</th>
                    <th className="px-4 py-3 text-center">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockPlayers.slice(0, 5).map((player) => {
                    const winrate = Math.round((player.wins / player.matches) * 100);
                    return (
                      <tr
                        key={player.rank}
                        className={`group transition-colors hover:bg-white/5 ${player.name === "Marc L." ? "bg-white/5" : ""
                          }`}
                      >
                        <td className="px-4 py-3">
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${player.rank === 1 ? "bg-[#FBBF24] text-[#071554]" :
                            player.rank === 2 ? "bg-gray-300 text-[#071554]" :
                              player.rank === 3 ? "bg-amber-700 text-white" :
                                "bg-slate-700 text-white"
                            }`}>
                            {player.rank}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white text-sm flex items-center gap-2">
                            {player.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-bold text-white">{player.points}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-emerald-400 font-medium text-sm">
                          {player.wins}
                        </td>
                        <td className="px-4 py-3 text-center text-red-400 font-medium text-sm">
                          {player.losses}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-medium text-white/70">{winrate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GamificationFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">
            Badges
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🏆", title: "Première victoire", desc: "Obtenez votre première victoire", obtained: true },
              { icon: "🔥", title: "Série de 3", desc: "Gagnez 3 matchs consécutifs", obtained: true },
              { icon: "🎯", title: "Précision", desc: "Remportez 5 matchs sans en perdre aucun", obtained: false },
              { icon: "Timer", title: "Marathonien", desc: "Jouez 50 matchs", obtained: true },
              { icon: "🤝", title: "Esprit d'équipe", desc: "Jouez avec 10 partenaires différents", obtained: false },
              { icon: "🛡️", title: "Stratège", desc: "Gagnez 5 matchs au tie-break", obtained: false },
            ].map((badge, i) => (
              <div
                key={i}
                className={`rounded-xl px-2 pt-3 pb-2 transition-all flex flex-col h-[140px] items-center text-center ${badge.obtained
                  ? "bg-white shadow-md hover:scale-105 hover:shadow-xl"
                  : "bg-gray-50 opacity-75"
                  }`}
              >
                <div className="flex-shrink-0 mb-2 h-[36px] flex items-center justify-center">
                  <BadgeIconDisplay
                    icon={badge.icon}
                    title={badge.title}
                    className={`transition-all ${badge.obtained ? "" : "grayscale opacity-50"}`}
                    size={36}
                  />
                </div>

                <div className="flex-shrink-0 flex flex-col items-center justify-center min-h-0 max-h-[60px] mb-1 px-1">
                  <h3 className={`text-xs font-semibold leading-tight mb-0.5 text-center ${badge.obtained ? "text-gray-900" : "text-gray-500"}`}>
                    {badge.title}
                  </h3>
                  <p className="text-[9px] leading-relaxed text-gray-600 text-center line-clamp-2">{badge.desc}</p>
                </div>

                <div className="flex-shrink-0 w-full mt-auto">
                  {badge.obtained ? (
                    <div className="w-full rounded-lg bg-[#172554] px-2 py-1 text-[9px] font-semibold text-white tabular-nums">
                      ✓ Débloqué
                    </div>
                  ) : (
                    <div className="w-full h-[24px]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>


        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 flex flex-col h-full">
          <h3 className="text-xl font-bold text-white mb-4">
            CHALLENGE NOVEMBRE : "Warriors"
          </h3>
          <div className="flex-1 space-y-4">
            <div className="text-sm text-white/70">
              Objectif : Jouer minimum 10 matchs en novembre
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FBBF24]" />
                PARTICIPANTS DU CHALLENGE
              </h4>
              <div className="space-y-2.5">
                {[
                  { name: "Marc L.", progress: 12, target: 10, completed: true },
                  { name: "Thomas R.", progress: 11, target: 10, completed: true },
                  { name: "Sophie D.", progress: 10, target: 10, completed: true },
                  { name: "Julie M.", progress: 8, target: 10, completed: false },
                  { name: "Alex K.", progress: 6, target: 10, completed: false },
                ].map((player, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-medium">{i + 1}. {player.name}</span>
                      <span className={`font-semibold ${player.completed ? "text-green-400" : "text-white/70"}`}>
                        {player.progress}/{player.target} {player.completed && "✅"}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${player.completed ? "bg-green-400" : "bg-[#0066FF]"}`}
                        style={{ width: `${Math.min((player.progress / player.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs text-white/70">
                <span className="font-semibold text-white/90">Récompense :</span> Badge "November Warrior"
              </div>
              <div className="text-xs text-white/60">
                Durée : 1er - 30 novembre 2025
              </div>
              <div className="text-xs text-white/60">
                3/5 participants ont complété le challenge
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div >
  );
}

function MatchEntryFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {/* Formulaire d'enregistrement - Design Web Réel */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 h-full">
        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
          <Zap className="text-[#CCFF00] w-5 h-5" />
          ENREGISTRER UN MATCH
        </h3>

        <div className="space-y-6">
          {/* Lieu */}
          <div>
            <label className="mb-3 block text-sm font-medium text-white">Lieu du match</label>
            <div className="relative">
              <div className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white flex justify-between items-center">
                <span>Padel Club Toulouse (Toulouse)</span>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </div>
            </div>
          </div>

          {/* Équipe 1 */}
          <div>
            <div className="mb-3 text-base font-semibold text-white">Équipe 1</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Vous</label>
                <div className="w-full rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/60">
                  Vous (Marc L.)
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Partenaire</label>
                <div className="relative">
                  <input
                    type="text"
                    value="Sophie D."
                    className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-padel-green"
                  />
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Équipe 2 */}
          <div>
            <div className="mb-3 text-base font-semibold text-white">Équipe 2</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Joueur 1</label>
                <input
                  type="text"
                  value="Thomas R."
                  className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-padel-green"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Joueur 2</label>
                <input
                  type="text"
                  value="Julie M."
                  className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-padel-green"
                />
              </div>
            </div>
          </div>

          {/* Vainqueur */}
          <div>
            <label className="mb-3 block text-sm font-medium text-white">Équipe gagnante</label>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg border-2 border-padel-green bg-padel-green text-[#071554] shadow-lg shadow-padel-green/50 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Trophy size={16} /> Équipe 1
              </button>
              <button
                className="flex-1 rounded-lg border-2 border-white/30 bg-white/5 text-white hover:border-white/50 hover:bg-white/10 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Trophy size={16} /> Équipe 2
              </button>
            </div>
          </div>

          {/* Scores */}
          <div>
            <label className="mb-3 block text-sm font-medium text-white">Scores des sets *</label>
            <div className="space-y-4">
              {[1, 2].map(set => (
                <div key={set} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white min-w-[60px]">Set {set}</span>
                    <div className="w-16 rounded-md border border-white/10 bg-white px-3 py-2 text-sm text-[#071554] text-center font-mono font-bold">
                      6
                    </div>
                    <span className="text-white">-</span>
                    <div className="w-16 rounded-md border border-white/10 bg-white px-3 py-2 text-sm text-[#071554] text-center font-mono font-bold">
                      {set === 1 ? 3 : 4}
                    </div>
                  </div>
                </div>
              ))}
              <button className="rounded-md border border-white/30 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-white/50 transition-all">
                + Ajouter un 3e set
              </button>
            </div>
          </div>

          <button className="w-full rounded-md bg-padel-green px-4 py-3 font-semibold text-blue-950 transition-all hover:bg-padel-green/90 hover:shadow-lg lg:mt-4">
            Enregistrer
          </button>
        </div>
      </div>

      {/* Historique des matchs - Style Mobile App */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-white/10 h-full overflow-hidden flex flex-col">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <LucideIcons.History className="text-[#CCFF00] w-5 h-5" />
          HISTORIQUE
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {[
            {
              date: "Aujourd'hui",
              time: "20:30",
              club: "Padel Club Toulouse",
              players1: ["Marc L.", "Sophie D."],
              players2: ["Thomas R.", "Julie M."],
              score: "6-3 6-4",
              won: true
            },
            {
              date: "Hier",
              time: "18:45",
              club: "Padel Club Toulouse",
              players1: ["Marc L.", "Alex K."],
              players2: ["Lucas B.", "Pierre M."],
              score: "4-6 5-7",
              won: false
            },
            {
              date: "3 Nov.",
              time: "10:00",
              club: "Urban Padel",
              players1: ["Marc L.", "Léa V."],
              players2: ["Nicolas F.", "Emma S."],
              score: "6-1 6-2",
              won: true
            },
            {
              date: "1 Nov.",
              time: "19:00",
              club: "Padel Club Toulouse",
              players1: ["Marc L.", "Antoine G."],
              players2: ["Sophie D.", "Thomas R."],
              score: "3-6 4-6",
              won: false
            }
          ].map((match, i) => (
            <div
              key={i}
              className={`rounded-2xl border-2 p-2 transition-all ${match.won
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
                }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl flex items-center`}>
                    {match.won ? <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" /> : <XCircle size={24} className="text-red-500 flex-shrink-0" />}
                  </span>
                  <div>
                    <div className={`text-sm font-semibold text-[#071554]`}>
                      {match.won ? "Victoire" : "Défaite"}
                    </div>
                    <div className={`text-xs font-normal text-[#071554]/70`}>
                      {match.date} • {match.time}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#071554]/60">
                      <MapPin className="h-3 w-3 opacity-70" />
                      <span className="truncate max-w-[150px]">{match.club}</span>
                    </div>
                  </div>
                </div>
                <div className={`rounded-lg bg-white px-3 py-1.5 text-sm font-bold tabular-nums text-[#071554]`}>
                  {match.score}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {/* Équipe 1 */}
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 text-[10px] font-normal uppercase tracking-wide text-[#071554]/70 flex items-center gap-1">Équipe 1 {match.won && <Trophy size={14} className="flex-shrink-0 text-[#071554]" />}</div>
                  <div className="divide-y divide-gray-100">
                    {match.players1.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        {p === "Marc L." ? (
                          <>
                            <span className="text-sm font-semibold text-[#071554] tracking-tight">{p}</span>
                            <span className="rounded-full bg-padel-green px-2 py-0.5 text-xs font-bold text-[#071554] shadow-sm">VOUS</span>
                          </>
                        ) : (
                          <span className="text-sm font-normal text-gray-900 tracking-tight">{p}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Équipe 2 */}
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 text-[10px] font-normal uppercase tracking-wide text-[#071554]/70 flex items-center gap-1">Équipe 2 {!match.won && <Trophy size={14} className="flex-shrink-0 text-[#071554]" />}</div>
                  <div className="divide-y divide-gray-100">
                    {match.players2.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        <span className="text-sm font-normal text-gray-900 tracking-tight">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PartnershipsFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {/* Suggestions de partenaires - Design Réel */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Users className="text-[#CCFF00] w-5 h-5" />
          SUGGESTIONS DE PARTENAIRES
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Alexandre K.", level: 7.2, score: 88, avatar: null },
            { name: "Julie M.", level: 6.5, score: 74, avatar: null },
            { name: "Thomas R.", level: 6.1, score: 65, avatar: null },
            { name: "Sophie D.", level: 5.8, score: 58, avatar: null },
          ].map((player, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-white/10 flex flex-col items-center text-center h-full relative group hover:bg-slate-800 transition-colors">
              <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-white/40 border-2 border-white/20 mb-2 shadow-sm">
                <LucideIcons.User className="w-6 h-6" />
              </div>

              <h4 className="font-bold text-white text-xs mb-1 line-clamp-1 w-full px-1">{player.name}</h4>

              <div className="inline-flex items-center justify-center bg-white/10 rounded-full px-2 py-0.5 mb-2 border border-white/20">
                <span className="text-[10px] text-white font-medium">Niveau {player.level}</span>
              </div>

              <div className="w-full max-w-[80%] flex items-center gap-1.5 mb-3">
                <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${player.score >= 70 ? "bg-emerald-500" : player.score >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                    style={{ width: `${player.score}%` }}
                  />
                </div>
                <span className={`text-[9px] font-bold ${player.score >= 70 ? "text-emerald-400" : player.score >= 60 ? "text-orange-400" : "text-red-400"}`}>
                  {player.score}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 w-full mt-auto">
                <button className="h-8 rounded-lg border border-white/10 text-white flex items-center justify-center hover:bg-white/5 transition-colors">
                  <LucideIcons.Eye className="w-4 h-4" />
                </button>
                <button className="h-8 rounded-lg bg-padel-green text-[#071554] flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-padel-green/20">
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions de matchs */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Swords className="text-blue-400 w-5 h-5" />
          SUGGESTIONS DE MATCHS
        </h3>
        <div className="space-y-4">
          {[
            { p1: "Thomas R.", p2: "Marc L.", level: 7.0, score: 92 },
            { p1: "Sophie D.", p2: "Emma S.", level: 6.8, score: 85 },
          ].map((pair, i) => (
            <div key={i} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-white/10 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                <div className="bg-emerald-500/20 backdrop-blur-md px-2 py-1 rounded-lg border border-emerald-500/30 text-center">
                  <div className="text-[10px] text-emerald-400 font-bold">{pair.score}%</div>
                  <div className="text-[7px] text-emerald-500/70 font-bold uppercase tracking-tighter leading-none">Compatibilité</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-slate-700/50 rounded-full" />
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                    <LucideIcons.User className="w-4 h-4 text-white/20" />
                  </div>
                  <span className="text-sm font-bold text-white uppercase tracking-tight">{pair.p1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-slate-700/50 rounded-full" />
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                    <LucideIcons.User className="w-4 h-4 text-white/20" />
                  </div>
                  <span className="text-sm font-bold text-white uppercase tracking-tight">{pair.p2}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-t border-white/5 mb-4">
                <div className="text-center">
                  <div className="text-[8px] uppercase text-white/40 font-bold mb-0.5">Niveau moyen</div>
                  <div className="text-xs font-black text-white">{pair.level}/10</div>
                </div>
                <div className="text-center border-l border-white/10">
                  <div className="text-[8px] uppercase text-white/40 font-bold mb-0.5">Équilibre</div>
                  <div className="text-xs font-black text-emerald-400">Excellent</div>
                </div>
              </div>

              <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                <Swords className="w-3.5 h-3.5" />
                Défier cette paire
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TournamentsFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex items-center justify-center"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-gradient-to-br from-[#020617] via-[#020617] to-[#0f172a] p-8 md:p-10 shadow-[0_30px_80px_rgba(15,23,42,0.9)] relative overflow-hidden">
        {/* Glow / background elements */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-24 -right-32 w-72 h-72 bg-[#0066FF] rounded-full blur-3xl" />
          <div className="absolute bottom-[-4rem] left-[-2rem] w-64 h-64 bg-[#BFFF00] rounded-full blur-3xl opacity-70" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 uppercase tracking-[0.25em]">
              <span className="text-[11px]">TOURNOIS</span>
              <span className="text-xs text-[#BFFF00]">Arrive bientôt</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-white">
              Organisez vos tournois{" "}
              <span className="bg-gradient-to-r from-[#BFFF00] to-[#00CC99] bg-clip-text text-transparent">
                en quelques clics
              </span>
            </h3>
            <p className="text-sm md:text-base text-white/70 leading-relaxed">
              Bientôt, vous pourrez créer des tournois officiels ou amicaux directement depuis votre
              dashboard : tableaux automatiques, suivi en temps réel, communication aux joueurs et
              intégration complète avec le classement du club.
            </p>
            <div className="mt-4 grid gap-3 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <span className="text-[#BFFF00]">•</span>
                <span>Création automatique des tableaux de matchs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#BFFF00]">•</span>
                <span>Les clubs saisissent les scores directement dans les cases des matchs, tout se met à jour en temps réel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#BFFF00]">•</span>
                <span>Communication simplifiée avec les joueurs : infos clés du tournoi centralisées au même endroit</span>
              </div>
            </div>

          </div>

          <div className="flex-1 flex items-center justify-center">
            <Image
              src="/images/Logo.png"
              alt="Tournois PadelXP"
              width={420}
              height={260}
              className="rounded-xl object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}


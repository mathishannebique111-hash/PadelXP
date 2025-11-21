"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import RankBadge from "@/components/RankBadge";
import TierBadge from "@/components/TierBadge";
import { ALL_BADGES } from "@/lib/badges";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";

export default function FeaturesDetailed() {
  const [activeTab, setActiveTab] = useState("ranking");

  const tabs = [
    { id: "ranking", label: "Classement", emoji: "🏆", image: "/images/Trophée page badges.png" },
    { id: "gamification", label: "Gamification", emoji: "🎮" },
    { id: "public-page", label: "Page Club", emoji: "📱" },
    { id: "inscription", label: "Inscription", emoji: "👥" }
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
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white shadow-[0_0_20px_rgba(0,102,255,0.5)]"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[600px]">
          {activeTab === "ranking" && <RankingFeature />}
          {activeTab === "gamification" && <GamificationFeature />}
          {activeTab === "public-page" && <PublicPageFeature />}
          {activeTab === "inscription" && <InscriptionFeature />}
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
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">MARC L.</h3>
          <div className="flex items-center gap-2">
            <RankBadge rank={1} size="sm" />
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Statistiques */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-3">
              STATISTIQUES
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Total matchs</div>
                <div className="text-lg font-bold text-white tabular-nums">14</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Points</div>
                <div className="text-lg font-bold text-white tabular-nums">156</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <div className="text-xs text-green-400 mb-1">Victoires</div>
                <div className="text-lg font-bold text-green-400 tabular-nums">12 (85.7%)</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                <div className="text-xs text-red-400 mb-1">Défaites</div>
                <div className="text-lg font-bold text-red-400 tabular-nums">2</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
              <Image src="/images/Flamme page badges.png" alt="Flamme" width={16} height={16} className="flex-shrink-0" unoptimized />
              <span>Série actuelle : 3 victoires</span>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-3">
              BADGES (4)
            </h4>
            <div className="flex flex-wrap gap-2">
              {[ALL_BADGES[0], ALL_BADGES[1], ALL_BADGES[7], ALL_BADGES[9]].map((badge, i) => {
                let badgeImage = null;
                if (badge.title === "Première victoire") {
                  badgeImage = "/images/Trophée page badges.png";
                } else if (badge.title === "Marathonien") {
                  badgeImage = "/images/Badge Marathonien.png";
                } else if (badge.title === "Top Scorer") {
                  badgeImage = "/images/Badge Top Scorer.png";
                } else if (badge.icon === "🔥") {
                  badgeImage = "/images/Flamme page badges.png";
                }
                
                return (
                  <span 
                    key={i} 
                    title={badge.title}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white bg-gray-800"
                  >
                    {badgeImage ? (
                      <Image src={badgeImage} alt={badge.title} width={16} height={16} className="flex-shrink-0" unoptimized />
                    ) : (
                      <span>{badge.icon}</span>
                    )}
                    {badge.title}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Historique */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-4">
              HISTORIQUE RÉCENT
            </h4>
            <div className="space-y-3">
              {[
                { 
                  date: "5 novembre 2025", 
                  time: "20:35",
                  result: "Victoire", 
                  team1Players: ["Marc L.", "Sophie D."],
                  team2Players: ["Thomas R.", "Julie M."],
                  score: "2-0",
                  won: true 
                },
                { 
                  date: "5 novembre 2025", 
                  time: "20:34",
                  result: "Défaite", 
                  team1Players: ["Marc L.", "Lucas B."],
                  team2Players: ["Julie M.", "Thomas R."],
                  score: "1-2",
                  won: false 
                },
              ].map((match, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border-2 transition-all ${
                    match.won
                      ? "border-green-500 bg-green-50"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between p-4 pb-3">
                    <div className="flex items-center gap-3">
                      {match.won ? (
                        <Image src="/images/Trophée page badges.png" alt="Trophée" width={24} height={24} className="flex-shrink-0" unoptimized />
                      ) : (
                        <span className="text-2xl text-red-600">❌</span>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">
                          {match.result}
                        </div>
                        <div className="text-sm text-gray-600">
                          {match.date} à {match.time}
                        </div>
                      </div>
                    </div>
                    <div className={`rounded-lg px-4 py-2 text-lg font-bold ${
                      match.won 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {match.score}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="grid grid-cols-2 gap-4 px-4 pb-4">
                    {/* Équipe 1 */}
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 flex items-center gap-1">
                        ÉQUIPE 1 {match.won && match.score === "2-0" && (
                          <Image src="/images/Trophée page badges.png" alt="Trophée" width={14} height={14} className="flex-shrink-0" unoptimized />
                        )}
                      </div>
                      <div className="space-y-1">
                        {match.team1Players.map((player, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {player}
                            </span>
                            {player === "Marc L." && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white bg-blue-600">
                                VOUS
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Équipe 2 */}
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 flex items-center gap-1">
                        ÉQUIPE 2 {!match.won && match.score === "1-2" && (
                          <Image src="/images/Trophée page badges.png" alt="Trophée" width={14} height={14} className="flex-shrink-0" unoptimized />
                        )}
                      </div>
                      <div className="space-y-1">
                        {match.team2Players.map((player, idx) => (
                          <div key={idx} className="text-sm text-gray-900">
                            {player}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Classement avec Top 3 et liste globale */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
            <Image src="/images/Trophée page badges.png" alt="Trophée" width={24} height={24} className="flex-shrink-0" unoptimized />
            CLASSEMENT - CLUB PADEL TOULOUSE
          </h3>
        </div>

        {/* Top 3 Podium */}
        <div className="mb-6 flex items-end justify-center gap-4">
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

        {/* Classement global */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-3 px-2">Classement complet</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-2 py-2 text-left text-xs font-semibold text-white/70 uppercase tracking-wide">Rang</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-white/70 uppercase tracking-wide">Joueur</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white/70 uppercase tracking-wide">Niveau</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white/70 uppercase tracking-wide tabular-nums">P</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white/70 uppercase tracking-wide tabular-nums">V</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white/70 uppercase tracking-wide tabular-nums">D</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white/70 uppercase tracking-wide tabular-nums">MJ</th>
                </tr>
              </thead>
              <tbody>
                {mockPlayers.map((player, idx) => {
                  const winrate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
                  
                  return (
                    <tr
                      key={player.rank}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-start">
                          <RankBadge rank={player.rank} size="sm" />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-sm font-medium text-white">{player.name}</div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <TierBadge tier={player.tier as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="text-sm font-semibold text-white tabular-nums">{player.points}</div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="text-sm font-semibold text-green-400 tabular-nums">{player.wins}</div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="text-sm font-semibold text-red-400 tabular-nums">{player.losses}</div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="text-sm font-semibold text-white/80 tabular-nums">{player.matches}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Joueurs les plus actifs */}
        <div className="mt-auto p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Image src="/images/Flamme page badges.png" alt="Flamme" width={14} height={14} className="flex-shrink-0" unoptimized />
            Joueurs les plus actifs
          </div>
          <div className="space-y-2">
            {mockPlayers
              .sort((a, b) => b.matches - a.matches)
              .slice(0, 4)
              .map((player, idx) => (
                <div key={player.rank} className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{player.name}</div>
                      <div className="text-xs text-white/50">{player.matches} matchs joués</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-400">{player.wins}V</div>
                    <div className="text-xs text-white/50">{Math.round((player.wins / player.matches) * 100)}%</div>
                  </div>
                </div>
              ))}
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
            BADGES AUTOMATIQUES
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ALL_BADGES[0], // Première victoire
              ALL_BADGES[1], // Série de 3
              ALL_BADGES[8], // Centurion (remplace Série de 5)
              ALL_BADGES[14], // Amour du padel (remplace Série de 7)
              ALL_BADGES[4], // Série de 10
              ALL_BADGES[10], // Diamant (remplace série de 15)
              ALL_BADGES[12], // Précision (remplace série de 20)
              ALL_BADGES[7], // Marathonien
              ALL_BADGES[9], // Top Scorer
              ALL_BADGES[15], // Contributeur
            ].map((badge, i) => {
              // Mapping des badges vers leurs images
              let badgeImage = null;
              if (badge.title === "Première victoire") {
                badgeImage = "/images/Trophée page badges.png";
              } else if (badge.title === "Série de 3" || badge.title === "Série de 10") {
                badgeImage = "/images/Flamme page badges.png";
              } else if (badge.title === "Marathonien") {
                badgeImage = "/images/Badge Marathonien.png";
              } else if (badge.title === "Centurion") {
                badgeImage = "/images/Badge Centurion.png";
              } else if (badge.title === "Top Scorer") {
                badgeImage = "/images/Badge Top Scorer.png";
              } else if (badge.title === "Diamant") {
                badgeImage = "/images/Badge Diamant.png";
              } else if (badge.title === "Amour du padel") {
                badgeImage = "/images/Historique des matchs joueur.png";
              } else if (badge.title === "Précision") {
                badgeImage = "/images/Badge.png"; // Badge générique pour Précision
              } else if (badge.title === "Contributeur") {
                badgeImage = "/images/Badge Contributeur.png";
              }
              
              return (
                <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                  {badgeImage ? (
                    <Image src={badgeImage} alt={badge.title} width={32} height={32} className="mx-auto mb-1" unoptimized />
                  ) : (
                    <div className="text-2xl mb-1">{badge.icon}</div>
                  )}
                  <div className="text-xs text-white/70">{badge.title}</div>
                </div>
              );
            })}
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
                <Image src="/images/Trophée page badges.png" alt="Trophée" width={16} height={16} className="flex-shrink-0" unoptimized />
                CLASSEMENT DU CHALLENGE
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
    </motion.div>
  );
}

function PublicPageFeature() {
  const gradientStyle = {
    background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%)",
    boxShadow: "0 30px 70px rgba(4,16,46,0.5)",
  };

  const cardStyle = {
    background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%)",
    borderColor: "rgba(72,128,210,0.55)",
  };

  const clubName = "CLUB PADEL TOULOUSE";
  const logoUrl = null; // Pas de logo pour le mockup
  const description = "Club convivial au cœur de Toulouse, tous niveaux bienvenus. Ambiance familiale et compétitive avec événements réguliers.";
  const addressLine = "12 Avenue de Toulouse · 31000 · Toulouse";
  const phone = "05 61 42 38 19";
  const website = "www.clubpadeltoulouse.fr";
  const numberOfCourts = 4;
  const courtType = "Couvert";
  
  const openingHours = {
    monday: { open: "08:00", close: "23:00" },
    tuesday: { open: "08:00", close: "23:00" },
    wednesday: { open: "08:00", close: "23:00" },
    thursday: { open: "08:00", close: "23:00" },
    friday: { open: "08:00", close: "23:00" },
    saturday: { open: "08:00", close: "23:00" },
    sunday: { closed: true },
  };

  const DAYS = [
    { key: "monday", label: "Lundi" },
    { key: "tuesday", label: "Mardi" },
    { key: "wednesday", label: "Mercredi" },
    { key: "thursday", label: "Jeudi" },
    { key: "friday", label: "Vendredi" },
    { key: "saturday", label: "Samedi" },
    { key: "sunday", label: "Dimanche" },
  ];

  const formatHour = (value: string | null | undefined) => {
    if (!value) return null;
    try {
      const [h, m] = value.split(":");
      if (Number.isNaN(Number(h)) || Number.isNaN(Number(m))) {
        return value;
      }
      return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    } catch {
      return value;
    }
  };

  const hours = DAYS.map(({ key, label }) => {
    const data = openingHours[key as keyof typeof openingHours];
    const open = formatHour(data?.open ?? null);
    const close = formatHour(data?.close ?? null);
    const isClosed = data?.closed === true || (!open || !close);
    return {
      key,
      label,
      value: isClosed ? "Fermé" : `${open} – ${close}`,
      isClosed,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* ClubHeader */}
      <section
        className="relative overflow-hidden rounded-2xl border border-white p-4 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
        style={gradientStyle}
      >
        <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo ${clubName}`}
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <Image 
                  src="/images/logo fonctionnalités.png" 
                  alt="Logo club" 
                  width={80} 
                  height={80} 
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
            <h1 className="text-3xl font-extrabold md:text-4xl tracking-tight text-white/95 leading-tight md:leading-none flex items-center">
              {clubName}
            </h1>
          </div>
        </div>
        <span className="pointer-events-none absolute inset-x-6 bottom-3 h-px rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </section>

      {/* Description */}
      {description && (
        <section
          className="rounded-2xl border p-5 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
          style={cardStyle}
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/85">À propos</h2>
          <p className="mt-3 text-sm leading-7 text-white/90">
            {description}
          </p>
        </section>
      )}

      {/* ClubDetailsClient */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          {/* Coordonnées */}
          <section
            className="rounded-2xl border p-5 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
            style={cardStyle}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Coordonnées</h2>
              {website && (
                <span
                  className="text-xs font-semibold uppercase tracking-wide text-white/70 cursor-default"
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  Visiter le site ↗
                </span>
              )}
            </div>

            <div className="mt-5 space-y-4 text-sm">
              {addressLine ? (
                <div className="flex flex-col items-center gap-1 text-center">
                  <Image 
                    src="/images/Gps page mon club.png" 
                    alt="GPS" 
                    width={20} 
                    height={20} 
                    className="flex-shrink-0"
                    style={{ 
                      mixBlendMode: 'screen',
                      filter: 'contrast(1.2) brightness(1.1)'
                    }}
                    unoptimized
                  />
                  <span className="font-medium leading-5 text-white/90">{addressLine}</span>
                </div>
              ) : (
                <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-xs text-white/60">
                  Adresse non renseignée
                </div>
              )}
              {phone ? (
                <div className="flex flex-col items-center gap-1 text-center">
                  <Image 
                    src="/images/Téléphone page mon club.png" 
                    alt="Téléphone" 
                    width={20} 
                    height={20} 
                    className="flex-shrink-0"
                    unoptimized
                  />
                  <span className="font-medium tracking-wide text-white/90">{phone}</span>
                </div>
              ) : (
                <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-xs text-white/60">
                  Téléphone non renseigné
                </div>
              )}
            </div>
          </section>

          {/* Infrastructure */}
          <section
            className="rounded-2xl border p-6 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)] min-h-[240px]"
            style={cardStyle}
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Infrastructures</h2>
            <div className="mt-4 grid gap-3 text-sm">
              {numberOfCourts && courtType ? (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-white/18 bg-black/25 px-3 py-2 text-white/85">
                    <span className="uppercase tracking-[0.25em] text-white">Terrains</span>
                    <span className="font-semibold">{numberOfCourts}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/18 bg-black/25 px-3 py-2 text-white/85">
                    <span className="uppercase tracking-[0.25em] text-white">Type</span>
                    <span className="font-semibold">{courtType}</span>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-white/18 bg-white/10 px-3 py-2 text-center text-xs text-white/60">
                  Informations non renseignées
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          {/* Horaires d'ouverture */}
          <section
            className="rounded-2xl border p-5 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
            style={cardStyle}
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Horaires d'ouverture</h2>
            <div className="mt-4 space-y-2 text-sm">
              {hours.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide ${item.isClosed ? "border-rose-400/45 bg-rose-500/15 text-rose-100" : "border-emerald-400/45 bg-emerald-500/15 text-emerald-50"}`}
                >
                  <span className="uppercase tracking-[0.25em] text-white">{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function InscriptionFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex justify-center"
    >
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-8">
        <h1 className="text-2xl font-extrabold mb-2">Inscription joueur</h1>
        <p className="text-white/60 mb-6 text-sm">Créez votre compte, puis associez‑le à votre club / complexe avec le code d'invitation.</p>
        
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Prénom"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              disabled
            />
            <input
              type="text"
              placeholder="Nom"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              disabled
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            disabled
          />
          <input
            type="password"
            placeholder="Mot de passe"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            disabled
          />
          
          <div className="space-y-3 pt-2">
            <label className="block text-sm text-white/70">Club / complexe</label>
            <select
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white"
              disabled
            >
              <option value="">Sélectionnez votre club / complexe</option>
              <option value="club-padel-toulouse">Club Padel Toulouse</option>
              <option value="padel-center-lyon">Padel Center Lyon</option>
              <option value="padel-club-marseille">Padel Club Marseille</option>
            </select>

            <label className="block text-sm text-white/70">Code d'invitation</label>
            <input
              placeholder="Saisir le code reçu"
              className="w-full rounded-md px-3 py-2 text-white placeholder-white/40 border bg-white/5 border-white/10"
              disabled
            />
          </div>
          
          <button
            disabled
            className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60 cursor-default"
            style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
          >
            Créer mon compte
          </button>
        </form>
        
        <div className="mt-4 text-center text-sm text-white/70">
          Déjà membre ? <span 
            className="underline cursor-default" 
            onClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
          >
            Se connecter
          </span>
        </div>
      </div>
    </motion.div>
  );
}


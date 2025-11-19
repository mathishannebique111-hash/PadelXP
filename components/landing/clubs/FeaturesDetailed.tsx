"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import RankBadge from "@/components/RankBadge";
import TierBadge from "@/components/TierBadge";
import { ALL_BADGES } from "@/lib/badges";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";

export default function FeaturesDetailed() {
  const [activeTab, setActiveTab] = useState("ranking");

  const tabs = [
    { id: "ranking", label: "🏆 Classement", emoji: "🏆" },
    { id: "gamification", label: "🎮 Gamification", emoji: "🎮" },
    { id: "public-page", label: "📱 Page Club", emoji: "📱" },
    { id: "inscription", label: "👥 Inscription", emoji: "👥" }
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
          <h3 className="text-xl font-bold text-white">👤 MARC L.</h3>
          <div className="flex items-center gap-2">
            <RankBadge rank={1} size="sm" />
            <span className="text-2xl">🥇</span>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Statistiques */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <span>📊</span> STATISTIQUES
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
              <span>🔥</span>
              <span>Série actuelle : 3 victoires</span>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <span>🏆</span> BADGES (4)
            </h4>
            <div className="flex flex-wrap gap-2">
              {[ALL_BADGES[0], ALL_BADGES[1], ALL_BADGES[7], ALL_BADGES[9]].map((badge, i) => (
                <span 
                  key={i} 
                  title={badge.title}
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-white bg-gray-800"
                >
                  {badge.icon} {badge.title}
                </span>
              ))}
            </div>
          </div>

          {/* Historique */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
              <span>📈</span> HISTORIQUE RÉCENT
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
                  team1Players: ["Marc L.", "Hatim"],
                  team2Players: ["Capucine", "Théo"],
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
                      <span className={`text-2xl ${match.won ? "text-green-600" : "text-red-600"}`}>
                        {match.won ? "🏆" : "❌"}
                      </span>
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
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        ÉQUIPE 1 {match.won && match.score === "2-0" && "🏆"}
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
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        ÉQUIPE 2 {!match.won && match.score === "1-2" && "🏆"}
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
          <h3 className="text-xl font-bold text-white text-center">🏆 CLASSEMENT - CLUB PADEL TOULOUSE</h3>
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
          <div className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-3">🔥 Joueurs les plus actifs</div>
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
          <h3 className="text-xl font-bold text-white mb-4">🏆 BADGES AUTOMATIQUES</h3>
          <div className="grid grid-cols-2 gap-3">
            {ALL_BADGES.slice(0, 10).map((badge, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-xs text-white/70">{badge.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">📢 FEED SOCIAL DU CLUB</h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {[
              { time: "Il y a 5 min", content: "🏆 Marc L. a remporté son match contre Sophie D. (6-4, 7-5) et prend la 1ère place ! 🥇", likes: 12, comments: 3 },
              { time: "Il y a 23 min", content: "🔥 Thomas R. a débloqué le badge \"Hot Streak\" ! 5 victoires consécutives 💪", likes: 18, comments: 5 },
              { time: "Il y a 1h", content: "🎉 Nouveau challenge : \"Challenge Automne 2025\" Inscriptions ouvertes !", likes: 24, comments: 8 },
              { time: "Il y a 3h", content: "📊 Changement au classement : Sophie D. monte en 2ème position ! Bravo 🎉", likes: 15, comments: 2 },
            ].map((post, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs text-white/60 mb-2">{post.time}</div>
                <div className="text-sm text-white mb-2">{post.content}</div>
                <div className="flex items-center gap-4 text-xs text-white/60">
                  <span className="flex items-center gap-1"><BadgeIconDisplay icon="💬" size={14} className="flex-shrink-0" /> {post.comments}</span>
                  <span>❤️ {post.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BadgeIconDisplay icon="🎯" size={24} className="flex-shrink-0" />
          <span>CHALLENGE NOVEMBRE : "Warriors"</span>
        </h3>
        <div className="space-y-4">
          <div className="text-white/70">
            Objectif : Jouer minimum 10 matchs en novembre
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-3">🏆 CLASSEMENT DU CHALLENGE</h4>
            <div className="space-y-3">
              {[
                { name: "Marc L.", progress: 12, target: 10, completed: true },
                { name: "Thomas R.", progress: 11, target: 10, completed: true },
                { name: "Sophie D.", progress: 10, target: 10, completed: true },
                { name: "Julie M.", progress: 8, target: 10, completed: false },
                { name: "Alex K.", progress: 6, target: 10, completed: false },
              ].map((player, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{i + 1}. {player.name}</span>
                    <span className={`font-semibold ${player.completed ? "text-green-400" : "text-white/70"}`}>
                      {player.progress}/{player.target} {player.completed && "✅"}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${player.completed ? "bg-green-400" : "bg-[#0066FF]"}`}
                      style={{ width: `${Math.min((player.progress / player.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-white/10 text-sm text-white/70">
            Récompense : Badge "November Warrior" + mise en avant spéciale sur le feed
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PublicPageFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700"
    >
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 h-32 rounded-lg flex items-center justify-center text-white/60">
          [PHOTO COUVERTURE CLUB - Grande bannière]
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-2xl">
            🏟️
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">CLUB PADEL TOULOUSE</h3>
            <div className="text-sm text-white/60">[Logo du club]</div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-white/70">
          <div>📍 12 Avenue de Toulouse, 31000 Toulouse</div>
          <div>⏰ Ouvert 7j/7 • 8h-23h</div>
          <div className="flex items-center gap-1">
            <BadgeIconDisplay icon="🎾" size={16} className="flex-shrink-0" />
            <span>4 terrains couverts • Climatisation</span>
          </div>
          <div>👥 156 membres actifs</div>
          <div>📞 05 XX XX XX XX</div>
          <div>🌐 www.clubpadeltoulouse.fr</div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/80 mb-2">📝 À PROPOS</h4>
          <p className="text-sm text-white/70">
            Club convivial au cœur de Toulouse, tous niveaux bienvenus. Ambiance familiale et compétitive avec événements réguliers.
          </p>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/80 mb-3">🏆 TOP 3 DU CLUB</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-white">
              <span>🥇</span> Marc L. - 156 pts
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <span>🥈</span> Sophie D. - 148 pts
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <span>🥉</span> Thomas R. - 142 pts
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/80 mb-3">🎪 PROCHAINS ÉVÉNEMENTS</h4>
          <div className="space-y-2 text-sm text-white/70">
            <div>• Challenge d'Automne - 1-30 Nov 2025</div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 rounded-lg transition-colors">
            📧 Nous contacter
          </button>
          <button className="flex-1 bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-semibold py-2 rounded-lg">
            📱 Rejoindre le club
          </button>
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
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 max-w-2xl mx-auto"
    >
      <h3 className="text-xl font-bold text-white mb-6 text-center">📍 REJOINDRE UN CLUB / COMPLEXE</h3>
      
      <div className="space-y-6">
        <div>
          <label className="text-sm text-white/70 mb-2 block">Entrez le code d'invitation de votre club / complexe :</label>
          <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-white/50 mb-4">
            [________________]
          </div>
          <button className="w-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-semibold py-3 rounded-lg">
            Rejoindre
          </button>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="text-sm text-white/70 mb-3">Ou recherchez votre club / complexe partenaire :</div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-white/50 mb-6">
            🔍 [Rechercher un club par ville________]
          </div>

          <div>
            <div className="text-sm font-semibold text-white/80 mb-4">CLUBS / COMPLEXES PARTENAIRES DISPONIBLES :</div>
            <div className="space-y-3">
              {[
                { name: "Club Padel Toulouse", city: "Toulouse", members: 156, courts: 4 },
                { name: "Padel Center Lyon", city: "Lyon", members: 203, courts: 6 },
                { name: "Padel Club Marseille", city: "Marseille", members: 87, courts: 3 },
              ].map((club, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>🏆</span>
                      <span className="font-semibold text-white">{club.name}</span>
                    </div>
                    <button className="text-xs bg-[#0066FF] text-white px-3 py-1 rounded-lg">
                      Rejoindre avec code
                    </button>
                  </div>
                  <div className="text-xs text-white/60">
                    📍 {club.city} • {club.members} membres • {club.courts} terrains
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-center">
            <div className="text-sm text-white/70 mb-3">🏟️ Votre club / complexe n'est pas listé ?</div>
            <div className="text-sm text-white/70 mb-4">Parlez-lui de Padel Pro !</div>
            <button className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
              Recommander à mon club / complexe
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


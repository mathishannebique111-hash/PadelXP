"use client";

import { User, Eye } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import RankBadge from "@/components/RankBadge";
import TierBadge from "@/components/TierBadge";

const DOWNLOAD_URL = "https://padelxp.eu/download";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  isGuest: boolean;
  avatar_url?: string | null;
  niveau_padel?: number | null;
}

interface PublicLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  profilesFirstNameMap: Record<string, string>;
  profilesLastNameMap: Record<string, string>;
}

export default function PublicLeaderboard({
  leaderboard,
  profilesFirstNameMap,
  profilesLastNameMap,
}: PublicLeaderboardProps) {
  const firstNameMap = new Map(Object.entries(profilesFirstNameMap));
  const lastNameMap = new Map(Object.entries(profilesLastNameMap));

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        Aucun joueur dans le classement
      </div>
    );
  }

  return (
    <div>
      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
              Top joueurs du moment
            </span>
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
          </div>
          <div className="flex items-end justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mt-4 sm:mt-6">
            {(() => {
              const top3 = leaderboard.slice(0, 3);
              const reordered = [top3[1], top3[0], top3[2]];
              return reordered.map((player, displayIndex) => {
                const realIndex = displayIndex === 0 ? 1 : displayIndex === 1 ? 0 : 2;
                const index = realIndex;
                const medalEmojis = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
                const borderColors = [
                  "border-yellow-500/80",
                  "border-slate-400/80",
                  "border-orange-600/80",
                ];
                const borderWidth = "border-2 sm:border-2 md:border-2";
                const shineClass =
                  index === 0
                    ? "podium-gold"
                    : index === 1
                    ? "podium-silver"
                    : "podium-bronze";
                const bgGradients = [
                  {
                    background:
                      "linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)",
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)",
                  },
                  {
                    background:
                      "linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)",
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)",
                  },
                  {
                    background:
                      "linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)",
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)",
                  },
                ];

                const firstName = firstNameMap.get(player.user_id) || "";
                const lastName = lastNameMap.get(player.user_id) || "";
                const nameParts = player.player_name
                  ? player.player_name.trim().split(" ")
                  : [];
                const finalFirstName = firstName || nameParts[0] || "";
                const finalLastName =
                  lastName || nameParts.slice(1).join(" ");
                const lastNameInitial = finalLastName
                  ? finalLastName.charAt(0).toUpperCase()
                  : "";

                const sizeClass =
                  index === 0
                    ? "max-w-[120px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[240px]"
                    : "max-w-[110px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px]";

                return (
                  <div
                    key={player.user_id}
                    className={`${shineClass} ${borderWidth} ${borderColors[index]} rounded-2xl p-2.5 sm:p-3 md:p-4 lg:p-5 shadow-lg relative overflow-hidden flex-1 ${sizeClass}`}
                    style={bgGradients[index]}
                  >
                    <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 z-30">
                      <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">
                        {medalEmojis[index]}
                      </span>
                    </div>
                    <div className="relative z-10 pt-3 sm:pt-4 md:pt-5">
                      <div className="flex justify-center mb-2 sm:mb-3">
                        {player.avatar_url ? (
                          <div
                            className={`relative flex-shrink-0 rounded-full overflow-hidden border-2 border-white/80 shadow-lg ${
                              index === 0
                                ? "w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24"
                                : "w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20"
                            }`}
                          >
                            <img
                              src={player.avatar_url}
                              alt={finalFirstName || "Joueur"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`relative flex-shrink-0 flex items-center justify-center bg-slate-200 rounded-full overflow-hidden shadow-lg ${
                              index === 0
                                ? "w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24"
                                : "w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20"
                            }`}
                          >
                            <User className="text-slate-400 w-2/3 h-2/3" />
                          </div>
                        )}
                      </div>
                      <h3
                        className={`font-extrabold mb-2 sm:mb-3 md:mb-4 text-center text-gray-900 leading-tight line-clamp-2 ${
                          index === 0
                            ? "text-sm sm:text-base md:text-lg lg:text-xl"
                            : "text-xs sm:text-sm md:text-base lg:text-lg"
                        }`}
                      >
                        {finalFirstName || "Joueur"}
                        {lastNameInitial ? " " + lastNameInitial + "." : ""}
                      </h3>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="overflow-hidden">
        <div className="px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5">
          <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
              Classement global
            </span>
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-1 sm:px-2 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 bg-gray-200 whitespace-nowrap w-12 sm:w-16">
                  Rang
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap min-w-[100px] sm:min-w-[180px]">
                  Joueur
                </th>
                <th className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">
                  Points
                </th>
                <th className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">
                  Récompense
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {leaderboard.map((player) => {
                const firstName = firstNameMap.get(player.user_id) || "";
                const lastName = lastNameMap.get(player.user_id) || "";
                const nameParts = player.player_name
                  ? player.player_name.trim().split(" ")
                  : [];
                const finalFirstName = firstName || nameParts[0] || "";
                const finalLastName =
                  lastName || nameParts.slice(1).join(" ");
                return (
                  <tr key={player.user_id}>
                    <td className="px-1 sm:px-2 py-2 sm:py-3 text-center border-l border-gray-200 first:border-l-0 w-12 sm:w-16">
                      <RankBadge rank={player.rank} size="sm" className="w-6 h-6 sm:w-8 sm:h-8" />
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-900 border-l border-gray-200 first:border-l-0 min-w-[100px] sm:min-w-[180px]">
                      <div className="flex items-center gap-1.5 sm:gap-3">
                        {player.avatar_url ? (
                          <div className="relative w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                            <img
                              src={player.avatar_url}
                              alt={finalFirstName || "Joueur"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center border border-gray-200">
                            <User className="text-slate-400 w-2/3 h-2/3" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="truncate block">
                            <strong>{finalFirstName || "Joueur"}</strong>
                            {finalLastName
                              ? " " +
                                finalLastName.charAt(0).toUpperCase() +
                                "."
                              : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">
                      {player.points}
                    </td>
                    <td className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center border-l border-gray-200 first:border-l-0">
                      {player.rank === 1 ? (
                        <span className="text-yellow-600 font-semibold">3 parties offertes + 3 mois d&apos;abonnement premium PadelXP</span>
                      ) : player.rank === 2 ? (
                        <span className="text-slate-500 font-semibold">1 partie offerte + 3 mois d&apos;abonnement premium PadelXP</span>
                      ) : player.rank === 3 ? (
                        <span className="text-orange-700 font-semibold">1 tube de balles + 3 mois d&apos;abonnement premium PadelXP</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code section */}
      {leaderboard.length <= 3 ? (
        /* Few players: big centered CTA */
        <div className="mt-10 sm:mt-14 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 sm:p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight max-w-lg">
            Tu veux participer au classement et gagner des récompenses ?
          </h3>
          <p className="text-white/50 text-sm sm:text-base mt-3 max-w-md">
            Scanne le QR code et enregistre tes matchs sur l&apos;application PadelXP
          </p>
          <div className="mt-8 bg-white rounded-2xl p-5 sm:p-6 shadow-[0_0_40px_rgba(34,197,94,0.15),0_8px_32px_rgba(0,0,0,0.3)] ring-2 ring-green-500/20">
            <QRCodeSVG
              value={DOWNLOAD_URL}
              size={220}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-white/40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="14" y="3" rx="1" /><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
            </svg>
            <span>Redirige automatiquement vers l&apos;App Store ou Google Play</span>
          </div>
        </div>
      ) : (
        /* Enough players: QR code bottom-left */
        <div className="mt-8 sm:mt-10 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-transparent p-5 sm:p-6 flex items-center gap-5 sm:gap-6">
          <div className="bg-white rounded-xl p-3 shadow-[0_0_30px_rgba(34,197,94,0.12),0_4px_16px_rgba(0,0,0,0.25)] ring-1 ring-green-500/20 shrink-0">
            <QRCodeSVG
              value={DOWNLOAD_URL}
              size={120}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-white">
              Rejoins le classement
            </p>
            <p className="text-sm text-white/45 mt-1">
              Scanne le QR code pour télécharger PadelXP et enregistrer tes matchs
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="14" y="3" rx="1" /><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
              </svg>
              <span>iPhone &amp; Android</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <div className="mt-10 sm:mt-14 flex flex-col items-center text-center px-4">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight max-w-lg">
            Tu veux participer au classement et gagner des récompenses ?
          </h3>
          <p className="text-white/50 text-sm sm:text-base mt-3 max-w-md">
            Scanne le QR code et enregistre tes matchs sur l&apos;application PadelXP
          </p>
          <div className="mt-6 sm:mt-8 bg-white rounded-2xl p-4 sm:p-6 shadow-2xl">
            <QRCodeSVG
              value={DOWNLOAD_URL}
              size={200}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="mt-3 text-xs text-white/30">
            Redirige automatiquement vers l&apos;App Store ou Google Play
          </p>
        </div>
      ) : (
        /* Enough players: QR code bottom-left */
        <div className="mt-8 sm:mt-10 flex items-end gap-4 sm:gap-5">
          <div className="bg-white rounded-xl p-3 shadow-lg">
            <QRCodeSVG
              value={DOWNLOAD_URL}
              size={120}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div className="pb-1">
            <p className="text-sm sm:text-base font-semibold text-white">
              Rejoins le classement
            </p>
            <p className="text-xs sm:text-sm text-white/40 mt-0.5">
              Scanne pour télécharger PadelXP
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <div className="mb-2 sm:mb-4">
          <div className="mb-1.5 sm:mb-2 flex items-center justify-center gap-2 sm:gap-3">
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
              Top joueurs du moment
            </span>
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
          </div>
          <div className="flex items-end justify-center gap-1.5 sm:gap-2 md:gap-3 mt-1 sm:mt-2">
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
                    ? "max-w-[90px] sm:max-w-[120px] md:max-w-[160px]"
                    : "max-w-[80px] sm:max-w-[110px] md:max-w-[140px]";

                return (
                  <div
                    key={player.user_id}
                    className={`${shineClass} border-2 ${borderColors[index]} rounded-xl p-1.5 sm:p-2 md:p-2.5 shadow-lg relative overflow-hidden flex-1 ${sizeClass}`}
                    style={bgGradients[index]}
                  >
                    <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-30">
                      <span className="text-sm sm:text-base md:text-lg">
                        {medalEmojis[index]}
                      </span>
                    </div>
                    <div className="relative z-10 pt-1 sm:pt-2">
                      <div className="flex justify-center mb-1 sm:mb-1.5">
                        {player.avatar_url ? (
                          <div
                            className={`relative flex-shrink-0 rounded-full overflow-hidden border-2 border-white/80 shadow-lg ${
                              index === 0
                                ? "w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14"
                                : "w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12"
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
                                ? "w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14"
                                : "w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12"
                            }`}
                          >
                            <User className="text-slate-400 w-2/3 h-2/3" />
                          </div>
                        )}
                      </div>
                      <h3
                        className={`font-extrabold text-center text-gray-900 leading-tight line-clamp-1 ${
                          index === 0
                            ? "text-[10px] sm:text-xs md:text-sm"
                            : "text-[9px] sm:text-[11px] md:text-xs"
                        }`}
                      >
                        {finalFirstName || "Joueur"}
                        {lastNameInitial ? " " + lastNameInitial + "." : ""}
                      </h3>
                      <p className="mt-0.5 sm:mt-1 text-[6px] sm:text-[8px] md:text-[10px] text-center leading-tight text-gray-500 font-medium line-clamp-2">
                        {index === 0
                          ? "3 parties offertes + 3 mois Premium"
                          : index === 1
                          ? "2 parties offertes + 3 mois Premium"
                          : "1 tube de balles + 3 mois Premium"}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Full table — top 20 split into two columns */}
      {(() => {
        const top20 = leaderboard.slice(0, 20);
        const leftCol = top20.slice(0, 10);
        const rightCol = top20.slice(10, 20);

        const renderTable = (players: LeaderboardEntry[]) => (
          <div className="rounded-xl border-2 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl flex-1 min-w-0 overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-1 py-1 text-center text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-900 whitespace-nowrap w-8 sm:w-10">
                    #
                  </th>
                  <th className="px-1 py-1 text-left text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-900 border-l border-gray-300 whitespace-nowrap">
                    Joueur
                  </th>
                  <th className="px-1 py-1 text-center text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-900 border-l border-gray-300 whitespace-nowrap w-8 sm:w-12">
                    M
                  </th>
                  <th className="px-1 py-1 text-center text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-900 border-l border-gray-300 whitespace-nowrap w-10 sm:w-14">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {players.map((player) => {
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
                      <td className="px-1 py-0.5 sm:py-1 text-center w-8 sm:w-10">
                        <RankBadge rank={player.rank} size="sm" className="w-4 h-4 sm:w-6 sm:h-6" />
                      </td>
                      <td className="px-1 py-0.5 sm:py-1 text-[8px] sm:text-xs text-gray-900 border-l border-gray-200 max-w-[60px] sm:max-w-[100px]">
                        <span className="truncate block">
                          <strong>{finalFirstName || "Joueur"}</strong>
                          {finalLastName
                            ? " " +
                              finalLastName.charAt(0).toUpperCase() +
                              "."
                            : ""}
                        </span>
                      </td>
                      <td className="px-1 py-0.5 sm:py-1 text-[8px] sm:text-xs text-center tabular-nums text-gray-900 border-l border-gray-200 w-8 sm:w-12">
                        {player.matches}
                      </td>
                      <td className="px-1 py-0.5 sm:py-1 text-[8px] sm:text-xs text-center tabular-nums text-gray-900 border-l border-gray-200 font-semibold w-10 sm:w-14">
                        {player.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

        return (
          <div className="overflow-hidden">
            <div className="px-3 sm:px-4 md:px-5 pt-2 sm:pt-3">
              <div className="mb-2 sm:mb-3 flex items-center justify-center gap-2 sm:gap-3">
                <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
                  Classement global
                </span>
                <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              {renderTable(leftCol)}
              {rightCol.length > 0 && renderTable(rightCol)}
            </div>
          </div>
        );
      })()}

      {/* QR Code big CTA when < 3 players */}
      {leaderboard.length < 3 && (
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
      )}
    </div>
  );
}

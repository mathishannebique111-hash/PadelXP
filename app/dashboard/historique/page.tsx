import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserClubInfo, getClubMatchHistory } from "@/lib/utils/club-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardHistoriquePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/historique");
  }

  const { clubId, clubSlug } = await getUserClubInfo();

  if (!clubId) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Historique des matchs</h1>
            <p className="text-white/60 text-sm">Aucun club n’est associé à ce compte administrateur.</p>
          </div>
        </header>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Associez ce compte à un club pour visualiser les matchs joués par vos membres.
        </div>
      </div>
    );
  }

  const { matches, totalMatches } = await getClubMatchHistory(clubId, clubSlug);

  const hasMatches = matches.length > 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Historique des matchs <span aria-hidden>📊</span></h1>
          <p className="text-white/60 text-sm">Résultats enregistrés par les joueurs rattachés à votre club.</p>
        </div>
        <span className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm text-white/70">
          {totalMatches} match{totalMatches > 1 ? "s" : ""}
        </span>
      </header>

      {hasMatches ? (
        <div className="space-y-4">
          {matches.map((match) => {
            const matchDate = match.created_at ? new Date(match.created_at) : null;
            const dateStr = matchDate
              ? matchDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
              : "Date inconnue";
            const timeStr = matchDate
              ? matchDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : "--:--";

            let cardClasses = "border-gray-200 bg-gray-50";
            let icon = "⏱️";
            let title = "Match en attente";
            let titleColor = "text-gray-700";

            if (match.result === "win") {
              cardClasses = "border-green-500 bg-green-50";
              icon = "🏆";
              title = "Victoire du club";
              titleColor = "text-green-600";
            } else if (match.result === "loss") {
              cardClasses = "border-red-300 bg-red-50";
              icon = "❌";
              title = "Défaite du club";
              titleColor = "text-red-600";
            } else if (match.result === "internal") {
              cardClasses = "border-blue-300 bg-blue-50";
              icon = "🤝";
              title = "Match interne";
              titleColor = "text-blue-600";
            }

            const winnerTeam = match.winner_team;

            return (
              <div key={match.id} className={`rounded-2xl border-2 p-6 transition-all ${cardClasses}`}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl ${titleColor}`}>{icon}</span>
                    <div>
                      <div className={`font-semibold ${titleColor}`}>{title}</div>
                      <div className="text-sm text-gray-600">
                        {dateStr} à {timeStr}
                      </div>
                      {match.decided_by_tiebreak && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <span>⚡</span>
                          <span>Match décidé au tie-break</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {match.score && (
                    <div className="rounded-lg bg-white px-4 py-2 text-lg font-bold text-gray-900 shadow-sm">
                      {match.score}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[{ team: match.team1, label: "Équipe 1", isWinner: winnerTeam === 1 }, { team: match.team2, label: "Équipe 2", isWinner: winnerTeam === 2 }].map(({ team, label, isWinner }, teamIndex) => {
                    const teamClasses = isWinner
                      ? "border-emerald-400 bg-emerald-50"
                      : winnerTeam && !isWinner
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white";

                    return (
                      <div key={teamIndex} className={`rounded-lg border ${teamClasses} p-4 transition-colors`}>
                        <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-600">
                          <span>
                            {label}
                            {isWinner && " 🏆"}
                          </span>
                          {match.clubTeam === teamIndex + 1 && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                              Club
                            </span>
                          )}
                        </div>
                        <div className="divide-y divide-gray-100">
                          {team.length === 0 && (
                            <div className="py-2 text-sm text-gray-500">Aucun joueur renseigné</div>
                          )}
                          {team.map((player) => {
                            const isGuest = player.player_type === "guest";
                            return (
                              <div key={`${player.player_type}-${player.user_id ?? player.guest_player_id}`} className="flex items-center gap-2 py-1.5">
                                <span className="text-[15px] font-medium text-gray-900 tracking-tight">{player.name}</span>
                                {player.isClubMember && (
                                  <span className="rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                    CLUB
                                  </span>
                                )}
                                {isGuest && (
                                  <span className="rounded-full border border-gray-300/80 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">
                                    Invité
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
          Aucun match enregistré pour l’instant. Encouragez vos joueurs à consigner leurs rencontres depuis leur espace joueur.
        </div>
      )}
    </div>
  );
}


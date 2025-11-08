"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import TierBadge from "../TierBadge";

type Row = {
  rank: number;
  user_id: string;
  name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  tier: string;
};

export default function LeaderboardPreviewMini() {
  const supabase = createClientComponentClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // Agréger les matches (users + guests), même logique que /home
      const { data: agg, error } = await supabase
        .from("match_participants")
        .select(
          `user_id, player_type, guest_player_id, team, matches!inner(winner_team_id, team1_id, team2_id), profiles(display_name), guest_players(first_name,last_name)`
        );

      if (error) {
        console.warn("Error loading leaderboard:", error);
        setLoading(false);
        return;
      }

      const by: Record<string, { name: string; wins: number; matches: number }> = {};
      (agg || []).forEach((r: any) => {
        const isGuest = r.player_type === "guest";
        // Déterminer winner_team (1 ou 2) à partir de winner_team_id
        const winner_team = r.matches?.winner_team_id === r.matches?.team1_id ? 1 : 2;
        const win = winner_team === r.team;
        const pid = isGuest && r.guest_player_id ? `guest_${r.guest_player_id}` : r.user_id;
        const nm = isGuest
          ? `${r.guest_players?.first_name ?? "Invité"} ${r.guest_players?.last_name ?? ""}`.trim()
          : r?.profiles?.display_name ?? "Joueur";
        if (!pid) return;
        if (!by[pid]) by[pid] = { name: nm, wins: 0, matches: 0 };
        by[pid].matches += 1;
        if (win) by[pid].wins += 1;
      });

      // Bonus premier avis: +10 points pour les users ayant au moins un avis
      const bonusMap = new Map<string, number>();
      const userIdsForBonus = Object.keys(by).filter(id => !id.startsWith("guest_"));
      if (userIdsForBonus.length > 0) {
        const { data: reviewers } = await supabase
          .from("reviews")
          .select("user_id")
          .in("user_id", userIdsForBonus);
        const hasReview = new Set((reviewers || []).map((r: any) => r.user_id));
        userIdsForBonus.forEach(uid => {
          if (hasReview.has(uid)) bonusMap.set(uid, 10);
        });
      }

      const getTier = (points: number): string => {
        if (points >= 500) return 'Champion';
        if (points >= 300) return 'Diamant';
        if (points >= 200) return 'Or';
        if (points >= 100) return 'Argent';
        return 'Bronze';
      };

      const list: Row[] = Object.entries(by).map(([id, s]) => {
        const losses = s.matches - s.wins; // Calculer les défaites explicitement
        const bonus = bonusMap.get(id) || 0;
        const points = s.wins * 10 + losses * 3 + bonus;
        return {
          rank: 0,
          user_id: id,
          name: s.name,
          wins: s.wins,
          losses: losses,
          matches: s.matches,
          points: points,
          tier: getTier(points),
        };
      });

      list.sort((a, b) => b.points - a.points);
      const withRank = list.slice(0, 4).map((r, i) => ({ ...r, rank: i + 1 }));
      setRows(withRank);
    } catch (error) {
      console.error("Error in load function:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // écoute simple en temps réel sur l'insert de matches
    const channel = supabase
      .channel("lb-preview")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/90 font-semibold"><span>Classement en temps réel</span><span className="ml-2 inline-flex items-center rounded-full bg-red-500/20 text-red-200 text-[10px] px-2 py-0.5">LIVE</span></div>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white/5">
        <table className="w-full text-xs">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-2 py-2 text-left font-semibold">Rang</th>
              <th className="px-2 py-2 text-left font-semibold">Joueur</th>
              <th className="px-2 py-2 text-center font-semibold">Niveau</th>
              <th className="px-2 py-2 text-right font-semibold">Points</th>
              <th className="px-2 py-2 text-right font-semibold">Matchs</th>
              <th className="px-2 py-2 text-right font-semibold">V</th>
              <th className="px-2 py-2 text-right font-semibold">D</th>
              <th className="px-2 py-2 text-right font-semibold">Win %</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="p-6 text-center text-white/50">Chargement…</td></tr>
            )}
            {!loading && rows.map((r) => {
              const winPercent = r.matches ? Math.round((r.wins / r.matches) * 100) : 0;
              return (
                <tr key={r.user_id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                  <td className="px-2 py-2 text-white/80 font-medium">#{r.rank}</td>
                  <td className="px-2 py-2">
                    <div className="h-2.5 w-24 md:w-32 bg-white/10 rounded blur-[2px] inline-block align-middle mr-2" />
                    <span className="text-white/30 text-xs">Connectez‑vous pour voir</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex justify-center">
                      <TierBadge tier={r.tier as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-white">{r.points}</td>
                  <td className="px-2 py-2 text-right text-white/80">{r.matches}</td>
                  <td className="px-2 py-2 text-right font-semibold text-green-400">{r.wins}</td>
                  <td className="px-2 py-2 text-right font-semibold text-red-400">{r.losses}</td>
                  <td className="px-2 py-2 text-right font-semibold" style={{color: winPercent>=60? '#10B981' : winPercent>=40? '#60A5FA' : '#EF4444'}}>{winPercent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



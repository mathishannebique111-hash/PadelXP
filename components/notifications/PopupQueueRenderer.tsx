"use client";

import { useEffect, useState } from "react";
import { usePopupQueue, BadgePopupData, LevelUpPopupData } from "@/contexts/PopupQueueContext";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import { Award, Trophy, Medal, Crown, Gem, X, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCoachName } from "@/lib/coach/coach-names";
import { getNextBadge, type PlayerStats } from "@/lib/badges";

export default function PopupQueueRenderer() {
  const { currentPopup, isShowing, closeCurrentPopup } = usePopupQueue();
  const [nextBadgeInfo, setNextBadgeInfo] = useState<{ title: string; hint: string } | null>(null);
  const [coachName, setCoachName] = useState("Pablo");

  // Fetch next badge + coach name when a badge popup shows
  useEffect(() => {
    if (!isShowing || !currentPopup || currentPopup.type !== "badge") return;
    setNextBadgeInfo(null);
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCoachName(getCoachName(user.id));

        // Fetch stats to calculate next badge
        const { data: profile } = await supabase.from("profiles").select("matchs_joues, points").eq("id", user.id).single();
        const { data: mp } = await supabase.from("match_participants").select("match_id").eq("user_id", user.id).eq("player_type", "user");
        const matchCount = mp?.length || profile?.matchs_joues || 0;

        // Approximate wins/losses from points: points = wins*10 + losses*3, matches = wins + losses
        // We can't get exact wins here easily, use a rough estimate
        const totalPoints = profile?.points || 0;
        const estimatedWins = matchCount > 0 ? Math.round((totalPoints - matchCount * 3) / 7) : 0;
        const wins = Math.max(0, estimatedWins);
        const losses = Math.max(0, matchCount - wins);

        const stats: PlayerStats = { wins, losses, matches: matchCount, points: totalPoints, streak: 0 };
        const next = getNextBadge(stats);
        if (next) {
          setNextBadgeInfo({ title: next.badge.title, hint: next.hint });
        }
      } catch { /* non-blocking */ }
    })();
  }, [isShowing, currentPopup]);

  if (!isShowing || !currentPopup) return null;

  // Rendre le popup selon son type
  if (currentPopup.type === "badge") {
    const badgeData = currentPopup as BadgePopupData;
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4">
          <button
            aria-label="Fermer"
            onClick={closeCurrentPopup}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="mb-3 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Award size={32} className="text-white" />
            </div>
          </div>
          <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">Badge débloqué !</h3>
          <div className="mx-auto mt-3 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <BadgeIconDisplay icon={badgeData.icon} size={32} />
            <div>
              <div className="text-sm font-bold text-gray-900">{badgeData.title}</div>
              {badgeData.description && <div className="text-xs text-gray-700">{badgeData.description}</div>}
            </div>
          </div>

          {/* Coach félicitation + prochain badge */}
          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700">
                <span className="font-semibold text-gray-900">{coachName}</span> — Bravo, tu mérites ce badge !
                {nextBadgeInfo && (
                  <span className="block mt-1 text-gray-500">
                    Prochain objectif : <span className="font-semibold text-gray-700">{nextBadgeInfo.title}</span> — {nextBadgeInfo.hint}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md transition-all"
            onClick={closeCurrentPopup}
          >
            Parfait
          </button>
        </div>
      </div>
    );
  }

  if (currentPopup.type === "level_up") {
    const levelData = currentPopup as LevelUpPopupData;

    // Icône et couleurs selon le tier
    const getTierConfig = (tier: string) => {
      switch (tier) {
        case "Champion":
          return {
            Icon: Crown,
            gradient: "from-yellow-400 via-amber-500 to-yellow-600",
            bgGradient: "from-yellow-50 to-amber-50"
          };
        case "Diamant":
          return {
            Icon: Gem,
            gradient: "from-cyan-400 via-blue-500 to-purple-500",
            bgGradient: "from-cyan-50 to-purple-50"
          };
        case "Or":
          return {
            Icon: Trophy,
            gradient: "from-yellow-400 to-amber-500",
            bgGradient: "from-yellow-50 to-amber-50"
          };
        case "Argent":
          return {
            Icon: Medal,
            gradient: "from-gray-300 to-gray-400",
            bgGradient: "from-gray-50 to-gray-100"
          };
        default: // Bronze
          return {
            Icon: Medal,
            gradient: "from-orange-400 to-orange-600",
            bgGradient: "from-orange-50 to-amber-50"
          };
      }
    };

    const config = getTierConfig(levelData.tier);
    const TierIcon = config.Icon;

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4">
          <button
            aria-label="Fermer"
            onClick={closeCurrentPopup}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="mb-3 flex justify-center">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
              <TierIcon size={32} className="text-white" />
            </div>
          </div>
          <h3 className="mb-2 text-center text-xl font-extrabold text-gray-900">Niveau atteint !</h3>
          <div className={`mx-auto mt-3 rounded-2xl bg-gradient-to-r ${config.bgGradient} p-4 text-center`}>
            <p className="text-gray-700">
              Félicitations, tu as atteint le niveau
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{levelData.tier}</p>
          </div>
          <button
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md transition-all"
            onClick={closeCurrentPopup}
          >
            Super !
          </button>
        </div>
      </div>
    );
  }

  if (currentPopup.type === "premium_success") {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
        <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/30 p-8 shadow-2xl mx-4 text-center overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
            <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] bg-amber-500 rounded-full blur-[60px]" />
            <div className="absolute bottom-[-20%] left-[-20%] w-[200px] h-[200px] bg-blue-600 rounded-full blur-[60px]" />
          </div>

          <button
            aria-label="Fermer"
            onClick={closeCurrentPopup}
            className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors z-20"
          >
            <X size={24} />
          </button>

          <div className="relative z-10">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-900/40 transform rotate-3">
                <Crown size={40} className="text-white drop-shadow-md" />
              </div>
            </div>

            <h3 className="mb-3 text-3xl font-black text-white tracking-tight">Félicitations !</h3>

            <div className="bg-slate-800/50 rounded-2xl p-4 mb-8 border border-slate-700">
              <p className="text-lg text-slate-200 leading-relaxed font-medium">
                Bienvenue dans la communauté des joueurs premium de PadelXP.
              </p>
            </div>

            <button
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-6 py-4 text-xl font-black text-white shadow-xl shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.02] active:scale-95 transition-all"
              onClick={closeCurrentPopup}
            >
              À moi de jouer !
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

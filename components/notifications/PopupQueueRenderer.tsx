"use client";

import { usePopupQueue, BadgePopupData, LevelUpPopupData } from "@/contexts/PopupQueueContext";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import { Award, Trophy, Medal, Crown, Gem, X } from "lucide-react";

export default function PopupQueueRenderer() {
  const { currentPopup, isShowing, closeCurrentPopup } = usePopupQueue();

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
          <div className="mx-auto mt-3 flex w-full max-w-sm items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <BadgeIconDisplay icon={badgeData.icon} size={32} />
            <div>
              <div className="text-sm font-bold text-gray-900">{badgeData.title}</div>
              {badgeData.description && <div className="text-xs text-gray-700">{badgeData.description}</div>}
            </div>
          </div>
          <button
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md transition-all"
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
          <div className={`mx-auto mt-3 rounded-xl bg-gradient-to-r ${config.bgGradient} p-4 text-center`}>
            <p className="text-gray-700">
              Félicitations, vous avez atteint le niveau
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{levelData.tier}</p>
          </div>
          <button
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md transition-all"
            onClick={closeCurrentPopup}
          >
            Super !
          </button>
        </div>
      </div>
    );
  }

  return null;
}

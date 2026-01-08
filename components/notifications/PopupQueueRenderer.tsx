"use client";

import { usePopupQueue, BadgePopupData, LevelUpPopupData, Top3PopupData } from "@/contexts/PopupQueueContext";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import NotificationModal from "@/components/NotificationModal";

export default function PopupQueueRenderer() {
  const { currentPopup, isShowing, closeCurrentPopup } = usePopupQueue();

  if (!isShowing || !currentPopup) return null;

  // Rendre le popup selon son type
  if (currentPopup.type === "badge") {
    const badgeData = currentPopup as BadgePopupData;
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <button
            aria-label="Fermer"
            onClick={closeCurrentPopup}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="mb-3 text-center text-5xl">🎉</div>
          <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">Badge débloqué !</h3>
          <div className="mx-auto mt-3 flex w-full max-w-sm items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <BadgeIconDisplay icon={badgeData.icon} size={32} />
            <div>
              <div className="text-sm font-bold text-gray-900">{badgeData.title}</div>
              {badgeData.description && <div className="text-xs text-gray-700">{badgeData.description}</div>}
            </div>
          </div>
          <button
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
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
    const emoji = levelData.tier === "Champion" ? "👑" : levelData.tier === "Diamant" ? "💎" : levelData.tier === "Or" ? "🥇" : levelData.tier === "Argent" ? "🥈" : "🥉";

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <button
            aria-label="Fermer"
            onClick={closeCurrentPopup}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="mb-3 text-center text-5xl">{emoji}</div>
          <h3 className="mb-2 text-center text-xl font-extrabold text-gray-900">Niveau atteint !</h3>
          <p className="text-center text-gray-700">
            Félicitations, vous avez atteint le niveau <span className="font-bold">{levelData.tier}</span>.
          </p>
          <button
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
            onClick={closeCurrentPopup}
          >
            Super !
          </button>
        </div>
      </div>
    );
  }

  if (currentPopup.type === "top3") {
    const top3Data = currentPopup as Top3PopupData;
    return <NotificationModal type={top3Data.notificationType} onClose={closeCurrentPopup} />;
  }

  return null;
}

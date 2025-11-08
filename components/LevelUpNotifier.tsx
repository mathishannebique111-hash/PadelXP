"use client";

import { useEffect, useMemo, useState } from "react";

interface Props {
  tier: string; // Bronze / Argent / Or / Diamant / Champion
}

export default function LevelUpNotifier({ tier }: Props) {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  const tierKey = useMemo(() => `padelleague.lastTier`, []);

  useEffect(() => {
    try {
      const last = window.localStorage.getItem(tierKey);
      if (tier && tier !== last) {
        // Eviter d'afficher au premier chargement si aucun historique ?
        if (last !== null) {
          setCurrent(tier);
          setShow(true);
        }
        window.localStorage.setItem(tierKey, tier);
      }
    } catch (e) {
      // fail silent
    }
  }, [tier, tierKey]);

  if (!show || !current) return null;

  const emoji = current === "Champion" ? "👑" : current === "Diamant" ? "💎" : current === "Or" ? "🥇" : current === "Argent" ? "🥈" : "🥉";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          aria-label="Fermer"
          onClick={() => setShow(false)}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div className="mb-3 text-center text-5xl">{emoji}</div>
        <h3 className="mb-2 text-center text-xl font-extrabold text-gray-900">Niveau atteint !</h3>
        <p className="text-center text-gray-700">
          Félicitations, vous avez atteint le niveau <span className="font-bold">{current}</span>.
        </p>
        <button
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
          onClick={() => setShow(false)}
        >
          Super !
        </button>
      </div>
    </div>
  );
}



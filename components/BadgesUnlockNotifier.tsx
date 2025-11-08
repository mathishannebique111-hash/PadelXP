"use client";

import { useEffect, useMemo, useState } from "react";

type Badge = {
  icon: string;
  title: string;
  description: string;
};

interface Props {
  obtained: Badge[]; // badges que l'utilisateur possède déjà selon les stats
}

export default function BadgesUnlockNotifier({ obtained }: Props) {
  const [toCelebrate, setToCelebrate] = useState<Badge[]>([]);
  const [show, setShow] = useState(false);

  const obtainedKeys = useMemo(() => obtained.map(b => `${b.icon}|${b.title}`), [obtained]);

  useEffect(() => {
    try {
      const key = "padelleague.seenBadges";
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      const seen: string[] = raw ? JSON.parse(raw) : [];

      const newlyUnlocked = obtained.filter(b => !seen.includes(`${b.icon}|${b.title}`));
      if (newlyUnlocked.length > 0) {
        setToCelebrate(newlyUnlocked);
        setShow(true);
        // marquer comme vus immédiatement pour éviter les répétitions en boucle
        const updated = Array.from(new Set([...seen, ...newlyUnlocked.map(b => `${b.icon}|${b.title}`)]));
        window.localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {
      // fail silent
    }
  }, [obtainedKeys.join(",")]);

  if (!show || toCelebrate.length === 0) return null;

  const first = toCelebrate[0];

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
        <div className="mb-3 text-center text-5xl">🎉</div>
        <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">Badge débloqué !</h3>
        <div className="mx-auto mt-3 flex w-full max-w-sm items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-2xl">{first.icon}</div>
          <div>
            <div className="text-sm font-bold text-gray-900">{first.title}</div>
            {first.description && <div className="text-xs text-gray-700">{first.description}</div>}
          </div>
        </div>
        <button
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
          onClick={() => setShow(false)}
        >
          Parfait
        </button>
      </div>
    </div>
  );
}



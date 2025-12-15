"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useUser } from '@/lib/hooks/useUser';
import { createNotification } from '@/lib/notifications';

interface Props {
  tier: string; // Bronze / Argent / Or / Diamant / Champion
}

export default function LevelUpNotifier({ tier }: Props) {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const checkedTierRef = useRef<string | null>(null); // Pour suivre le tier déjà vérifié dans cette session
  const { user, loading: userLoading } = useUser();

  const tierKey = useMemo(() => `padelleague.lastTier`, []);
  const shownTierKey = useMemo(() => `padelleague.shownTier`, []); // Clé pour suivre les tiers déjà affichés

  useEffect(() => {
    // Ne vérifier que si le tier a changé depuis la dernière vérification
    if (checkedTierRef.current === tier) return;
    
    try {
      const last = window.localStorage.getItem(tierKey);
      const shownTiers = window.localStorage.getItem(shownTierKey);
      const shownTiersList: string[] = shownTiers ? JSON.parse(shownTiers) : [];
      
      if (tier && tier !== last) {
        // Vérifier si ce tier a déjà été affiché (pour éviter de réafficher si le joueur se reconnecte)
        const hasBeenShown = shownTiersList.includes(tier);
        
        // TOUJOURS créer la notification dans la BD quand le tier change
        // (même si on ne montre pas le popup, pour que le NotificationCenter l'affiche)
        if (last !== null && user?.id) {
          createNotification(user.id, 'level_up', {
            tier,
            tier_name: tier,
            previous_tier: last,
            timestamp: new Date().toISOString(),
          }).catch(err => {
            console.error('Failed to save level_up notification to DB:', err)
          })
        }
        
        // Afficher le popup seulement si :
        // 1. Il y avait un tier précédent (pas le premier chargement)
        // 2. Ce tier n'a pas encore été affiché (pour éviter les répétitions au refresh)
        if (last !== null && !hasBeenShown) {
          setCurrent(tier);
          setShow(true);
          // Marquer ce tier comme affiché pour le popup
          const updated = Array.from(new Set([...shownTiersList, tier]));
          window.localStorage.setItem(shownTierKey, JSON.stringify(updated));
        }
        
        // Toujours mettre à jour le dernier tier
        window.localStorage.setItem(tierKey, tier);
      }
      // Marquer ce tier comme vérifié dans cette session
      checkedTierRef.current = tier;
    } catch (e) {
      // fail silent
      checkedTierRef.current = tier; // Marquer comme vérifié même en cas d'erreur
    }
  }, [tier, tierKey, shownTierKey, user]);

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



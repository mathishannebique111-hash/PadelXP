"use client";

import { useEffect, useMemo, useRef } from "react";
import { useUser } from '@/lib/hooks/useUser';
import { createNotification } from '@/lib/notifications';
import { usePopupQueue } from '@/contexts/PopupQueueContext';
import { logger } from '@/lib/logger';

interface Props {
  tier: string; // Bronze / Argent / Or / Diamant / Champion
}

export default function LevelUpNotifier({ tier }: Props) {
  const checkedTierRef = useRef<string | null>(null); // Pour suivre le tier déjà vérifié dans cette session
  const { user } = useUser();
  const { enqueuePopup } = usePopupQueue();

  const tierKey = useMemo(() => `padelleague.lastTier`, []);

  useEffect(() => {
    // Ne vérifier que si le tier a changé depuis la dernière vérification
    if (checkedTierRef.current === tier) return;
    
    try {
      const last = window.localStorage.getItem(tierKey);
      
      if (tier && tier !== last) {
        // TOUJOURS créer la notification dans la BD quand le tier change
        // (même si on ne montre pas le popup, pour que le NotificationCenter l'affiche)
        if (last !== null && user?.id) {
          createNotification(user.id, 'level_up', {
            tier,
            tier_name: tier,
            previous_tier: last,
            timestamp: new Date().toISOString(),
          }).catch(err => {
            logger.error('Failed to save level_up notification to DB:', err)
          })
        }
        
        // Afficher le popup seulement si il y avait un tier précédent (pas le premier chargement)
        // Le contexte gère la vérification des doublons
        if (last !== null) {
          enqueuePopup({
            type: "level_up",
            tier,
            previousTier: last,
          });
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
  }, [tier, tierKey, user, enqueuePopup]);

  // Ce composant ne rend plus rien, il délègue au PopupQueueRenderer
  return null;
}



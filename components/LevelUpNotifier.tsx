"use client";

import { useEffect, useMemo, useRef } from "react";
import { useUser } from '@/lib/hooks/useUser';
import { usePopupQueue } from '@/contexts/PopupQueueContext';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';

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
      
      if (tier && tier !== last && user?.id) {
        // Afficher le popup seulement si il y avait un tier précédent (pas le premier chargement)
        if (last !== null) {
          // Fonction async pour créer la notification et afficher le popup
          (async () => {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            
            // 1. Créer la notification en base de données IMMÉDIATEMENT
            try {
              await supabase.from('notifications').insert({
                user_id: user.id,
                type: 'level_up',
                title: 'Niveau atteint !',
                message: `Félicitations, vous avez atteint le niveau ${tier}.`,
                data: {
                  tier,
                  tier_name: tier,
                  previous_tier: last,
                  timestamp: new Date().toISOString(),
                },
                is_read: false,
                read: false,
              });
            } catch (err) {
              logger.error('Failed to save level_up notification to DB:', err);
            }
            
            // 2. Ajouter à la file d'attente des popups
            enqueuePopup({
              type: "level_up",
              tier,
              previousTier: last,
            });
          })().catch(err => {
            logger.error('Error processing level up:', err);
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



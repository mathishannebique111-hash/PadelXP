"use client";

import { useEffect, useMemo, useRef } from "react";
import { useUser } from '@/lib/hooks/useUser';
import { createNotification } from '@/lib/notifications';
import { usePopupQueue } from '@/contexts/PopupQueueContext';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';

type Badge = {
  icon: string;
  title: string;
  description: string;
};

interface Props {
  obtained: Badge[]; // badges que l'utilisateur possède déjà selon les stats
}

export default function BadgesUnlockNotifier({ obtained }: Props) {
  const checkedKeysRef = useRef<string>(""); // Pour suivre les badges déjà vérifiés dans cette session
  const { user } = useUser();
  const { enqueuePopup } = usePopupQueue();

  const obtainedKeys = useMemo(() => obtained.map(b => `${b.icon}|${b.title}`).sort().join(","), [obtained]);

  useEffect(() => {
    // Ne vérifier que si les badges ont changé depuis la dernière vérification
    if (checkedKeysRef.current === obtainedKeys) return;
    
    try {
      const key = "padelleague.seenBadges";
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      const seen: string[] = raw ? JSON.parse(raw) : [];

      const newlyUnlocked = obtained.filter(b => !seen.includes(`${b.icon}|${b.title}`));
      if (newlyUnlocked.length > 0 && user?.id) {
        // Fonction async pour traiter chaque badge
        const processBadges = async () => {
          const supabase = createClient();
          for (const badge of newlyUnlocked) {
            // 1. Créer la notification en base de données IMMÉDIATEMENT
            try {
              await supabase.from('notifications').insert({
                user_id: user.id,
                type: 'badge_unlocked',
                title: 'Badge débloqué !',
                message: `Badge débloqué : ${badge.title}`,
                data: {
                  badge_name: badge.title,
                  badge_icon: badge.icon,
                  badge_description: badge.description,
                  timestamp: new Date().toISOString(),
                },
                is_read: false,
                read: false,
              });
            } catch (err) {
              logger.error('Failed to save badge_unlocked notification to DB:', err);
            }
            
            // 2. Ajouter à la file d'attente des popups
            enqueuePopup({
              type: "badge",
              icon: badge.icon,
              title: badge.title,
              description: badge.description,
              badgeId: `${badge.icon}|${badge.title}`, // Identifiant unique
            });
          }
        };
        
        processBadges().catch(err => {
          logger.error('Error processing badges:', err);
        });

        // Marquer comme vus dans localStorage (le contexte gère aussi sa propre vérification)
        const updated = Array.from(new Set([...seen, ...newlyUnlocked.map(b => `${b.icon}|${b.title}`)]));
        window.localStorage.setItem(key, JSON.stringify(updated));
      }
      // Marquer ces badges comme vérifiés dans cette session
      checkedKeysRef.current = obtainedKeys;
    } catch (e) {
      // fail silent
      checkedKeysRef.current = obtainedKeys; // Marquer comme vérifié même en cas d'erreur
    }
  }, [obtainedKeys, user, enqueuePopup]);

  // Ce composant ne rend plus rien, il délègue au PopupQueueRenderer
  return null;
}



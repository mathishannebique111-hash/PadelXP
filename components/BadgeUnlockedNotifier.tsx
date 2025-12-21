'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createNotification } from '@/lib/notifications'
import { logger } from '@/lib/logger';

interface Badge {
  id: string
  name: string
  description?: string
  icon?: string
}

interface BadgeUnlockedNotifierProps {
  unlockedBadges: Badge[] // Liste des badges actuellement débloqués
}

export default function BadgeUnlockedNotifier({ unlockedBadges }: BadgeUnlockedNotifierProps) {
  const { user } = useUser()
  const previousBadgesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id || !unlockedBadges) return

    // Créer un Set avec les IDs actuels
    const currentBadgeIds = new Set(unlockedBadges.map(b => b.id))

    // Détecter les nouveaux badges (présents maintenant mais pas avant)
    const newBadges = unlockedBadges.filter(
      badge => !previousBadgesRef.current.has(badge.id)
    )

    // Si on détecte de nouveaux badges ET que ce n'est pas le premier chargement
    if (newBadges.length > 0 && previousBadgesRef.current.size > 0) {
      // Créer une notification pour chaque nouveau badge
      newBadges.forEach(badge => {
        createNotification(user.id, 'badge_unlocked', {
          badge_id: badge.id,
          badge_name: badge.name,
          badge_description: badge.description,
          badge_icon: badge.icon,
          timestamp: new Date().toISOString(),
        }).catch(err => {
          logger.error('Failed to save badge_unlocked notification:', err)
        })
      })
    }

    // Mettre à jour la référence
    previousBadgesRef.current = currentBadgeIds

  }, [unlockedBadges, user])

  // Ce composant ne rend rien (invisible)
  return null
}


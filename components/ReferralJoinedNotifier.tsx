'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createNotification } from '@/lib/notifications'
import { logger } from '@/lib/logger';

interface Referral {
  id: string
  name: string
  email?: string
  joined_at: string
}

interface ReferralJoinedNotifierProps {
  referrals: Referral[] // Liste des filleuls actuels
}

export default function ReferralJoinedNotifier({ referrals }: ReferralJoinedNotifierProps) {
  const { user } = useUser()
  const previousReferralIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id || !referrals) return

    // Créer un Set avec les IDs actuels
    const currentReferralIds = new Set(referrals.map(r => r.id))

    // Détecter les nouveaux filleuls (présents maintenant mais pas avant)
    const newReferrals = referrals.filter(
      referral => !previousReferralIdsRef.current.has(referral.id)
    )

    // Si on détecte de nouveaux filleuls ET que ce n'est pas le premier chargement
    if (newReferrals.length > 0 && previousReferralIdsRef.current.size > 0) {
      // Créer une notification pour chaque nouveau filleul
      newReferrals.forEach(referral => {
        createNotification(user.id, 'referral_joined', {
          referral_id: referral.id,
          referral_name: referral.name,
          referral_email: referral.email,
          joined_at: referral.joined_at,
          timestamp: new Date().toISOString(),
        }).catch(err => {
          logger.error('Failed to save referral_joined notification:', err)
        })
      })
    }

    // Mettre à jour la référence
    previousReferralIdsRef.current = currentReferralIds

  }, [referrals, user])

  // Ce composant ne rend rien (invisible)
  return null
}


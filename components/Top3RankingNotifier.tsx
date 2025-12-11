'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createNotification } from '@/lib/notifications'

interface Top3RankingNotifierProps {
  userRank: number | null // Position actuelle de l'utilisateur (1, 2, 3, ou > 3)
  totalPlayers?: number    // Nombre total de joueurs (optionnel)
}

export default function Top3RankingNotifier({ userRank, totalPlayers }: Top3RankingNotifierProps) {
  const { user } = useUser()
  const previousRankRef = useRef<number | null>(null)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!user?.id || userRank === null) return

    // Ignorer le premier chargement
    if (!hasInitializedRef.current) {
      previousRankRef.current = userRank
      hasInitializedRef.current = true
      return
    }

    const previousRank = previousRankRef.current

    // Détecter si l'utilisateur vient d'entrer dans le Top 3
    const wasNotInTop3 = previousRank === null || previousRank > 3
    const isNowInTop3 = userRank <= 3

    if (wasNotInTop3 && isNowInTop3) {
      // Créer une notification Top 3
      createNotification(user.id, 'top3_ranking', {
        rank: userRank,
        total_players: totalPlayers,
        timestamp: new Date().toISOString(),
      }).catch(err => {
        console.error('Failed to save top3_ranking notification:', err)
      })
    }

    // Mettre à jour la référence
    previousRankRef.current = userRank

  }, [userRank, totalPlayers, user])

  // Ce composant ne rend rien (invisible)
  return null
}


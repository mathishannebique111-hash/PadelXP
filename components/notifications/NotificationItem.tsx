'use client'

import { markAsRead } from '@/lib/notifications'
import type { Database } from '@/types/supabase'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trophy, Medal, TrendingUp, UserPlus, Bell } from 'lucide-react'
import TierBadge from '@/components/TierBadge'
import { logger } from '@/lib/logger';

type Notification = Database['public']['Tables']['notifications']['Row']

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead?: () => void
  markAsReadLocal?: (notificationId: string) => void
}

export default function NotificationItem({ notification, onMarkAsRead, markAsReadLocal }: NotificationItemProps) {
  const handleClick = async () => {
    if (!notification.read) {
      // Mise à jour immédiate de l'état local
      if (markAsReadLocal) {
        markAsReadLocal(notification.id)
      }
      
      try {
        await markAsRead(notification.id)
        // Recharger depuis la base de données pour synchroniser
        if (onMarkAsRead) {
          await onMarkAsRead()
        }
      } catch (error) {
        logger.error('Failed to mark notification as read:', error)
        // En cas d'erreur, recharger pour restaurer l'état correct
        if (onMarkAsRead) {
          await onMarkAsRead()
        }
      }
    }
  }

  // Helper pour convertir un numéro de tier en nom de tier
  const tierNumberToName = (tierNum: number | string): string | null => {
    const num = typeof tierNum === 'string' ? parseInt(tierNum, 10) : tierNum
    const tierMap: Record<number, string> = {
      1: 'Bronze',
      2: 'Argent',
      3: 'Or',
      4: 'Diamant',
      5: 'Champion'
    }
    return tierMap[num] || null
  }

  // Helper pour extraire et normaliser le tier depuis les données de notification
  const extractTier = (data: any): string | null => {
    if (!data) {
      return null
    }
    
    // Essayer différentes clés possibles
    let tierRaw = data.tier || data.tier_name || data.tierName || ''
    
    // Si tierRaw est un nombre, le convertir en nom de tier
    if (typeof tierRaw === 'number') {
      const tierName = tierNumberToName(tierRaw)
      if (tierName) {
        return tierName
      }
    }
    
    // Si tierRaw est une string qui contient un nombre (ex: "5" ou "Tier 5")
    if (typeof tierRaw === 'string') {
      // Extraire le nombre de "Tier 5" ou "5"
      const numberMatch = tierRaw.match(/(\d+)/)
      if (numberMatch) {
        const tierNum = parseInt(numberMatch[1], 10)
        const tierName = tierNumberToName(tierNum)
        if (tierName) {
          return tierName
        }
      }
      
      // Enlever "Tier " si présent, trim, et capitaliser la première lettre
      tierRaw = tierRaw.replace(/^Tier\s+/i, '').trim()
      
      // Liste des tiers valides
      const validTiers = ['Bronze', 'Argent', 'Or', 'Diamant', 'Champion']
      
      // Vérifier si le tier est valide
      const normalizedTier = tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1).toLowerCase()
      if (validTiers.includes(normalizedTier)) {
        return normalizedTier
      }
      
      // Essayer de trouver un tier proche (gestion des variations)
      const tierMatch = validTiers.find(t => 
        t.toLowerCase() === normalizedTier.toLowerCase() || 
        normalizedTier.toLowerCase().includes(t.toLowerCase())
      )
      
      if (tierMatch) {
        return tierMatch
      }
    }
    
    return null
  }

  const levelUpStyles: Record<string, { categoryColor: string; gradient: string; iconBg: string; borderColor: string }> = {
    Bronze: {
      categoryColor: 'bg-orange-500/20 text-orange-200 border border-orange-500/30',
      gradient: 'from-orange-500/10 to-orange-500/5',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      borderColor: 'border-l-orange-500'
    },
    Argent: {
      categoryColor: 'bg-gray-300/20 text-gray-100 border border-gray-300/30',
      gradient: 'from-gray-300/10 to-gray-200/5',
      iconBg: 'bg-gradient-to-br from-gray-300 to-gray-400',
      borderColor: 'border-l-gray-300'
    },
    Or: {
      categoryColor: 'bg-yellow-400/20 text-yellow-100 border border-yellow-400/30',
      gradient: 'from-yellow-400/10 to-amber-300/5',
      iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-400',
      borderColor: 'border-l-yellow-400'
    },
    Diamant: {
      categoryColor: 'bg-cyan-400/20 text-cyan-50 border border-cyan-400/30',
      gradient: 'from-cyan-400/10 to-blue-400/5',
      iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-400',
      borderColor: 'border-l-cyan-400'
    },
    Champion: {
      categoryColor: 'bg-purple-500/20 text-purple-50 border border-purple-500/30',
      gradient: 'from-purple-500/10 to-pink-500/5',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
      borderColor: 'border-l-purple-500'
    }
  }

  // Configuration du style selon le type de notification (style du site : fond sombre, glassmorphism)
  const getNotificationConfig = () => {
    let data = notification.data as any
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (e) {
        // Ignorer l'erreur
      }
    }

    switch (notification.type) {
      case 'level_up':
        {
          const tierName = extractTier(data)
          const style = (tierName && levelUpStyles[tierName]) || {
            categoryColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
            gradient: 'from-purple-500/10 to-purple-500/5',
            iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            borderColor: 'border-l-purple-500'
          }
        return {
          category: 'LEVEL UP',
          categoryColor: style.categoryColor,
          gradient: style.gradient,
          iconBg: style.iconBg,
          icon: Trophy,
          iconColor: 'text-white',
          borderColor: style.borderColor
        }
        }
      case 'badge':
      case 'badge_unlocked':
        return {
          category: 'BADGE',
          categoryColor: 'bg-[#BFFF00]/20 text-[#BFFF00] border border-[#BFFF00]/30',
          gradient: 'from-[#BFFF00]/10 to-[#BFFF00]/5',
          iconBg: 'bg-gradient-to-br from-[#BFFF00] to-yellow-500',
          icon: Medal,
          iconColor: 'text-black',
          borderColor: 'border-l-[#BFFF00]'
        }
      case 'top3':
      case 'top3_ranking':
        return {
          category: 'CLASSEMENT',
          categoryColor: 'bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/30',
          gradient: 'from-[#0066FF]/10 to-[#0066FF]/5',
          iconBg: 'bg-gradient-to-br from-[#0066FF] to-cyan-500',
          icon: TrendingUp,
          iconColor: 'text-white'
        }
      case 'referral':
      case 'referral_joined':
        return {
          category: 'PARRAINAGE',
          categoryColor: 'bg-[#BFFF00]/20 text-[#BFFF00] border border-[#BFFF00]/30',
          gradient: 'from-[#BFFF00]/10 to-[#BFFF00]/5',
          iconBg: 'bg-gradient-to-br from-[#BFFF00] to-green-500',
          icon: UserPlus,
          iconColor: 'text-black',
          borderColor: 'border-l-[#BFFF00]'
        }
      default:
        return {
          category: 'NOTIFICATION',
          categoryColor: 'bg-white/10 text-white/70 border border-white/20',
          gradient: 'from-white/5 to-white/0',
          iconBg: 'bg-gradient-to-br from-gray-500 to-gray-600',
          icon: Bell,
          iconColor: 'text-white'
        }
    }
  }

  // Rendre l'icône selon le type
  const renderIcon = () => {
    const config = getNotificationConfig()
    const IconComponent = config.icon
    let data = notification.data as any
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (e) {
        // Ignorer l'erreur
      }
    }

    // Pour level_up, on affiche le TierBadge si disponible
    if (notification.type === 'level_up') {
      const tier = extractTier(data)
      if (tier) {
        return (
          <div className="flex-shrink-0 w-full flex justify-center">
            <TierBadge tier={tier as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
          </div>
        )
      }
    }

    // Pour les autres types, utiliser l'icône Lucide dans un cercle avec gradient
    // Réduire légèrement la taille pour badge et classement
    const isSmallIcon = notification.type === 'badge' || 
                        notification.type === 'badge_unlocked' || 
                        notification.type === 'top3' || 
                        notification.type === 'top3_ranking'
    
    const circleSize = isSmallIcon 
      ? 'w-12 h-12 sm:w-14 sm:h-14' 
      : 'w-12 h-12 sm:w-14 sm:h-14'
    
    const iconSize = isSmallIcon
      ? 'w-6 h-6 sm:w-7 sm:h-7'
      : 'w-6 h-6 sm:w-7 sm:h-7'
    
    return (
      <div className={`flex-shrink-0 ${circleSize} rounded-full ${config.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <IconComponent className={`${iconSize} ${config.iconColor}`} />
      </div>
    )
  }

  // Message selon le type
  const getMessage = () => {
    let data = notification.data as any
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (e) {
        // Ignorer l'erreur
      }
    }
    
    switch (notification.type) {
      case 'level_up':
        const tierName = extractTier(data) || 'Nouveau tier'
        return `Félicitations ! Tu as atteint le niveau ${tierName}`
      case 'badge':
      case 'badge_unlocked':
        // Utiliser exactement le titre du badge tel qu'il est stocké
        const badgeName = data.badge_name || data.title || 'Nouveau badge'
        return `Badge débloqué : ${badgeName}`
      case 'top3':
      case 'top3_ranking':
        const rank = typeof data.rank === 'number' ? data.rank : parseInt(data.rank || '1', 10)
        const type = data.type || 'entered_top3'
        
        if (type === 'dethroned') {
          const prevRank = data.previous_rank || 1
          return `Tu es descendu de la ${prevRank}${prevRank === 1 ? 'ère' : 'ème'} place ! Continue à jouer pour remonter 💪`
        } else if (type === 'entered_top3') {
          const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
          return `Bravo ! Tu es entré dans le Top 3 ${rankEmoji} (Position #${rank})`
        } else if (type === 'rank_changed') {
          const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
          return `Ton classement a changé ! Tu es maintenant #${rank} ${rankEmoji}`
        } else {
          return `Tu es dans le Top 3 ! Position #${rank}`
        }
      case 'referral':
      case 'referral_joined':
        return `${data.referral_name || 'Un joueur'} a rejoint grâce à toi !`
      default:
        return 'Nouvelle notification'
    }
  }

  // Temps relatif (ex: "il y a 2h")
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  })

  const config = getNotificationConfig()
  const isUnread = !notification.read

  return (
    <div
      onClick={handleClick}
      className={`
        group relative grid grid-cols-[88px_1fr] sm:grid-cols-[104px_1fr] items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer
        transition-all duration-300 ease-out
        ${isUnread 
          ? `bg-gradient-to-r ${config.gradient} border-l-4 ${config.borderColor} backdrop-blur-sm` 
          : 'bg-white/5 hover:bg-white/10 border-l-4 border-l-transparent backdrop-blur-sm'
        }
        hover:scale-[1.01] hover:-translate-y-0.5 border-b border-white/10
      `}
    >
      {/* Point bleu animé pour les non lues */}
      {isUnread && (
        <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-[#0066FF] rounded-full animate-pulse shadow-lg shadow-[#0066FF]/50" />
      )}

      {/* Icône */}
      <div className="flex-shrink-0 w-full flex justify-center">
        {renderIcon()}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 space-y-1.5 pl-2 sm:pl-3">
        {/* Badge de catégorie */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.categoryColor}`}>
            {config.category}
          </span>
        </div>

        {/* Titre */}
        <p className={`text-sm sm:text-base text-white leading-snug ${isUnread ? 'font-bold' : 'font-semibold'}`}>
          {getMessage()}
        </p>

        {/* Temps relatif */}
        <p className="text-xs text-white/60 font-medium">
          {timeAgo}
        </p>
      </div>
    </div>
  )
}

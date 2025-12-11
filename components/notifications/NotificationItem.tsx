'use client'

import { markAsRead } from '@/lib/notifications'
import { Database } from '@/types/supabase'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type Notification = Database['public']['Tables']['notifications']['Row']

interface NotificationItemProps {
  notification: Notification
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const handleClick = async () => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id)
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
  }

  // Icônes selon le type
  const getIcon = () => {
    switch (notification.type) {
      case 'level_up':
        return '🎖️'
      case 'badge_unlocked':
        return '🏆'
      case 'top3_ranking':
        return '📊'
      case 'referral_joined':
        return '👥'
      default:
        return '🔔'
    }
  }

  // Message selon le type
  const getMessage = () => {
    const data = notification.data as any
    
    switch (notification.type) {
      case 'level_up':
        return `Level Up! ${data.tier_name || 'Tier ' + data.tier}`
      case 'badge_unlocked':
        return `Badge débloqué: ${data.badge_name}`
      case 'top3_ranking':
        return `Top 3 du leaderboard - Rang #${data.rank}`
      case 'referral_joined':
        return `${data.referral_name} a rejoint grâce à toi!`
      default:
        return 'Nouvelle notification'
    }
  }

  // Temps relatif (ex: "il y a 2h")
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  })

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-3 p-4 border-b cursor-pointer
        hover:bg-gray-50 transition-colors
        ${!notification.read ? 'bg-blue-50' : 'bg-white'}
      `}
    >
      {/* Icône */}
      <div className="text-2xl flex-shrink-0">
        {getIcon()}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-normal'}`}>
          {getMessage()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {timeAgo}
        </p>
      </div>

      {/* Badge non lu */}
      {!notification.read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
      )}
    </div>
  )
}

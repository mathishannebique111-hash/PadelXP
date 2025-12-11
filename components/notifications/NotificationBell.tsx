'use client'

import { useUser } from '@/lib/hooks/useUser'
import { useNotifications } from '@/lib/hooks/useNotifications'

interface NotificationBellProps {
  onClick: () => void
}

export default function NotificationBell({ onClick }: NotificationBellProps) {
  const { user } = useUser()
  const { unreadCount, loading } = useNotifications(user?.id)

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
      aria-label={loading ? 'Notifications' : `Notifications (${unreadCount} non lues)`}
      disabled={loading}
    >
      {/* Icône cloche */}
      <span className="text-2xl">🔔</span>

      {/* Badge avec nombre */}
      {!loading && unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

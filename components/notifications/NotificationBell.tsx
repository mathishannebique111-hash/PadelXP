'use client'

import { useUser } from '@/lib/hooks/useUser'
import { useNotifications } from '@/lib/hooks/useNotifications'
import Image from 'next/image'

interface NotificationBellProps {
  onClick: () => void
}

export default function NotificationBell({ onClick }: NotificationBellProps) {
  const { user } = useUser()
  const { unreadCount, loading } = useNotifications(user?.id)

  return (
    <button
      onClick={onClick}
      className="relative w-full h-full flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
      aria-label={loading ? 'Notifications' : `Notifications (${unreadCount} non lues)`}
      disabled={loading}
    >
      {/* Icône cloche */}
      <Image 
        src="/images/Notifications.png" 
        alt="Notifications"
        width={20}
        height={20}
        className="w-5 h-5 sm:w-6 sm:h-6"
      />

      {/* Badge avec nombre */}
      {!loading && unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

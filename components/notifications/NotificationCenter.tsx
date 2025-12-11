'use client'

import { useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { markAllAsRead } from '@/lib/notifications'
import NotificationBell from './NotificationBell'
import NotificationItem from './NotificationItem'

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useUser()
  const { notifications, unreadCount, loading } = useNotifications(user?.id)

  // Toujours afficher la cloche, même sans user (pour éviter les erreurs)
  if (!user) {
    return (
      <div className="relative">
        <button className="relative p-2" disabled>
          <span className="text-2xl">🔔</span>
        </button>
      </div>
    )
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    
    try {
      await markAllAsRead(user.id)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  return (
    <div className="relative">
      {/* Icône cloche */}
      <NotificationBell onClick={() => setIsOpen(!isOpen)} />

      {/* Panneau dropdown */}
      {isOpen && (
        <>
          {/* Overlay pour fermer au clic extérieur */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          {/* Panneau */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {/* Liste des notifications */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucune notification
                </div>
              ) : (
                notifications.map(notification => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                  />
                ))
              )}
            </div>

            {/* Footer (optionnel) */}
            {notifications.length > 0 && (
              <div className="p-3 border-t text-center">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

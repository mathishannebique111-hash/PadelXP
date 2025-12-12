'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { markAllAsRead } from '@/lib/notifications'
import NotificationBell from './NotificationBell'
import NotificationItem from './NotificationItem'

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const panelRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()
  const { notifications, unreadCount, loading, refreshNotifications, markNotificationAsReadLocal, markAllAsReadLocal } = useNotifications(user?.id)

  const handleOpen = () => {
    setIsOpen(true)
    setIsAnimating(true)
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      setIsAnimating(false)
    }, 400)
  }

  // Calculer la position et la taille du panneau pour qu'il soit centré et entièrement visible
  useEffect(() => {
    if (isOpen) {
      const updatePosition = () => {
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        
        // Padding adaptatif selon la taille d'écran
        const sidePadding = viewportWidth < 640 ? 12 : viewportWidth < 768 ? 20 : 24
        const verticalPadding = viewportWidth < 640 ? 20 : 40
        
        // Calculer la largeur : responsive selon la taille d'écran
        let width: number
        if (viewportWidth < 640) {
          // Mobile : presque pleine largeur avec petit padding
          width = Math.max(280, viewportWidth - sidePadding * 2)
        } else if (viewportWidth < 768) {
          // Tablette : 85% de la largeur
          width = viewportWidth * 0.85
        } else if (viewportWidth < 1024) {
          // Desktop moyen : 70% de la largeur, max 500px
          width = Math.min(500, viewportWidth * 0.7)
        } else {
          // Desktop large : max 500px
          width = Math.min(500, viewportWidth - sidePadding * 2)
        }
        
        // Calculer la hauteur maximale disponible
        const maxHeight = Math.max(400, viewportHeight - verticalPadding * 2)
        
        // Centrer le panneau horizontalement et verticalement
        const left = (viewportWidth - width) / 2
        const top = Math.max(verticalPadding, (viewportHeight - maxHeight) / 2)
        
        setPanelStyle({
          top: `${top}px`,
          left: `${left}px`,
          maxHeight: `${maxHeight}px`,
          width: `${width}px`,
          minHeight: viewportWidth < 640 ? '250px' : '300px',
          transform: 'none',
        })
      }
      
      // Calculer immédiatement
      updatePosition()
      
      // Recalculer au redimensionnement
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('resize', updatePosition)
      }
    } else {
      // Réinitialiser le style quand fermé
      setPanelStyle({})
    }
  }, [isOpen])

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
    
    // Mise à jour immédiate de l'état local
    markAllAsReadLocal()
    
    try {
      await markAllAsRead(user.id)
      // Recharger depuis la base de données pour synchroniser
      await refreshNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      // En cas d'erreur, recharger pour restaurer l'état correct
      await refreshNotifications()
    }
  }

  return (
    <div className="relative">
      {/* Icône cloche */}
      <NotificationBell onClick={() => isOpen ? handleClose() : handleOpen()} />

      {/* Panneau dropdown */}
      {isOpen && (
        <>
          {/* Overlay pour fermer au clic extérieur */}
          <div 
            className={`fixed inset-0 z-[100001] bg-black/50 backdrop-blur-sm transition-all duration-300 ease-in-out ${
              isClosing ? 'opacity-0' : 'opacity-0 animate-fadeIn'
            }`}
            onClick={handleClose}
          />

          {/* Panneau - Centré à l'écran et entièrement visible */}
          <div 
            ref={panelRef}
            className={`fixed bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 z-[100002] flex flex-col overflow-hidden ${
              isClosing 
                ? 'animate-scaleOut' 
                : 'animate-scaleIn'
            }`}
            style={panelStyle}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 gap-2 bg-gradient-to-r from-[#0066FF]/10 to-transparent">
              <h3 className="font-semibold text-base sm:text-lg text-white flex-shrink-0">Notifications</h3>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                aria-label="Fermer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 hover:text-white">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Liste des notifications - Scrollable */}
            <div 
              className="overflow-y-auto flex-1 min-h-0" 
              style={{ 
                scrollbarWidth: 'thin',
              }}
            >
              {loading ? (
                <div className="p-6 sm:p-8 text-center text-white/70 text-sm sm:text-base">
                  Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 sm:p-8 text-center text-white/70 text-sm sm:text-base">
                  Aucune notification
                </div>
              ) : (
                <div>
                  {notifications.map(notification => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification}
                      onMarkAsRead={refreshNotifications}
                      markAsReadLocal={markNotificationAsReadLocal}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && unreadCount > 0 && (
              <div className="p-3 sm:p-4 border-t border-gray-200 text-center flex-shrink-0 rounded-b-lg">
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-sm sm:text-base text-blue-600 hover:text-blue-800 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
                >
                  Tout marquer comme lu
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Animations CSS personnalisées */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes scaleOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.85);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-scaleOut {
          animation: scaleOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  )
}

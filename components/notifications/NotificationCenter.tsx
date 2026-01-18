'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellOff, X, CheckCheck, Award, TrendingUp, MessageCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { markAsRead, markAllAsRead } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  message: string | null;
  data: any;
  is_read?: boolean;
  read?: boolean;
  created_at: string;
}

const NOTIFICATIONS_PER_PAGE = 20;

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(NOTIFICATIONS_PER_PAGE);
  const [isClosing, setIsClosing] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const { user } = useUser();
  const router = useRouter();
  const { notifications, unreadCount, loading, refreshNotifications, markNotificationAsReadLocal, markAllAsReadLocal } = useNotifications(user?.id);

  // Filtrer les notifications des 72 dernières heures
  const recentNotifications = notifications.filter((n: Notification) => {
    const createdAt = new Date(n.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 72;
  });

  // Notifications à afficher (lazy loading)
  const displayedNotifications = recentNotifications.slice(0, displayedCount);
  const hasMore = recentNotifications.length > displayedCount;

  // Charger plus au scroll
  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;

    const handleScroll = () => {
      const element = scrollRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom && hasMore) {
        setDisplayedCount(prev => Math.min(prev + NOTIFICATIONS_PER_PAGE, recentNotifications.length));
      }
    };

    const element = scrollRef.current;
    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [isOpen, hasMore, recentNotifications.length]);

  // Gestion du swipe down pour fermer (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      // Démarrer le swipe seulement depuis le haut du panneau
      if (e.touches[0].clientY - rect.top < 50) {
        touchStartY.current = e.touches[0].clientY;
        setIsSwiping(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || touchStartY.current === null) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // Swipe down uniquement
    if (deltaY > 0) {
      setSwipeY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    // Si swipe > 100px, fermer
    if (swipeY > 100) {
      handleClose();
    } else {
      // Sinon, revenir à la position initiale
      setSwipeY(0);
    }

    setIsSwiping(false);
    touchStartY.current = null;
  };

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setSwipeY(0);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setDisplayedCount(NOTIFICATIONS_PER_PAGE); // Reset pour la prochaine ouverture
    }, 300);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setIsClosing(false);
    setSwipeY(0);
  };

  // Fermer au clic extérieur (desktop)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    // Délai pour éviter la fermeture immédiate au clic sur la Bell
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Empêcher le scroll du body quand le modal est ouvert (mobile)
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    if (!user?.id || isMarkingAll) return;

    setIsMarkingAll(true);
    markAllAsReadLocal();

    try {
      await markAllAsRead(user.id);
      await refreshNotifications();
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
      await refreshNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    const isRead = (notification as any).is_read !== undefined ? (notification as any).is_read : (notification as any).read;
    if (!isRead) {
      markNotificationAsReadLocal(notification.id);
      try {
        await markAsRead(notification.id);
        await refreshNotifications();
      } catch (error) {
        logger.error('Failed to mark notification as read:', error);
      }
    }

    // Navigation selon le type
    const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;

    if (notification.type === 'chat' && data?.conversation_id) {
      router.push(`/chat/${data.conversation_id}`);
    } else if (notification.type === 'badge' || notification.type === 'badge_unlocked') {
      router.push('/badges');
    } else if (notification.type === 'level_up') {
      router.push('/home?tab=profile');
    }

    handleClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'badge':
      case 'badge_unlocked':
        return <Award className="w-10 h-10 text-yellow-500" />;
      case 'level_up':
        return <TrendingUp className="w-10 h-10 text-green-500" />;
      case 'chat':
        return <MessageCircle className="w-10 h-10 text-blue-500" />;
      case 'top3':
      case 'top3_ranking':
        return <TrendingUp className="w-10 h-10 text-purple-500" />;
      default:
        return <AlertCircle className="w-10 h-10 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: fr,
      });
    } catch {
      return 'Récemment';
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Icône Bell avec badge */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-blue-950"
        aria-label={`Notifications, ${unreadCount} non lues`}
        aria-expanded={isOpen}
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modal/Panneau de notifications */}
      {isOpen && (
        <>
          {/* Overlay - Tap pour fermer */}
          <div
            className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleClose}
            aria-hidden="true"
            style={{
              opacity: isClosing ? 0 : 1,
            }}
          />

          {/* Panneau - Mobile First (fullscreen) puis Desktop (flyout) */}
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            aria-modal="true"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
            className={`
              fixed z-[100001] 
              bg-black/95 backdrop-blur-xl 
              flex flex-col overflow-hidden
              transition-transform duration-300 ease-out
              ${isClosing ? 'translate-y-full md:translate-y-0 md:scale-95 md:opacity-0' : 'translate-y-0'}
              inset-0 w-full h-full
              md:inset-auto md:top-16 md:right-4 md:w-[400px] md:max-h-[600px] md:rounded-2xl md:shadow-2xl md:border md:border-white/20
            `}
            style={{
              transform: isSwiping ? `translateY(${swipeY}px)` : undefined,
            }}
          >
            {/* Header - Sticky en haut */}
            <div
              className="flex-shrink-0 h-16 px-4 border-b border-white/10 flex items-center justify-between bg-black/95 sticky top-0 z-10 pt-[env(safe-area-inset-top,0px)]"
            >
              {/* Bouton retour/fermer (mobile) ou X (desktop) */}
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors md:hidden z-20"
                aria-label="Fermer"
                type="button"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors hidden md:block z-20"
                aria-label="Fermer"
                type="button"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>

              {/* Titre centré */}
              <h2 className="text-lg font-semibold text-white absolute left-1/2 transform -translate-x-1/2">
                Notifications
              </h2>

              {/* Bouton "Tout marquer lu" */}
              {displayedNotifications.length > 0 && unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  aria-label="Tout marquer comme lu"
                >
                  <CheckCheck className="w-5 h-5 text-white/70" />
                </button>
              )}
            </div>

            {/* Body - Scroll vertical */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto min-h-0 px-4 py-2 md:py-4"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.2) transparent',
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-white/70 text-sm">Chargement...</div>
                </div>
              ) : displayedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <BellOff className="w-16 h-16 text-white/30 mb-4" />
                  <p className="text-white/70 text-sm text-center">Aucune notification récente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedNotifications.map((notification: Notification) => {
                    const isRead = (notification as any).is_read !== undefined
                      ? (notification as any).is_read
                      : (notification as any).read;

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`
                          w-full 
                          min-h-[60px]
                          p-4 
                          rounded-2xl
                          text-left
                          transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black
                          active:scale-[0.98]
                          ${!isRead
                            ? 'bg-blue-500/10 border border-blue-500/20'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }
                        `}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icône - 40x40px sur mobile */}
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className={`
                                text-base font-semibold text-white leading-tight
                                ${!isRead ? 'font-bold' : ''}
                              `}>
                                {notification.title || 'Notification'}
                              </h3>
                              {!isRead && (
                                <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                              )}
                            </div>
                            <p className="text-base text-white/70 mb-2 line-clamp-2 leading-relaxed">
                              {notification.message || 'Nouvelle notification'}
                            </p>
                            <p className="text-sm text-white/60">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Indicateur "Charger plus" */}
                  {hasMore && (
                    <div className="py-4 text-center">
                      <p className="text-white/50 text-sm">
                        {recentNotifications.length - displayedCount} notification{recentNotifications.length - displayedCount > 1 ? 's' : ''} restante{recentNotifications.length - displayedCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Styles CSS pour scrollbar et animations */}
      <style jsx global>{`
        /* Scrollbar personnalisée pour le body de notifications */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
}

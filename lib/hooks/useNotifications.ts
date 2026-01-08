import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger, logError } from "@/lib/logger";

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

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Calculer le nombre de notifications non lues à partir de la liste
  const unreadCount = useMemo(() => {
    return notifications.filter(n => {
      // Gérer la compatibilité avec read et is_read
      const isRead = (n as any).is_read !== undefined ? (n as any).is_read : (n as any).read;
      return !isRead;
    }).length
  }, [notifications])

  // Fonction pour recharger les notifications depuis la base de données
  const refreshNotifications = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', seventyTwoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      logger.error('Error fetching notifications', { error: error.message })
    } else if (data) {
      // Normaliser les données pour gérer read/is_read
      const normalized = data.map((n: any) => ({
        ...n,
        is_read: n.is_read !== undefined ? n.is_read : n.read,
        read: n.read !== undefined ? n.read : n.is_read,
      }));
      setNotifications(normalized as Notification[])
    }
  }, [userId])

  // Fonction pour marquer une notification comme lue localement (mise à jour immédiate)
  const markNotificationAsReadLocal = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === notificationId) {
          return { ...n, is_read: true, read: true } as Notification;
        }
        return n;
      })
    )
  }, [])

  // Fonction pour marquer toutes les notifications comme lues localement
  const markAllAsReadLocal = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read: true } as Notification))
    )
  }, [])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Charger les notifications initiales (72 dernières heures)
    const fetchNotifications = async () => {
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', seventyTwoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(100) // Limiter à 100 notifications récentes

      if (error) {
        logger.error('Error fetching notifications', { error: error.message })
      } else if (data) {
        // Normaliser les données pour gérer read/is_read
        const normalized = data.map((n: any) => ({
          ...n,
          is_read: n.is_read !== undefined ? n.is_read : n.read,
          read: n.read !== undefined ? n.read : n.is_read,
        }));
        setNotifications(normalized as Notification[])
      }
      setLoading(false)
    }

    fetchNotifications()

    // Écouter les nouvelles notifications en temps réel
    let channel: any = null
    let subscriptionError = false

    try {
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as any;
              // Filtrer les notifications de plus de 72h
              const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
              const createdAt = new Date(newNotification.created_at);
              if (createdAt >= seventyTwoHoursAgo) {
                // Normaliser les données
                const normalized = {
                  ...newNotification,
                  is_read: newNotification.is_read !== undefined ? newNotification.is_read : (newNotification.read !== undefined ? newNotification.read : false),
                  read: newNotification.read !== undefined ? newNotification.read : (newNotification.is_read !== undefined ? newNotification.is_read : false),
                };
                setNotifications(prev => {
                  // Éviter les doublons
                  const exists = prev.some(n => n.id === normalized.id);
                  if (exists) return prev;
                  return [normalized as Notification, ...prev];
                });
                // Haptic feedback sur mobile (si disponible)
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(50);
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as any;
              const normalized = {
                ...updated,
                is_read: updated.is_read !== undefined ? updated.is_read : (updated.read !== undefined ? updated.read : false),
                read: updated.read !== undefined ? updated.read : (updated.is_read !== undefined ? updated.is_read : false),
              };
              setNotifications(prev =>
                prev.map(n => n.id === normalized.id ? (normalized as Notification) : n)
              )
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
            }
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Notifications subscription established')
            subscriptionError = false
          } else if (status === 'CLOSED') {
            logger.warn('Notifications subscription closed')
          } else if (status === 'CHANNEL_ERROR') {
            logger.warn('Notifications channel error - WebSocket might be unavailable')
            subscriptionError = true
          }
        })
    } catch (error) {
      logger.warn('Failed to establish real-time notifications subscription', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      })
      subscriptionError = true
    }

    return () => {
      if (channel) {
        try {
          channel.unsubscribe()
        } catch (error) {
          logger.warn('Error unsubscribing from notifications', { 
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }
  }, [userId])

  return { 
    notifications, 
    unreadCount, 
    loading, 
    refreshNotifications,
    markNotificationAsReadLocal,
    markAllAsReadLocal
  }
}


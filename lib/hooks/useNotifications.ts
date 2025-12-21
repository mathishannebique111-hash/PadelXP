import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import { logger, logError } from "@/lib/logger";

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Calculer le nombre de notifications non lues à partir de la liste
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length
  }, [notifications])

  // Fonction pour recharger les notifications depuis la base de données
  const refreshNotifications = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logger.error('Error fetching notifications', { error: error.message })
    } else if (data) {
      setNotifications(data)
    }
  }, [userId])

  // Fonction pour marquer une notification comme lue localement (mise à jour immédiate)
  const markNotificationAsReadLocal = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  // Fonction pour marquer toutes les notifications comme lues localement
  const markAllAsReadLocal = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }, [])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Charger les notifications initiales
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50) // Limiter à 50 notifications récentes

      if (error) {
        logger.error('Error fetching notifications', { error: error.message })
      } else if (data) {
        setNotifications(data)
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
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new as Notification, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Notification
              setNotifications(prev =>
                prev.map(n => n.id === updated.id ? updated : n)
              )
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
            }
          }
        )
        .subscribe((status) => {
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


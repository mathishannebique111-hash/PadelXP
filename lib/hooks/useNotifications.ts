import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

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
        console.error('Error fetching notifications:', error)
      } else if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
      setLoading(false)
    }

    fetchNotifications()

    // Écouter les nouvelles notifications en temps réel
    const channel = supabase
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
            setUnreadCount(prev => prev + 1)
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            )
            // Recalculer le compte de non lues
            setUnreadCount(prev => {
              const updated = payload.new as Notification
              const old = notifications.find(n => n.id === updated.id)
              if (old && !old.read && updated.read) {
                return Math.max(0, prev - 1)
              }
              return prev
            })
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])

  return { notifications, unreadCount, loading }
}


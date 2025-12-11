import { createClient } from '@/lib/supabase/client'

export type NotificationType = 'badge' | 'level_up' | 'top3' | 'referral' | 'challenge'

export interface NotificationData {
  [key: string]: any // Flexible pour stocker n'importe quelles données
}

/**
 * Crée une notification pour un utilisateur
 * @param userId - UUID de l'utilisateur
 * @param type - Type de notification
 * @param data - Données de la notification (badge_id, level, etc.)
 * @returns true si succès, false sinon
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  data: NotificationData
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        data,
        read: false,
      })

    if (error) {
      console.error('Error creating notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to create notification:', error)
    return false
  }
}

/**
 * Récupère les notifications non lues d'un utilisateur
 * @param userId - UUID de l'utilisateur
 * @returns Liste des notifications non lues
 */
export async function getUnreadNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }
}

/**
 * Marque une notification comme lue
 * @param notificationId - UUID de la notification
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return false
  }
}

/**
 * Marque une notification comme lue
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  
  if (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  
  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

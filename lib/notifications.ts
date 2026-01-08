import { createClient } from '@/lib/supabase/client'
import { logger, logError } from "@/lib/logger";

export type NotificationType = 'badge' | 'badge_unlocked' | 'level_up' | 'top3' | 'top3_ranking' | 'referral' | 'challenge'

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
    
    // Générer le titre et message selon le type
    let title: string | null = null;
    let message: string | null = null;
    
    if (type === 'badge_unlocked' || type === 'badge') {
      title = 'Badge débloqué !';
      message = data.badge_name ? `Badge débloqué : ${data.badge_name}` : 'Nouveau badge débloqué';
    } else if (type === 'level_up') {
      title = 'Niveau atteint !';
      message = data.tier_name ? `Félicitations, vous avez atteint le niveau ${data.tier_name}.` : 'Nouveau niveau atteint';
    }
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        read: false,
      })

    if (error) {
      logger.error('Error creating notification', { error: error.message })
      return false
    }

    return true
  } catch (error) {
    logger.error('Failed to create notification', { error: error instanceof Error ? error.message : String(error) })
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
      logger.error('Error fetching notifications', { error: error.message })
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Failed to fetch notifications', { error: error instanceof Error ? error.message : String(error) })
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
      logger.error('Error marking notification as read', { error: error.message })
      return false
    }

    return true
  } catch (error) {
    logger.error('Failed to mark notification as read', { error: error instanceof Error ? error.message : String(error) })
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
    .update({ is_read: true, read: true })
    .eq('id', notificationId)
  
  if (error) {
    logger.error('Error marking notification as read', { error: error.message })
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
    .update({ is_read: true, read: true })
    .eq('user_id', userId)
    .or('is_read.eq.false,read.eq.false')
  
  if (error) {
    logger.error('Error marking all notifications as read', { error: error.message })
    throw error
  }
}

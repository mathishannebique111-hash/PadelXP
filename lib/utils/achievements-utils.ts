/**
 * Utilitaires pour gérer les achievements (badges, notifications) de manière sécurisée
 * Remplace le stockage localStorage pour éviter les vulnérabilités XSS
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export type AchievementType = 'badge' | 'tier_notification' | 'referral_notification';

/**
 * Vérifie si un utilisateur a déjà vu un achievement
 */
export async function hasUserSeenAchievement(
  userId: string,
  achievementType: AchievementType,
  achievementKey: string
): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('[achievements] Supabase admin client not available');
    return false;
  }

  const { data, error } = await supabaseAdmin
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_type', achievementType)
    .eq('achievement_key', achievementKey)
    .maybeSingle();

  if (error) {
    console.error('[achievements] Error checking achievement:', error);
    return false;
  }

  return !!data;
}

/**
 * Récupère tous les achievements vus par un utilisateur
 */
export async function getUserSeenAchievements(
  userId: string,
  achievementType?: AchievementType
): Promise<string[]> {
  if (!supabaseAdmin) {
    console.error('[achievements] Supabase admin client not available');
    return [];
  }

  let query = supabaseAdmin
    .from('user_achievements')
    .select('achievement_key')
    .eq('user_id', userId);

  if (achievementType) {
    query = query.eq('achievement_type', achievementType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[achievements] Error fetching achievements:', error);
    return [];
  }

  return data?.map(a => a.achievement_key) || [];
}

/**
 * Marque un achievement comme vu par un utilisateur
 */
export async function markAchievementSeen(
  userId: string,
  achievementType: AchievementType,
  achievementKey: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase admin client not available' };
  }

  const { error } = await supabaseAdmin
    .from('user_achievements')
    .upsert({
      user_id: userId,
      achievement_type: achievementType,
      achievement_key: achievementKey,
      shown_at: new Date().toISOString(),
      metadata: metadata || {},
    }, {
      onConflict: 'user_id,achievement_type,achievement_key',
    });

  if (error) {
    console.error('[achievements] Error marking achievement as seen:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Marque plusieurs achievements comme vus (batch)
 */
export async function markAchievementsSeen(
  userId: string,
  achievements: Array<{
    type: AchievementType;
    key: string;
    metadata?: Record<string, any>;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase admin client not available' };
  }

  const achievementsToInsert = achievements.map(a => ({
    user_id: userId,
    achievement_type: a.type,
    achievement_key: a.key,
    shown_at: new Date().toISOString(),
    metadata: a.metadata || {},
  }));

  const { error } = await supabaseAdmin
    .from('user_achievements')
    .upsert(achievementsToInsert, {
      onConflict: 'user_id,achievement_type,achievement_key',
    });

  if (error) {
    console.error('[achievements] Error marking achievements as seen:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}


"use client";

import { useEffect, useState } from 'react';
import { useUser } from './useUser';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

type Theme = 'dark' | 'light';

/**
 * Hook pour gérer la persistance du thème (localStorage + Supabase)
 * Applique automatiquement le thème au chargement
 */
export function useThemePersistence() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const supabase = createClient();

  // Charger le thème au montage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // 1. Vérifier localStorage (priorité pour performance)
        const localTheme = typeof window !== 'undefined' 
          ? (localStorage.getItem('padelxp-theme') as Theme | null)
          : null;

        if (localTheme && (localTheme === 'dark' || localTheme === 'light')) {
          applyTheme(localTheme);
          setTheme(localTheme);
          setIsLoading(false);
          
          // Si l'utilisateur est connecté, synchroniser avec Supabase en arrière-plan
          if (user?.id && localTheme) {
            syncThemeToSupabase(localTheme).catch(err => {
              logger.error('Failed to sync theme to Supabase:', err);
            });
          }
          return;
        }

        // 2. Si pas de localStorage, charger depuis Supabase (si connecté)
        if (user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('theme_preference')
            .eq('id', user.id)
            .maybeSingle();

          if (!error && data?.theme_preference) {
            const dbTheme = data.theme_preference as Theme;
            applyTheme(dbTheme);
            setTheme(dbTheme);
            // Sauvegarder dans localStorage pour les prochains chargements
            if (typeof window !== 'undefined') {
              localStorage.setItem('padelxp-theme', dbTheme);
            }
          } else {
            // Par défaut: dark
            applyTheme('dark');
            setTheme('dark');
          }
        } else {
          // Pas connecté: utiliser dark par défaut
          applyTheme('dark');
          setTheme('dark');
        }
      } catch (error) {
        logger.error('Error loading theme:', error);
        // En cas d'erreur, utiliser dark par défaut
        applyTheme('dark');
        setTheme('dark');
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [user?.id]);

  // Fonction pour appliquer le thème au DOM
  const applyTheme = (newTheme: Theme) => {
    if (typeof window === 'undefined') return;
    
    const html = document.documentElement;
    const body = document.body;
    
    // Light mode désactivé pour le moment
    // On garde toujours le dark mode
    html.classList.remove('light-theme');
    html.classList.add('dark');
    body.classList.remove('light-theme');
  };

  // Synchroniser le thème avec Supabase
  const syncThemeToSupabase = async (newTheme: Theme) => {
    if (!user?.id) {
      logger.info('Cannot sync theme: user not authenticated');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id)
        .select('theme_preference')
        .single();

      if (error) {
        logger.error('Error updating theme in Supabase:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId: user.id,
        });
        throw error;
      }

      logger.info('Theme synced to Supabase successfully:', { theme: newTheme, userId: user.id });
    } catch (error: any) {
      logger.error('Failed to sync theme to Supabase:', {
        error: error?.message || String(error),
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userId: user?.id,
      });
      throw error;
    }
  };

  // Fonction pour changer le thème
  const changeTheme = async (newTheme: Theme) => {
    if (newTheme === theme) return;

    // 1. Appliquer immédiatement (optimistic update)
    applyTheme(newTheme);
    setTheme(newTheme);

    // 2. Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('padelxp-theme', newTheme);
    }

    // 3. Synchroniser avec Supabase (si connecté)
    if (user?.id) {
      try {
        await syncThemeToSupabase(newTheme);
      } catch (error) {
        // En cas d'erreur, on garde le thème appliqué (localStorage)
        logger.error('Failed to sync theme, but theme is applied locally:', error);
      }
    }
  };

  // Toggle entre dark et light
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    changeTheme(newTheme);
  };

  return {
    theme,
    isLoading,
    changeTheme,
    toggleTheme,
  };
}

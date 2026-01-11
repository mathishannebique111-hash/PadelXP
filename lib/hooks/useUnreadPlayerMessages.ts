'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUnreadPlayerMessages() {
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const checkUnread = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          setLoading(false);
          return;
        }

        // Récupérer la conversation du joueur
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id, is_read_by_user')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!conversation || !isMounted) {
          setLoading(false);
          return;
        }

        // Définir l'état initial : si is_read_by_user = false, il y a des messages non lus
        setHasUnread(!conversation.is_read_by_user);

        // S'abonner aux changements en temps réel
        if (isMounted) {
          channel = supabase
            .channel(`player-unread:${conversation.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${conversation.id}`
              },
              (payload: { new: { is_read_by_user: boolean } }) => {
                if (isMounted) {
                  const updatedConv = payload.new;
                  // Si marqué comme lu, pas de message non lu
                  setHasUnread(!updatedConv.is_read_by_user);
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversation.id}`
              },
              (payload: { new: { is_admin: boolean } }) => {
                if (isMounted) {
                  const newMessage = payload.new;
                  // Si c'est un message de l'admin, il y a un message non lu
                  if (newMessage.is_admin) {
                    setHasUnread(true);
                  }
                }
              }
            )
            .subscribe();
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[useUnreadPlayerMessages] Erreur vérification messages non lus', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkUnread();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { hasUnread, loading };
}

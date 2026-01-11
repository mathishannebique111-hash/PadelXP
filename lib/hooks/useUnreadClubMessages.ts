'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUnreadClubMessages() {
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const checkUnread = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // Récupérer le club_id de l'utilisateur (via profiles OU club_admins)
        let clubId: string | null = null;
        
        // Essayer d'abord via profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('club_id')
          .eq('id', user.id)
          .maybeSingle();

        clubId = profile?.club_id || null;

        // Si pas de club_id dans profiles, essayer via club_admins
        // club_admins.club_id peut être TEXT (slug ou UUID en texte), il faut convertir en UUID
        if (!clubId) {
          const { data: adminEntry } = await supabase
            .from('club_admins')
            .select('club_id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (adminEntry?.club_id) {
            // club_admins.club_id peut être TEXT (slug ou UUID en texte)
            // Chercher le club correspondant pour obtenir son UUID
            const { data: clubs } = await supabase
              .from('clubs')
              .select('id')
              .or(`id.eq.${adminEntry.club_id},slug.eq.${adminEntry.club_id}`);
            
            if (clubs && clubs.length > 0) {
              clubId = clubs[0].id;
            } else {
              // Si pas trouvé par id ou slug, vérifier si c'est déjà un UUID valide
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (uuidRegex.test(adminEntry.club_id)) {
                clubId = adminEntry.club_id;
              }
            }
          }
        }

        if (!clubId || !isMounted) {
          setLoading(false);
          return;
        }

        // Récupérer la conversation du club
        const { data: conversation } = await supabase
          .from('club_conversations')
          .select('id, is_read_by_club')
          .eq('club_id', clubId)
          .maybeSingle();

        if (!conversation || !isMounted) {
          setLoading(false);
          return;
        }

        // Si la conversation est marquée comme non lue, il y a des messages non lus
        setHasUnread(!conversation.is_read_by_club);

        // S'abonner aux changements en temps réel
        if (isMounted) {
          channel = supabase
            .channel(`club-unread:${conversation.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'club_conversations',
                filter: `id=eq.${conversation.id}`
              },
              (payload: { new: { is_read_by_club: boolean } }) => {
                if (isMounted) {
                  const updatedConv = payload.new;
                  // Si marqué comme lu, pas de message non lu
                  setHasUnread(!updatedConv.is_read_by_club);
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'club_messages',
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
        console.error('[useUnreadClubMessages] Erreur vérification messages non lus', error);
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

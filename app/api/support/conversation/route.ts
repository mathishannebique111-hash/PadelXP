import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// GET: Récupérer la conversation active et ses messages
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Utiliser admin client pour bypass RLS et récupérer toutes les données
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    if (!supabaseAdmin) {
      logger.error('[support-conversation] ❌ Supabase admin client not initialized');
      return NextResponse.json({ 
        error: 'Erreur de configuration serveur',
        conversation: null,
        messages: []
      }, { status: 500 });
    }

    // Récupérer le club_id de l'utilisateur en utilisant supabaseAdmin pour bypass RLS
    // Même logique que dans /api/contact/route.ts
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      logger.error({ err: profileError }, '[support-conversation] ❌ Error fetching profile');
    }

    let clubId = profile?.club_id;

    // Fallback: vérifier dans club_admins si l'utilisateur est admin d'un club
    if (!clubId) {
      logger.info('[support-conversation] ℹ️ No club_id in profile, checking club_admins...');
      const { data: adminEntry, error: adminError } = await supabaseAdmin
        .from('club_admins')
        .select('club_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminError) {
        logger.error({ err: adminError }, '[support-conversation] ❌ Error fetching club_admins');
      }

      if (adminEntry?.club_id) {
        clubId = adminEntry.club_id as string;
        logger.info({ clubId }, '[support-conversation] ✅ Found club_id in club_admins');
      }
    }

    if (!clubId) {
      const userIdPreview = user.id.substring(0, 8) + "…";
      logger.error({ userId: userIdPreview }, '[support-conversation] ❌ No club_id found for user');
      return NextResponse.json({ 
        error: 'Vous devez être rattaché à un club',
        conversation: null,
        messages: []
      });
    }

    logger.info({ clubId }, '[support-conversation] ✅ Found club_id');

    // Récupérer TOUTES les conversations (ouvertes et fermées) pour ce club
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('support_conversations')
      .select('*')
      .eq('club_id', clubId)
      .order('last_message_at', { ascending: false });

    if (convError) {
      logger.error({ err: convError }, '[support-conversation] ❌ Error fetching conversations');
      
      // Si la table n'existe pas, retourner un message explicite
      if (convError.code === '42P01' || convError.message?.includes('does not exist') || convError.message?.includes('schema cache')) {
        logger.warn('[support-conversation] ⚠️ Table support_conversations does not exist. Please run create_support_chat_system.sql');
        return NextResponse.json({ 
          error: 'Système de chat non configuré',
          hint: 'Veuillez exécuter le script create_support_chat_system.sql dans Supabase SQL Editor',
          conversations: []
        });
      }
      
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération des conversations',
        conversations: []
      }, { status: 500 });
    }

    const conversationsList = conversations || [];
    logger.info({
      count: conversationsList.length,
      conversationIds: conversationsList.map(c => c.id)
    }, '[support-conversation] ✅ Found conversations');

    // Pour chaque conversation, récupérer ses messages
    const conversationsWithMessages = await Promise.all(
      conversationsList.map(async (conv) => {
        const { data: conversationMessages, error: messagesError } = await supabaseAdmin
          .from('support_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (messagesError) {
          logger.error({ err: messagesError, conversationId: conv.id }, `[support-conversation] ❌ Error fetching messages for conversation`);
          return {
            ...conv,
            messages: []
          };
        }

        return {
          ...conv,
          messages: conversationMessages || []
        };
      })
    );

    logger.info({
      count: conversationsWithMessages.length,
      totalMessages: conversationsWithMessages.reduce((sum, c) => sum + (c.messages?.length || 0), 0)
    }, '[support-conversation] ✅ Conversations with messages');

    return NextResponse.json({
      conversations: conversationsWithMessages || [],
    });
  } catch (error) {
    logger.error({ err: error }, '[support-conversation] Unexpected error');
    return NextResponse.json({ 
      error: 'Erreur serveur',
      conversation: null,
      messages: []
    }, { status: 500 });
  }
}

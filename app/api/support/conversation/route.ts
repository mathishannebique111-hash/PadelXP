import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

    // Récupérer le club_id de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.club_id) {
      return NextResponse.json({ 
        error: 'Vous devez être rattaché à un club',
        conversation: null,
        messages: []
      });
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

    // Récupérer la conversation active (open) pour ce club
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('support_conversations')
      .select('*')
      .eq('club_id', profile.club_id)
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) {
      console.error('[support-conversation] Error fetching conversation:', convError);
      
      // Si la table n'existe pas, retourner un résultat vide plutôt qu'une erreur
      if (convError.code === '42P01' || convError.message?.includes('does not exist') || convError.message?.includes('schema cache')) {
        console.warn('[support-conversation] Table support_conversations does not exist. Please run create_support_chat_system.sql');
        return NextResponse.json({ 
          conversation: null,
          messages: []
        });
      }
      
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération de la conversation',
        conversation: null,
        messages: []
      }, { status: 500 });
    }

    let messages: any[] = [];

    if (conversation) {
      // Récupérer les messages de cette conversation
      const { data: conversationMessages, error: messagesError } = await supabaseAdmin
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('[support-conversation] Error fetching messages:', messagesError);
        // Si la table n'existe pas, retourner un tableau vide
        if (messagesError.code === '42P01' || messagesError.message?.includes('does not exist') || messagesError.message?.includes('schema cache')) {
          messages = [];
        }
      } else {
        messages = conversationMessages || [];
      }
    }

    return NextResponse.json({
      conversation: conversation || null,
      messages: messages || [],
    });
  } catch (error) {
    console.error('[support-conversation] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      conversation: null,
      messages: []
    }, { status: 500 });
  }
}


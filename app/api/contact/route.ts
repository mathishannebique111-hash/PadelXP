import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Adresse email inbound de Resend (les emails envoyés ici seront capturés par le webhook resend-inbound)
const INBOUND_EMAIL = process.env.RESEND_INBOUND_EMAIL || 'contact@updates.padelxp.eu';
// Adresse email où les emails inbound seront transférés (Gmail)
const FORWARD_TO_EMAIL = process.env.FORWARD_TO_EMAIL || 'contactpadelxp@gmail.com';

// Initialiser Resend au niveau du module
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('[contact] Resend initialized with API key');
  } else {
    console.warn('[contact] RESEND_API_KEY not found in environment variables');
  }
} catch (error) {
  console.error('[contact] Failed to initialize Resend:', error);
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Le message est requis' }, { status: 400 });
    }

    // Récupérer l'utilisateur et son email
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

    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Email introuvable' }, { status: 400 });
    }

    // Utiliser le client admin pour récupérer le profil (bypass RLS)
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

    // Récupérer le profil avec le client admin
    let clubName = 'Un club';
    let clubId: string | null = null;
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name, club_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[contact] Error fetching profile:', profileError);
    }

    if (profile?.club_id) {
      clubId = profile.club_id;
      console.log('[contact] Found club_id from profile:', clubId);
    } else {
      // Si pas de club_id dans le profil, essayer de trouver via la table clubs (si l'utilisateur est admin)
      console.log('[contact] No club_id in profile, trying to find club via clubs table...');
      const { data: club, error: clubError } = await supabaseAdmin
        .from('clubs')
        .select('id, name, admin_id')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (clubError) {
        console.error('[contact] Error fetching club:', clubError);
      }

      if (club?.id) {
        clubId = club.id;
        clubName = club.name || 'Un club';
        console.log('[contact] Found club via admin_id:', clubId, clubName);
      }
    }

    if (!clubId) {
      console.error('[contact] No club found for user:', {
        userId: user.id,
        userEmail,
        profileHasClubId: !!profile?.club_id,
        profileError: profileError?.message,
      });
      return NextResponse.json({ 
        error: 'Impossible de trouver votre club. Veuillez vérifier que votre compte est bien configuré.' 
      }, { status: 400 });
    }

    // Envoyer l'email
    if (!resend || !process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured in environment variables');
      return NextResponse.json({ 
        error: 'Service d\'envoi d\'email non configuré. Veuillez configurer RESEND_API_KEY dans les variables d\'environnement.' 
      }, { status: 500 });
    }

    // Utiliser le domaine par défaut de Resend si aucun domaine personnalisé n'est configuré
    // Le domaine par défaut de Resend est "onboarding@resend.dev" ou "delivered@resend.dev"
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'PadelXP <onboarding@resend.dev>';

    console.log('[contact] Attempting to send email:', {
      from: fromEmail,
      to: INBOUND_EMAIL, // Envoyer vers l'adresse inbound pour que le webhook le traite
      replyTo: userEmail,
      clubName,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'none',
      resendInitialized: !!resend,
    });

    if (!resend) {
      console.error('[contact] Resend is not initialized!');
      return NextResponse.json({ 
        error: 'Service d\'envoi d\'email non initialisé' 
      }, { status: 500 });
    }

    // Récupérer le nom du club si on ne l'a pas encore
    if (clubName === 'Un club') {
      const { data: club } = await supabaseAdmin
        .from('clubs')
        .select('name')
        .eq('id', clubId)
        .maybeSingle();

      if (club?.name) {
        clubName = club.name;
      }
    }

    // Chercher une conversation ouverte existante pour ce club
    const { data: existingConversation } = await supabaseAdmin
      .from('support_conversations')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;
    if (existingConversation) {
      conversationId = existingConversation.id;
      console.log('[contact] Using existing conversation:', conversationId);
    } else {
      // Créer une nouvelle conversation
      // Ne pas spécifier created_at et last_message_at car ils ont des valeurs par défaut dans la table
      const { data: newConversation, error: convError } = await supabaseAdmin
        .from('support_conversations')
        .insert({
          club_id: clubId,
          user_id: user.id,
          user_email: userEmail,
          club_name: clubName,
          subject: `Message de contact - ${clubName}`,
          status: 'open',
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[contact] Error creating conversation:', {
          error: convError,
          errorMessage: convError.message,
          errorDetails: convError.details,
          errorHint: convError.hint,
          errorCode: convError.code,
          clubId,
          userId: user.id,
          userEmail,
          clubName,
          fullError: JSON.stringify(convError, null, 2),
        });
        
        // Gérer les différents types d'erreurs
        let errorMessage = convError.message || 'Erreur inconnue';
        if (convError.code === '42P01' || convError.message?.includes('does not exist') || convError.message?.includes('schema cache')) {
          errorMessage = `La table 'support_conversations' n'existe pas. Veuillez exécuter le script SQL 'create_support_chat_system.sql' dans Supabase SQL Editor.`;
        } else if (convError.code === '23503') {
          errorMessage = `Erreur de référence: Le club ou l'utilisateur spécifié n'existe pas.`;
        } else if (convError.code === '23505') {
          errorMessage = `Une conversation existe déjà pour ce club et cet utilisateur.`;
        }
        
        return NextResponse.json({ 
          error: `Erreur lors de la création de la conversation: ${errorMessage}`,
          details: convError.details,
          hint: convError.hint,
          code: convError.code,
        }, { status: 500 });
      }

      if (!newConversation || !newConversation.id) {
        console.error('[contact] Conversation created but no data returned');
        return NextResponse.json({ 
          error: 'Erreur lors de la création de la conversation: aucune donnée retournée' 
        }, { status: 500 });
      }

      conversationId = newConversation.id;
      console.log('[contact] Created new conversation:', conversationId);
    }

    // Générer un identifiant unique pour lier l'email à la conversation
    const conversationToken = Buffer.from(conversationId).toString('base64url');
    
    // Utiliser userEmail comme replyTo pour que les réponses arrivent à l'email du club
    // Les headers X-Conversation-ID permettront d'identifier la conversation dans le webhook
    console.log('[contact] Calling resend.emails.send...');
    const emailSubject = `[${conversationId.substring(0, 8)}] Message de contact - ${clubName}`;
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: INBOUND_EMAIL, // Envoyer vers l'adresse inbound de Resend (sera capturé par le webhook resend-inbound)
      replyTo: userEmail, // Réponses envoyées à l'email du club, mais Resend webhook les capturera
      subject: emailSubject,
      headers: {
        'X-Conversation-ID': conversationId,
        'X-Club-ID': clubId,
        'X-Reply-Token': conversationToken, // Token pour identifier la conversation dans les réponses
        'X-Sender-Type': 'club', // Indiquer que c'est un message du club
      },
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Inter, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0066FF, #0052CC); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066FF; }
              .info { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .info-item { margin: 5px 0; }
              .reply-note { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; font-size: 12px; color: #856404; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📧 Nouveau message de contact</h1>
              </div>
              <div class="content">
                <div class="info">
                  <div class="info-item"><strong>Club :</strong> ${clubName}</div>
                  <div class="info-item"><strong>Email du club :</strong> ${userEmail}</div>
                </div>
                <div class="message-box">
                  <strong>Message :</strong>
                  <p style="white-space: pre-wrap; margin-top: 10px;">${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="reply-note">
                  <strong>💡 Pour répondre :</strong> Répondez simplement à cet email. Votre réponse apparaîtra dans la page "Aide & Support" du club.
                </div>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  Ce message a été envoyé depuis la page "Aide & Support" du compte club.
                  <br/>
                  <small>Conversation ID: ${conversationId}</small>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('[contact] Email result received:', {
      hasError: !!emailResult.error,
      hasData: !!emailResult.data,
      errorDetails: emailResult.error ? JSON.stringify(emailResult.error, null, 2) : null,
      dataDetails: emailResult.data ? JSON.stringify(emailResult.data, null, 2) : null,
    });

    if (emailResult.error) {
      console.error('[contact] Resend API error:', JSON.stringify(emailResult.error, null, 2));
      return NextResponse.json({ 
        error: `Erreur lors de l'envoi: ${emailResult.error.message || JSON.stringify(emailResult.error)}`,
        errorDetails: emailResult.error 
      }, { status: 500 });
    }

    console.log('[contact] Email sent successfully:', {
      id: emailResult.data?.id,
      to: INBOUND_EMAIL,
      conversationId,
    });

    // Enregistrer le message initial dans la base de données
    if (emailResult.data?.id) {
      const { error: messageError } = await supabaseAdmin
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'club',
          sender_id: user.id,
          sender_email: userEmail,
          message_text: message.trim(),
          html_content: message.replace(/\n/g, '<br>'),
          email_message_id: emailResult.data.id,
        });

      if (messageError) {
        console.error('[contact] Error saving message:', messageError);
        // Ne pas échouer la requête si le message est sauvegardé, juste logger l'erreur
      } else {
        console.log('[contact] Message saved to database');
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Message envoyé avec succès',
      conversationId 
    });
  } catch (error) {
    console.error('[contact] Unexpected error:', error);
    console.error('[contact] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Erreur lors de l\'envoi du message',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


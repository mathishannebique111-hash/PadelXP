import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { logger } from '@/lib/logger';

// Schéma de validation Zod pour le formulaire de contact
const ContactSchema = z.object({
  message: z.string().trim().min(1, "Le message est requis").max(5000, "Le message est trop long"),
  conversationId: z.string().uuid().optional(),
});

// Adresse email inbound de Resend (les emails envoyés ici seront capturés par le webhook resend-inbound)
const INBOUND_EMAIL = process.env.RESEND_INBOUND_EMAIL || 'contact@updates.padelxp.eu';
// Adresse email où les emails inbound seront transférés (Gmail)
const FORWARD_TO_EMAIL = process.env.FORWARD_TO_EMAIL || 'contactpadelxp@gmail.com';

// Initialiser Resend au niveau du module
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    logger.info({}, '[contact] Resend initialized with API key');
  } else {
    logger.warn({}, '[contact] RESEND_API_KEY not found in environment variables');
  }
} catch (error) {
  logger.error({ error }, '[contact] Failed to initialize Resend');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation avec Zod
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";
      
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    const { message, conversationId: providedConversationId } = parsed.data;

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

    // Utiliser getUserClubInfo pour récupérer le club de l'utilisateur (gère profiles + club_admins + metadata)
    const clubInfo = await getUserClubInfo();
    
    if (!clubInfo.clubId) {
      logger.error({ userId: user.id.substring(0, 8) + "…", userEmail: userEmail.substring(0, 5) + "…" }, '[contact] No club found for user');
      return NextResponse.json({ 
        error: 'Impossible de trouver votre club. Veuillez vérifier que votre compte est bien configuré.' 
      }, { status: 400 });
    }

    const clubId = clubInfo.clubId;
    let clubName = clubInfo.clubName || 'Un club';
    
    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", clubName }, '[contact] Found club');

    // Utiliser le client admin pour les opérations sur support_conversations et support_messages
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

    // Envoyer l'email
    if (!resend || !process.env.RESEND_API_KEY) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, 'RESEND_API_KEY not configured in environment variables');
      return NextResponse.json({ 
        error: 'Service d\'envoi d\'email non configuré. Veuillez configurer RESEND_API_KEY dans les variables d\'environnement.' 
      }, { status: 500 });
    }

    // Utiliser une adresse "from" avec le domaine vérifié updates.padelxp.eu
    // Si RESEND_FROM_EMAIL est configuré, l'utiliser, sinon utiliser le domaine vérifié
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'PadelXP Support <support@updates.padelxp.eu>';

    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", clubName, hasResendKey: !!process.env.RESEND_API_KEY, resendInitialized: !!resend }, '[contact] Attempting to send email');

    if (!resend) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, '[contact] Resend is not initialized!');
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

    let conversationId: string;
    
    // Si un conversationId a été fourni, l'utiliser (réponse dans une conversation existante)
    if (providedConversationId) {
      // Vérifier que la conversation existe et appartient au club
      const { data: existingConversation, error: convCheckError } = await supabaseAdmin
        .from('support_conversations')
        .select('id, club_id')
        .eq('id', providedConversationId)
        .eq('club_id', clubId)
        .maybeSingle();

      if (convCheckError || !existingConversation) {
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: providedConversationId.substring(0, 8) + "…", error: convCheckError }, '[contact] Error checking conversation');
        return NextResponse.json({ 
          error: 'Conversation introuvable ou vous n\'avez pas accès à cette conversation' 
        }, { status: 404 });
      }

      conversationId = providedConversationId;
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…" }, '[contact] Using provided conversationId');
    } else {
      // Sinon, chercher une conversation ouverte existante pour ce club
      const { data: existingConversation } = await supabaseAdmin
        .from('support_conversations')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .eq('status', 'open')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConversation) {
        conversationId = existingConversation.id;
        logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…" }, '[contact] Using existing conversation');
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
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", error: { message: convError.message, details: convError.details, hint: convError.hint, code: convError.code } }, '[contact] Error creating conversation');
        
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
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, '[contact] Conversation created but no data returned');
        return NextResponse.json({ 
          error: 'Erreur lors de la création de la conversation: aucune donnée retournée' 
        }, { status: 500 });
      }

      conversationId = newConversation.id;
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…" }, '[contact] Created new conversation');
      }
    }

    // IMPORTANT: Enregistrer le message dans la DB AVANT d'essayer d'envoyer l'email
    // Comme ça, le message apparaîtra toujours dans le chat, même si l'envoi d'email échoue
    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…" }, '[contact] Saving message to database first');
    const { error: messageError, data: savedMessage } = await supabaseAdmin
      .from('support_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'club',
        sender_id: user.id,
        sender_email: userEmail,
        message_text: message.trim(),
        html_content: message.replace(/\n/g, '<br>'),
        // email_message_id sera mis à jour après l'envoi de l'email
      })
      .select()
      .single();

    if (messageError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", error: messageError }, '[contact] Error saving message to database');
      // Si la table n'existe pas, retourner un message explicite
      if (messageError.code === '42P01' || messageError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Système de chat non configuré',
          hint: 'Veuillez exécuter le script create_support_chat_system.sql dans Supabase SQL Editor',
          details: messageError.message
        }, { status: 500 });
      }
      // Sinon, continuer quand même (l'envoi d'email peut toujours fonctionner)
    } else {
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", messageId: savedMessage?.id?.substring(0, 8) + "…" || null }, '[contact] Message saved to database');
      
      // Mettre à jour last_message_at de la conversation
      await supabaseAdmin
        .from('support_conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          status: 'open'
        })
        .eq('id', conversationId);
    }

    // Générer un identifiant unique pour lier l'email à la conversation
    const conversationToken = Buffer.from(conversationId).toString('base64url');
    
    // Utiliser userEmail comme replyTo pour que les réponses arrivent à l'email du club
    // Les headers X-Conversation-ID permettront d'identifier la conversation dans le webhook
    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…" }, '[contact] Calling resend.emails.send');
    const emailSubject = `[${conversationId}] Message de contact - ${clubName}`;
    
    // Envoyer en priorité directement à l'email administrateur.
    // Les réponses iront vers l'adresse inbound (via replyTo) et seront traitées par le webhook resend-inbound.
    let emailResult = await resend.emails.send({
      from: fromEmail,
      to: FORWARD_TO_EMAIL, // Envoyer directement à Gmail (administrateur)
      replyTo: INBOUND_EMAIL, // Les réponses iront à l'inbound pour être capturées par le webhook
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

    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", hasError: !!emailResult.error, hasData: !!emailResult.data }, '[contact] Email result received');

    // Si l'envoi direct à Gmail échoue, essayer d'envoyer vers l'adresse inbound comme secours
    if (emailResult.error && INBOUND_EMAIL !== FORWARD_TO_EMAIL) {
      const errorMessage = emailResult.error.message || emailResult.error.toString() || 'Erreur inconnue';
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", error: emailResult.error }, '[contact] Resend API error when sending to Gmail (FORWARD_TO_EMAIL)');
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…" }, '[contact] Trying to send to inbound email as fallback');
      
      emailResult = await resend.emails.send({
        from: fromEmail,
        to: INBOUND_EMAIL, // Envoyer vers l'adresse inbound en secours
        replyTo: userEmail, // Dans ce cas de secours, les réponses iront directement au club
        subject: emailSubject,
        headers: {
          'X-Conversation-ID': conversationId,
          'X-Club-ID': clubId,
          'X-Reply-Token': conversationToken,
          'X-Sender-Type': 'club',
          'X-Inbound-Email': INBOUND_EMAIL, // Garder l'info de l'inbound pour référence
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
      
      if (!emailResult.error) {
        logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", emailId: emailResult.data?.id?.substring(0, 8) + "…" || null }, '[contact] Email sent successfully to inbound (fallback)');
      } else {
        // Si même l'envoi direct à Gmail échoue, logger l'erreur mais ne pas bloquer (le message est déjà dans la DB)
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", error: emailResult.error }, '[contact] Failed to send email even to Gmail (fallback)');
      }
    }

    // Si l'email a été envoyé avec succès, logger l'info
    if (!emailResult.error && emailResult.data?.id) {
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", emailId: emailResult.data.id.substring(0, 8) + "…" }, '[contact] Email sent successfully');
    }

    // Mettre à jour email_message_id si l'email a été envoyé avec succès
    if (emailResult.data?.id && savedMessage?.id) {
      await supabaseAdmin
        .from('support_messages')
        .update({ email_message_id: emailResult.data.id })
        .eq('id', savedMessage.id);
      
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", messageId: savedMessage.id.substring(0, 8) + "…", emailId: emailResult.data.id.substring(0, 8) + "…" }, '[contact] Message email_message_id updated');
    }

    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", conversationId: conversationId.substring(0, 8) + "…", messageId: savedMessage?.id?.substring(0, 8) + "…" || null, emailSent: !!emailResult.data?.id }, '[contact] ✅ Success! Message sent and saved');

    return NextResponse.json({ 
      success: true, 
      message: 'Message envoyé avec succès',
      conversationId,
      messageId: savedMessage?.id
    });
  } catch (error) {
    logger.error({ error }, '[contact] Unexpected error');
    logger.error({ error: error instanceof Error ? error.stack : 'No stack' }, '[contact] Error stack');
    return NextResponse.json({ 
      error: 'Erreur lors de l\'envoi du message',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


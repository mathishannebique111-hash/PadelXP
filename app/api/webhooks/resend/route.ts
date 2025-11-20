import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialiser Resend pour vérifier les signatures (optionnel mais recommandé)
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (error) {
  console.error('[webhook-resend] Failed to initialize Resend:', error);
}

// Initialiser Supabase Admin pour écrire dans la base de données
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

/**
 * Webhook Resend pour recevoir les réponses par email
 * Configuration dans Resend: Settings > Inbound Email > Add Domain
 * Puis configurer le webhook vers cette URL: https://yourdomain.com/api/webhooks/resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[webhook-resend] Received webhook:', JSON.stringify(body, null, 2));

    // Resend envoie différents types d'événements
    // Pour les emails entrants (Inbound Email), la structure est différente
    const eventType = body.type || body['event-type'];
    
    if (eventType === 'email.received' || body.type === 'email.received') {
      // Email reçu (réponse à un email envoyé)
      const emailData = body.data || body;
      
      const fromEmail = emailData.from || emailData.from_email || emailData.from_address;
      const toEmail = emailData.to || emailData.to_email || emailData.to_address || emailData.recipient;
      const subject = emailData.subject || '';
      const textContent = emailData.text || emailData.text_body || '';
      const htmlContent = emailData.html || emailData.html_body || '';
      const messageId = emailData.message_id || emailData.id;
      const inReplyTo = emailData.in_reply_to || emailData.headers?.['In-Reply-To'] || emailData.references?.[0];
      const references = emailData.references || emailData.headers?.['References'] || [];
      const conversationIdHeader = emailData.headers?.['X-Conversation-ID'] || emailData.headers?.['x-conversation-id'];
      
      console.log('[webhook-resend] Email received:', {
        from: fromEmail,
        to: toEmail,
        subject,
        messageId,
        inReplyTo,
        conversationIdHeader,
      });

      // Extraire l'ID de conversation depuis le Reply-To header ou le To header
      let conversationId: string | null = null;
      
      // Méthode 1: Depuis le header X-Conversation-ID
      if (conversationIdHeader) {
        conversationId = conversationIdHeader;
      }
      
      // Méthode 2: Depuis le To header (format: reply+TOKEN@domain.com)
      if (!conversationId && toEmail) {
        const match = toEmail.match(/reply\+([^@]+)@/);
        if (match && match[1]) {
          try {
            conversationId = Buffer.from(match[1], 'base64url').toString('utf-8');
          } catch (e) {
            console.error('[webhook-resend] Error decoding conversation ID from To header:', e);
          }
        }
      }
      
      // Méthode 3: Depuis les références (In-Reply-To ou References)
      if (!conversationId && inReplyTo) {
        conversationId = inReplyTo;
      }
      
      // Méthode 4: Chercher dans le sujet (format [8 premiers chars] ou [UUID complet])
      if (!conversationId) {
        // Chercher d'abord un UUID complet (36 caractères avec tirets)
        const fullUuidMatch = subject.match(/\[([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]/i);
        if (fullUuidMatch && fullUuidMatch[1]) {
          conversationId = fullUuidMatch[1];
        } else {
          // Si pas d'UUID complet, chercher les 8 premiers caractères et chercher la conversation correspondante
          const shortIdMatch = subject.match(/\[([a-f0-9]{8})\]/i);
          if (shortIdMatch && shortIdMatch[1]) {
            const shortId = shortIdMatch[1];
            // Chercher une conversation dont l'ID commence par ces 8 caractères
            const { data: matchingConversation } = await supabaseAdmin
              .from('support_conversations')
              .select('id')
              .like('id', `${shortId}%`)
              .limit(1)
              .maybeSingle();
            
            if (matchingConversation) {
              conversationId = matchingConversation.id;
              console.log('[webhook-resend] Found conversation by short ID:', shortId, '->', conversationId);
            }
          }
        }
      }

      if (!conversationId) {
        console.error('[webhook-resend] Could not find conversation ID from email:', {
          to: toEmail,
          subject,
          headers: emailData.headers,
        });
        // Si on ne trouve pas de conversation ID, on ne peut pas lier le message
        return NextResponse.json({ 
          error: 'Conversation ID not found',
          received: true 
        }, { status: 400 });
      }

      // Vérifier que la conversation existe
      const { data: conversation, error: convError } = await supabaseAdmin
        .from('support_conversations')
        .select('id, club_id, status')
        .eq('id', conversationId)
        .maybeSingle();

      if (convError || !conversation) {
        console.error('[webhook-resend] Conversation not found:', conversationId, convError);
        return NextResponse.json({ 
          error: 'Conversation not found',
          conversationId 
        }, { status: 404 });
      }

      // Vérifier si ce message n'a pas déjà été reçu (éviter les doublons)
      if (messageId) {
        const { data: existingMessage } = await supabaseAdmin
          .from('support_messages')
          .select('id')
          .eq('email_message_id', messageId)
          .maybeSingle();

        if (existingMessage) {
          console.log('[webhook-resend] Message already exists, skipping:', messageId);
          return NextResponse.json({ 
            success: true,
            message: 'Message already processed',
            messageId 
          });
        }
      }

      // Enregistrer le message dans la base de données
      const messageText = textContent.trim() || (htmlContent ? htmlContent.replace(/<[^>]*>/g, '').trim() : '');
      
      if (!messageText) {
        console.warn('[webhook-resend] Empty message content, skipping');
        return NextResponse.json({ 
          error: 'Empty message content' 
        }, { status: 400 });
      }

      const { data: newMessage, error: messageError } = await supabaseAdmin
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'admin', // Réponse de l'admin
          sender_id: null, // Pas d'utilisateur spécifique pour les réponses par email
          sender_email: fromEmail || 'contactpadelxp@gmail.com',
          message_text: messageText,
          html_content: htmlContent || null,
          email_message_id: messageId || null,
        })
        .select('id')
        .single();

      if (messageError || !newMessage) {
        console.error('[webhook-resend] Error saving message:', messageError);
        return NextResponse.json({ 
          error: 'Error saving message',
          details: messageError 
        }, { status: 500 });
      }

      // Mettre à jour le statut de la conversation si elle était fermée
      if (conversation.status !== 'open') {
        await supabaseAdmin
          .from('support_conversations')
          .update({ status: 'open' })
          .eq('id', conversationId);
      }

      console.log('[webhook-resend] Message saved successfully:', {
        messageId: newMessage.id,
        conversationId,
      });

      return NextResponse.json({ 
        success: true,
        messageId: newMessage.id,
        conversationId 
      });
    }

    // Autres types d'événements (email.sent, email.delivered, etc.)
    console.log('[webhook-resend] Event type not handled:', eventType);
    return NextResponse.json({ 
      received: true,
      eventType 
    });
  } catch (error) {
    console.error('[webhook-resend] Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Error processing webhook',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Permettre les requêtes GET pour tester le webhook
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Resend webhook endpoint',
    method: 'POST',
    description: 'This endpoint receives webhooks from Resend for inbound emails (email replies)'
  });
}


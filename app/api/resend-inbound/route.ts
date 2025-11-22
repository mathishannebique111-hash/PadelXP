import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { extractReplyContent } from "@/lib/utils/email-utils";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FORWARD_TO = process.env.FORWARD_TO_EMAIL!; // contactpadelxp@gmail.com
const INBOUND_EMAIL = process.env.RESEND_INBOUND_EMAIL || 'contact@updates.padelxp.eu';

// Client Supabase admin pour enregistrer les messages dans la DB
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

export async function POST(req: NextRequest) {
  console.log("🚀🚀🚀 WEBHOOK RESEND-INBOUND CALLED 🚀🚀🚀");
  console.log("📥 Request received at:", new Date().toISOString());
  console.log("📍 URL:", req.url);
  console.log("🔗 Method:", req.method);
  
  try {
    // Vérifier les variables d'environnement
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is not configured");
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    if (!FORWARD_TO) {
      console.error("❌ FORWARD_TO_EMAIL is not configured");
      return NextResponse.json({ error: "FORWARD_TO_EMAIL not configured" }, { status: 500 });
    }

    console.log("✅ Environment variables OK");
    console.log("📧 INBOUND_EMAIL:", INBOUND_EMAIL);
    console.log("📧 FORWARD_TO:", FORWARD_TO);

    // Essayer de parser le JSON, avec fallback sur texte brut pour debug
    let event: any;
    try {
      event = await req.json();
      console.log("✅ JSON parsed successfully");
    } catch (jsonError) {
      console.error("❌ Failed to parse JSON, trying text:", jsonError);
      const rawBody = await req.text();
      console.log("📄 Raw body received:", rawBody.substring(0, 500)); // Limiter à 500 caractères
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    console.log("📨 Resend inbound event type:", event?.type);
    console.log("📨 Resend inbound event (full):", JSON.stringify(event, null, 2).substring(0, 1000)); // Limiter pour ne pas surcharger les logs

    // On ne traite que les évènements email.received
    if (event?.type !== "email.received") {
      console.log("⚠️ Ignoring event type:", event?.type);
      return NextResponse.json({ ignored: true, type: event?.type });
    }
    
    console.log("✅ Event type is email.received, processing...");

    // Les données de l'email sont directement dans le payload du webhook
    const emailData = event.data;
    if (!emailData) {
      console.error("❌ No email data in event:", event);
      return NextResponse.json({ error: "No email data" }, { status: 400 });
    }

    console.log("✅ Email data found");
    console.log("📧 Full inbound email data keys:", Object.keys(emailData));

    // Extraire les informations de l'email selon la structure du webhook Resend
    const subject = emailData.subject ?? emailData.headers?.["subject"] ?? emailData.headers?.["Subject"] ?? "(Sans sujet)";
    const from = emailData.from ?? emailData.headers?.["from"] ?? emailData.headers?.["From"] ?? emailData.sender_email ?? "Expéditeur inconnu";
    const to = emailData.to ?? emailData.headers?.["to"] ?? emailData.headers?.["To"] ?? emailData.recipient_email ?? "";
    const emailId = emailData.email_id;
    
    // Vérifier si c'est un message du club (depuis le formulaire de contact) ou un avis modéré
    const senderType = emailData.headers?.["X-Sender-Type"] ?? emailData.headers?.["x-sender-type"];
    let conversationId = emailData.headers?.["X-Conversation-ID"] ?? emailData.headers?.["x-conversation-id"];
    const clubId = emailData.headers?.["X-Club-ID"] ?? emailData.headers?.["x-club-id"];
    
    // Headers pour les avis modérés
    const reviewId = emailData.headers?.["X-Review-ID"] ?? emailData.headers?.["x-review-id"];
    const playerEmail = emailData.headers?.["X-Player-Email"] ?? emailData.headers?.["x-player-email"];
    const playerName = emailData.headers?.["X-Player-Name"] ?? emailData.headers?.["x-player-name"];
    
    // Vérifier si c'est une réponse (headers In-Reply-To ou References ou sujet avec "Re:")
    const inReplyTo = emailData.headers?.["In-Reply-To"] ?? emailData.headers?.["in-reply-to"] ?? emailData.in_reply_to;
    const references = emailData.headers?.["References"] ?? emailData.headers?.["references"] ?? emailData.references;
    const isReply = !!(inReplyTo || references || (subject && (subject.toLowerCase().includes('re:') || subject.toLowerCase().includes('ré:'))));
    
    // Vérifier si l'email vient de l'inbound email (admin répond depuis Gmail)
    const isFromInbound = to && (to.includes(INBOUND_EMAIL) || to.includes('contact@updates.padelxp.eu'));
    
    console.log("📧 Email metadata:", {
      senderType,
      conversationId,
      clubId,
      from,
      to,
      subject,
      inReplyTo,
      references,
      isReply,
      isFromInbound: isFromInbound
    });

    // Si on a un email_id, récupérer le contenu via l'API Resend
    let text = "";
    let html = "";
    
    if (emailId) {
      try {
        console.log("Fetching email content for email_id:", emailId);
        // Utiliser l'API Resend pour récupérer le contenu complet de l'email inbound
        // Note: TypeScript ne reconnaît pas encore cette méthode, mais elle existe dans le SDK
        const resendEmails = resend.emails as any;
        const { data: emailContent, error: emailError } = await resendEmails.receiving?.get(emailId) ?? { data: null, error: null };
        
        if (emailError) {
          console.error("Error fetching email content via Resend API:", emailError);
        } else if (emailContent) {
          console.log("Email content fetched:", JSON.stringify(emailContent, null, 2));
          
          // Extraire le contenu selon la structure de la réponse API Resend
          text = emailContent.text ?? "";
          html = emailContent.html ?? "";
        } else {
          // Fallback: essayer avec une requête HTTP directe
          console.log("Trying direct HTTP request to Resend API...");
          const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const emailContent = await response.json();
            console.log("Email content fetched via HTTP:", JSON.stringify(emailContent, null, 2));
            text = emailContent.text ?? emailContent.text_body ?? "";
            html = emailContent.html ?? emailContent.html_body ?? "";
          } else {
            console.error("Failed to fetch email content via HTTP:", response.status, response.statusText);
            const errorText = await response.text();
            console.error("Error response:", errorText);
          }
        }
      } catch (fetchError: any) {
        console.error("Error fetching email content via API:", fetchError);
      }
    }
    
    // Si le contenu n'a pas été récupéré via l'API, essayer dans le payload direct (fallback)
    if (!text && !html) {
      text = emailData.text ?? emailData.text_body ?? emailData.body_text ?? emailData.plain_text ?? "";
      html = emailData.html ?? emailData.html_body ?? emailData.body_html ?? emailData.body ?? "";
    }
    
    console.log("Extracted email content:", {
      subject,
      from,
      to,
      emailId,
      hasText: !!text,
      hasHtml: !!html,
      textLength: text.length,
      htmlLength: html.length
    });

    // Construire le HTML à envoyer
    let emailHtml: string;
    if (html && html.trim()) {
      // Si on a du HTML, l'utiliser directement
      emailHtml = `
        <div style="font-family:system-ui,sans-serif;line-height:1.5;max-width:800px;margin:0 auto;padding:20px;">
          <p>Tu as reçu un <strong>nouveau message</strong> pour PadelXP.</p>
          <p><strong>De :</strong> ${from}</p>
          <p><strong>À :</strong> ${to || "(non spécifié)"}</p>
          <p><strong>Objet original :</strong> ${subject}</p>
          <hr style="margin:20px 0;border:none;border-top:1px solid #ddd" />
          <div style="margin-top:20px">
            ${html}
          </div>
        </div>
      `;
    } else if (text && text.trim()) {
      // Sinon, utiliser le texte en le formatant
      emailHtml = `
        <div style="font-family:system-ui,sans-serif;line-height:1.5;max-width:800px;margin:0 auto;padding:20px;">
          <p>Tu as reçu un <strong>nouveau message</strong> pour PadelXP.</p>
          <p><strong>De :</strong> ${from}</p>
          <p><strong>À :</strong> ${to || "(non spécifié)"}</p>
          <p><strong>Objet original :</strong> ${subject}</p>
          <hr style="margin:20px 0;border:none;border-top:1px solid #ddd" />
          <div style="margin-top:20px;white-space:pre-wrap;font-family:monospace;background:#f5f5f5;padding:15px;border-radius:5px;">
            ${text.replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
    } else {
      // Si aucun contenu, afficher un message d'erreur
      console.error("No email content found in:", emailData);
      emailHtml = `
        <div style="font-family:system-ui,sans-serif;line-height:1.5;max-width:800px;margin:0 auto;padding:20px;">
          <p>Tu as reçu un <strong>nouveau message</strong> pour PadelXP.</p>
          <p><strong>De :</strong> ${from}</p>
          <p><strong>À :</strong> ${to || "(non spécifié)"}</p>
          <p><strong>Objet original :</strong> ${subject}</p>
          <hr style="margin:20px 0;border:none;border-top:1px solid #ddd" />
          <p style="color:#999;font-style:italic;">Le contenu de l'email n'a pas pu être récupéré. Veuillez vérifier les logs du serveur.</p>
          <pre style="background:#f5f5f5;padding:15px;border-radius:5px;overflow:auto;max-height:400px;">${JSON.stringify(emailData, null, 2)}</pre>
        </div>
      `;
    }

    // Détecter si c'est une réponse à un avis modéré
    // Chercher le reviewId dans le sujet ou les headers
    let detectedReviewId = reviewId;
    let detectedPlayerEmail = playerEmail;
    let detectedPlayerName = playerName;
    
    // Priorité 1: Chercher dans les headers
    if (!detectedReviewId && subject) {
      // Chercher le reviewId dans le sujet : format "[reviewId]"
      const reviewIdMatch = subject.match(/\[([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]/);
      if (reviewIdMatch && reviewIdMatch[1]) {
        detectedReviewId = reviewIdMatch[1];
        console.log("✅ Found review ID in subject:", detectedReviewId);
      }
    }
    
    // Priorité 2: Si le sujet contient "Avis modéré", essayer d'extraire l'ID même sans crochets
    if (!detectedReviewId && subject && subject.toLowerCase().includes('avis modéré')) {
      // Chercher un UUID dans le sujet même sans crochets
      const uuidPattern = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/i;
      const uuidMatch = subject.match(uuidPattern);
      if (uuidMatch && uuidMatch[1]) {
        detectedReviewId = uuidMatch[1];
        console.log("✅ Found review ID in subject (without brackets):", detectedReviewId);
      }
    }
    
    // Vérifier dans la base de données si on a un reviewId mais pas les autres infos
    if (detectedReviewId && (!detectedPlayerEmail || !detectedPlayerName)) {
      try {
        const { data: reviewData } = await supabaseAdmin
          .from('reviews')
          .select('id, user_id')
          .eq('id', detectedReviewId)
          .maybeSingle();
        
        if (reviewData) {
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('display_name, email')
            .eq('id', reviewData.user_id)
            .maybeSingle();
          
          if (profileData) {
            if (!detectedPlayerName && profileData.display_name) {
              detectedPlayerName = profileData.display_name;
            }
            if (!detectedPlayerEmail && profileData.email) {
              detectedPlayerEmail = profileData.email;
            }
            // Si pas d'email dans le profil, récupérer depuis auth.users
            if (!detectedPlayerEmail) {
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(reviewData.user_id);
              if (authUser?.user?.email) {
                detectedPlayerEmail = authUser.user.email;
              }
            }
            console.log("✅ Retrieved player info from database:", {
              reviewId: detectedReviewId,
              playerEmail: detectedPlayerEmail,
              playerName: detectedPlayerName
            });
          }
        }
      } catch (dbError) {
        console.error("❌ Error fetching review/player data:", dbError);
      }
    }
    
    // Une réponse à un avis modéré est détectée si :
    // 1. C'est une réponse (isReply = true) OU le sujet contient "Avis modéré"
    // 2. On a trouvé un reviewId (dans les headers ou le sujet)
    // Si on a un reviewId, on essaiera de récupérer l'email du joueur dans la DB si nécessaire
    const isModeratedReviewReply = detectedReviewId && (
      isReply || 
      (subject && subject.toLowerCase().includes('avis modéré'))
    ) && (
      senderType === 'moderated-review' || 
      detectedReviewId // Si on a un reviewId, on peut chercher l'email du joueur
    );
    
    // Déterminer si c'est une réponse de l'admin ou un nouveau message du club
    // Si senderType est 'club', c'est un nouveau message du club
    // Si senderType est 'moderated-review' et que c'est une réponse, c'est une réponse à un avis modéré
    // Sinon, si c'est une réponse (In-Reply-To, References, ou sujet avec "Re:"), c'est une réponse de l'admin
    // ET que l'email est destiné à l'inbound email (admin répond depuis Gmail)
    const isAdminReply = isReply && (!senderType || (senderType !== 'club' && senderType !== 'moderated-review'));
    
    console.log("🔍 Detecting reply type:", {
      isReply,
      senderType,
      isAdminReply,
      isModeratedReviewReply,
      reviewId: detectedReviewId,
      reviewIdFromHeaders: reviewId,
      playerEmail: detectedPlayerEmail,
      playerEmailFromHeaders: playerEmail,
      playerName: detectedPlayerName,
      isFromInbound,
      from,
      to,
      subject
    });
    
    // Extraire le conversationId depuis les headers, le sujet, ou les références
    // Vérifier d'abord si c'est une conversation d'avis modéré
    let detectedConversationId = conversationId;
    
    // Si pas de conversationId dans les headers, chercher dans le sujet
    // Gmail peut modifier le sujet quand on répond, donc on cherche aussi sans les crochets
    if (!detectedConversationId) {
      console.log("🔍 No conversationId in headers, searching in subject:", subject);
      
      // Chercher d'abord un UUID complet dans le sujet (avec ou sans crochets)
      let subjectMatch = subject.match(/\[([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]/);
      if (!subjectMatch) {
        // Chercher aussi sans crochets (au cas où Gmail les aurait supprimés)
        subjectMatch = subject.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
      }
      
      if (subjectMatch && subjectMatch[1]) {
        detectedConversationId = subjectMatch[1];
        console.log("✅ Found full conversation ID in subject:", detectedConversationId);
      } else {
        // Fallback: chercher les 8 premiers caractères et trouver la conversation correspondante
        subjectMatch = subject.match(/\[([0-9a-fA-F]{8})\]/);
        if (!subjectMatch) {
          // Chercher aussi sans crochets
          subjectMatch = subject.match(/([0-9a-fA-F]{8})/);
        }
        
        if (subjectMatch && subjectMatch[1]) {
          const prefix = subjectMatch[1];
          console.log("🔍 Found conversation ID prefix in subject, searching in database:", prefix);
          
          // Chercher d'abord dans review_conversations
          const { data: reviewConversations } = await supabaseAdmin
            .from('review_conversations')
            .select('id')
            .like('id', `${prefix}%`)
            .limit(1);
          
          if (reviewConversations && reviewConversations.length > 0) {
            detectedConversationId = reviewConversations[0].id;
            console.log("✅ Found review conversation with prefix:", detectedConversationId);
          } else {
            // Sinon chercher dans support_conversations
            const { data: conversations } = await supabaseAdmin
              .from('support_conversations')
              .select('id')
              .like('id', `${prefix}%`)
              .limit(1);
            
            if (conversations && conversations.length > 0) {
              detectedConversationId = conversations[0].id;
              console.log("✅ Found support conversation with prefix:", detectedConversationId);
            } else {
              console.log("⚠️ No conversation found with prefix:", prefix);
            }
          }
        } else {
          console.log("⚠️ No conversation ID pattern found in subject");
        }
      }
    }
    
    // Vérifier si c'est une conversation d'avis modéré (via conversationId dans review_conversations)
    // Cette vérification doit se faire APRÈS l'extraction du conversationId du sujet
    let isReviewConversation = false;
    let reviewConversationId: string | null = null;
    let reviewConversationData: any = null;
    
    if (detectedConversationId) {
      console.log("🔍 Checking if conversation is a review conversation:", detectedConversationId);
      const { data: reviewConv } = await supabaseAdmin
        .from('review_conversations')
        .select('id, review_id, user_id, user_email, user_name')
        .eq('id', detectedConversationId)
        .maybeSingle();
      
      if (reviewConv) {
        isReviewConversation = true;
        reviewConversationId = reviewConv.id;
        reviewConversationData = reviewConv;
        detectedReviewId = reviewConv.review_id;
        if (!detectedPlayerEmail) detectedPlayerEmail = reviewConv.user_email;
        if (!detectedPlayerName) detectedPlayerName = reviewConv.user_name;
        console.log("✅✅✅ Found review conversation:", {
          conversationId: reviewConversationId,
          reviewId: reviewConv.review_id,
          playerEmail: reviewConv.user_email,
          playerName: reviewConv.user_name
        });
      } else {
        console.log("ℹ️ Conversation is not a review conversation (checking support_conversations)");
      }
    } else {
      console.log("⚠️ No conversationId detected yet, cannot check for review conversation");
    }
    
    // Si c'est une réponse de l'admin à une conversation d'avis modéré, enregistrer dans la DB et envoyer au joueur
    console.log("🔍 Checking if this is a review conversation reply:", {
      isReply,
      isReviewConversation,
      reviewConversationId,
      hasReviewConversationData: !!reviewConversationData,
      detectedConversationId,
      subject,
      from,
      to
    });
    
    if (isReply && isReviewConversation && reviewConversationId && reviewConversationData) {
      console.log("✅✅✅ Detected admin reply to review conversation, processing...", {
        conversationId: reviewConversationId,
        reviewId: reviewConversationData.review_id,
        playerEmail: reviewConversationData.user_email,
        playerName: reviewConversationData.user_name,
        from,
        subject,
        isReply,
        textLength: text?.length || 0,
        htmlLength: html?.length || 0,
      });
      
      // Vérifier si ce message n'a pas déjà été reçu (éviter les doublons)
      const messageId = emailId || `reply-${Date.now()}`;
      const { data: existingMessage } = await supabaseAdmin
        .from('review_messages')
        .select('id')
        .eq('email_message_id', messageId)
        .maybeSingle();

      if (existingMessage) {
        console.log("Review reply message already exists, skipping:", messageId);
        return NextResponse.json({ ok: true, forwarded: false, saved: true, type: 'review-reply-duplicate' });
      }
      
      // Extraire uniquement le contenu de la réponse, sans les citations
      const messageText = extractReplyContent(text, html);
      
      console.log("📝 Extracted reply content:", {
        messageTextLength: messageText?.length || 0,
        messageTextPreview: messageText?.substring(0, 200) || 'empty',
        textLength: text?.length || 0,
        htmlLength: html?.length || 0,
      });
      
      if (messageText && messageText.trim()) {
        // Enregistrer la réponse dans la DB
        console.log("💾 Saving admin reply to review_messages...");
        const { error: messageError } = await supabaseAdmin
          .from('review_messages')
          .insert({
            conversation_id: reviewConversationId,
            sender_type: 'admin',
            sender_email: from,
            message_text: messageText,
            html_content: html || messageText.replace(/\n/g, '<br>'),
            email_message_id: messageId,
            created_at: new Date().toISOString()
          });

        if (messageError) {
          console.error("❌ Error saving admin reply to review conversation:", {
            error: messageError,
            conversationId: reviewConversationId,
            messageId: messageId
          });
        } else {
          // Mettre à jour last_message_at de la conversation
          await supabaseAdmin
            .from('review_conversations')
            .update({ 
              last_message_at: new Date().toISOString(),
              status: 'open'
            })
            .eq('id', reviewConversationId);
          
          console.log("✅ Admin reply saved successfully to review conversation:", reviewConversationId);
        }
        
        // Envoyer la réponse directement au joueur
        console.log("📧 Preparing to send email to player:", {
          to: reviewConversationData.user_email,
          from: process.env.RESEND_FROM_EMAIL || "PadelXP <noreply@padelleague.com>",
          conversationId: reviewConversationId,
          messageTextLength: messageText.length
        });
        
        try {
          const { error: sendError, data: sendData } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "PadelXP <noreply@padelleague.com>",
            to: reviewConversationData.user_email,
            subject: `Re: Votre avis sur PadelXP`,
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
                    .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066FF; white-space: pre-wrap; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>📧 Réponse à votre avis</h1>
                    </div>
                    <div class="content">
                      <p>Bonjour ${reviewConversationData.user_name || 'Joueur'},</p>
                      <p>Vous avez reçu une réponse concernant votre avis sur PadelXP.</p>
                      <div class="message-box">
                        ${messageText.replace(/\n/g, '<br>')}
                      </div>
                      <p style="margin-top: 30px; font-size: 12px; color: #666;">
                        Cet email a été envoyé en réponse à votre avis sur PadelXP.<br>
                        Si vous avez des questions, vous pouvez répondre directement à cet email.
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `,
            replyTo: INBOUND_EMAIL,
            headers: {
              'X-Conversation-ID': reviewConversationId,
              'X-Review-ID': reviewConversationData.review_id,
              'X-Player-Email': reviewConversationData.user_email,
              'X-Sender-Type': 'admin-reply-to-review',
            },
          });
          
          if (sendError) {
            console.error("❌ Error sending reply to player:", sendError);
          } else {
            console.log("✅ Reply sent successfully to player:", {
              conversationId: reviewConversationId,
              playerEmail: reviewConversationData.user_email,
              emailId: sendData?.id,
            });
          }
        } catch (emailError: any) {
          console.error("❌ Error sending email to player:", emailError);
        }
        
        // Ne pas continuer avec le traitement standard pour les réponses aux avis modérés
        return NextResponse.json({ 
          ok: true, 
          forwarded: true, 
          type: 'review-reply',
          conversationId: reviewConversationId,
          playerEmail: reviewConversationData.user_email
        });
      } else {
        console.warn("Review reply has no content, skipping database save and email");
        return NextResponse.json({ ok: true, forwarded: false, type: 'review-reply-empty' });
      }
    }
    
    // Si toujours pas de conversationId et que c'est une réponse, chercher dans les headers References
    if (!detectedConversationId && isAdminReply && references) {
      // Les références peuvent contenir l'ID du message précédent qui peut nous aider
      console.log("No conversation ID found yet, checking references:", references);
    }
    
    // Si c'est une réponse de l'admin (pour support club), enregistrer dans la DB
    if (isAdminReply && detectedConversationId && !isReviewConversation) {
      console.log("✅ Detected admin reply, saving to database:", {
        conversationId: detectedConversationId,
        from,
        subject,
        isReply,
        isAdminReply,
        senderType
      });
      
      // Vérifier que la conversation existe
      const { data: conversation, error: convError } = await supabaseAdmin
        .from('support_conversations')
        .select('id, club_id, status')
        .eq('id', detectedConversationId)
        .maybeSingle();

      if (convError || !conversation) {
        console.error("Conversation not found for reply:", detectedConversationId, convError);
      } else {
        // Vérifier si ce message n'a pas déjà été reçu (éviter les doublons)
        const messageId = emailId || `reply-${Date.now()}`;
        const { data: existingMessage } = await supabaseAdmin
          .from('support_messages')
          .select('id')
          .eq('email_message_id', messageId)
          .maybeSingle();

        if (existingMessage) {
          console.log("Reply message already exists, skipping:", messageId);
        } else {
          // Extraire uniquement le contenu de la réponse, sans les citations
          const messageText = extractReplyContent(text, html);
          
          if (messageText) {
            // Enregistrer la réponse dans la DB
            const { error: messageError } = await supabaseAdmin
              .from('support_messages')
              .insert({
                conversation_id: detectedConversationId,
                sender_type: 'admin',
                sender_email: from,
                message_text: messageText,
                email_message_id: messageId,
                created_at: new Date().toISOString()
              });

            if (messageError) {
              console.error("❌ Error saving admin reply to database:", messageError);
            } else {
              // Mettre à jour last_message_at de la conversation
              await supabaseAdmin
                .from('support_conversations')
                .update({ 
                  last_message_at: new Date().toISOString(),
                  status: 'open'
                })
                .eq('id', detectedConversationId);
              
              console.log("✅ Admin reply saved successfully to conversation:", detectedConversationId);
            }
          } else {
            console.warn("Admin reply has no content, skipping database save");
          }
        }
      }
    }
    
    // Si c'est un message du club ou un avis modéré, transférer vers Gmail pour notifier l'admin
    // Si c'est une réponse de l'admin, on ne transfère PAS vers Gmail (déjà traitée ci-dessus)
    
    if (senderType === 'club' || senderType === 'moderated-review' || (!isAdminReply && !isReply)) {
      // Transférer les messages du club et les avis modérés vers Gmail
      const forwardHeaders: Record<string, string> = {
        'X-Conversation-ID': detectedConversationId || conversationId || '',
        'X-Club-ID': clubId || '',
        'X-Review-ID': detectedReviewId || reviewId || '',
        'X-Player-Email': playerEmail || '',
        'X-Player-Name': playerName || '',
        'X-Original-From': from,
      };
      
      // Supprimer les headers vides
      Object.keys(forwardHeaders).forEach(key => {
        if (!forwardHeaders[key]) delete forwardHeaders[key];
      });

      const { error: sendError, data: forwardData } = await resend.emails.send({
        // CRITIQUE: Le from DOIT être l'inbound email (contact@updates.padelxp.eu) 
        // pour que quand Gmail répond, la réponse aille directement à cette adresse
        // et soit capturée par le webhook resend-inbound
        from: `PadelXP Support <${INBOUND_EMAIL || 'contact@updates.padelxp.eu'}>`,
        to: [FORWARD_TO],
        subject: `📩 Nouveau message de ${from} : ${subject}`,
        html: emailHtml,
        // Le replyTo est aussi l'inbound email pour double sécurité
        replyTo: INBOUND_EMAIL || 'contact@updates.padelxp.eu',
        headers: Object.keys(forwardHeaders).length > 0 ? forwardHeaders : undefined,
      });
      
      console.log("📧 Email forwarded to Gmail with correct from/replyTo:", {
        from: INBOUND_EMAIL || 'contact@updates.padelxp.eu',
        replyTo: INBOUND_EMAIL || 'contact@updates.padelxp.eu',
        to: FORWARD_TO,
        conversationId: detectedConversationId || conversationId
      });

      if (sendError) {
        console.error("Error forwarding to Gmail:", sendError);
        return NextResponse.json({ error: "forward_failed" }, { status: 500 });
      }

      console.log("Email forwarded successfully:", {
        to: FORWARD_TO,
        conversationId: detectedConversationId || conversationId,
        messageId: forwardData?.id
      });

      return NextResponse.json({ ok: true, forwarded: true });
    } else {
      // C'est une réponse de l'admin, déjà enregistrée dans la DB, ne pas transférer vers Gmail
      console.log("Admin reply processed and saved to database, not forwarding to Gmail");
      return NextResponse.json({ ok: true, forwarded: false, saved: true });
    }
  } catch (error: any) {
    console.error("❌❌❌ UNEXPECTED ERROR IN RESEND-INBOUND WEBHOOK ❌❌❌");
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      fullError: JSON.stringify(error, null, 2)
    });
    return NextResponse.json(
      { error: "Internal server error", message: error?.message },
      { status: 500 }
    );
  } finally {
    console.log("🏁 WEBHOOK RESEND-INBOUND FINISHED 🏁");
  }
}

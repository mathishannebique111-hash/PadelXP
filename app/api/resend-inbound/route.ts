import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Initialisation conditionnelle de Resend
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FORWARD_TO = process.env.FORWARD_TO_EMAIL!;
const INBOUND_EMAIL =
  process.env.RESEND_INBOUND_EMAIL || "contact@updates.padelxp.eu";

// Client Supabase admin pour enregistrer les messages dans la DB
// ⚠️ Créé de façon défensive pour éviter les erreurs au chargement du module
const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
      )
    : null;

export async function POST(req: NextRequest) {
  console.log("[resend-inbound] Webhook called");
  
  try {
    // Vérifier les variables d'environnement
    if (!process.env.RESEND_API_KEY || !resend) {
      console.error("[resend-inbound] RESEND_API_KEY is not configured");
      return NextResponse.json(
        { error: "RESEND_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!FORWARD_TO) {
      console.error("[resend-inbound] FORWARD_TO_EMAIL is not configured");
      return NextResponse.json(
        { error: "FORWARD_TO_EMAIL not configured" },
        { status: 500 }
      );
    }

    console.log("[resend-inbound] Environment OK", {
      inboundEmailConfigured: !!INBOUND_EMAIL,
      hasForwardTo: !!FORWARD_TO,
    });

    // Essayer de parser le JSON
    let event: any | null = null;
    try {
      event = await req.json();
      console.log("[resend-inbound] JSON payload parsed successfully");
    } catch (jsonError) {
      console.error("[resend-inbound] Failed to parse JSON payload", {
        message: (jsonError as any)?.message,
        name: (jsonError as any)?.name,
      });
      // Ne pas logger le corps brut pour éviter de stocker du contenu d'email
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const eventType = event?.type;
    console.log("[resend-inbound] Inbound event received", { eventType });

    // On ne traite que les évènements email.received
    if (eventType !== "email.received") {
      console.log("[resend-inbound] Ignoring non-email event", { eventType });
      return NextResponse.json({ ignored: true, type: eventType });
    }

    console.log("[resend-inbound] Processing email.received event");

    const emailData = event.data;
    if (!emailData) {
      console.error("[resend-inbound] No email data in event");
      return NextResponse.json({ error: "No email data" }, { status: 400 });
    }

    console.log("[resend-inbound] Email data found", {
      keys: Object.keys(emailData || {}),
    });

    const subject =
      emailData.subject ??
      emailData.headers?.["subject"] ??
      emailData.headers?.["Subject"] ??
      "(Sans sujet)";
    const from =
      emailData.from ??
      emailData.headers?.["from"] ??
      emailData.headers?.["From"] ??
      emailData.sender_email ??
      "Expéditeur inconnu";
    const to =
      emailData.to ??
      emailData.headers?.["to"] ??
      emailData.headers?.["To"] ??
      emailData.recipient_email ??
      "";
    const emailId = emailData.email_id;
    
  const senderType =
    emailData.headers?.["X-Sender-Type"] ??
    emailData.headers?.["x-sender-type"];
  let conversationId =
    emailData.headers?.["X-Conversation-ID"] ??
    emailData.headers?.["x-conversation-id"];
    const clubId =
      emailData.headers?.["X-Club-ID"] ?? emailData.headers?.["x-club-id"];

    let reviewId =
      emailData.headers?.["X-Review-ID"] ??
      emailData.headers?.["x-review-id"];
    const playerEmail =
      emailData.headers?.["X-Player-Email"] ??
      emailData.headers?.["x-player-email"];
    const playerName =
      emailData.headers?.["X-Player-Name"] ??
      emailData.headers?.["x-player-name"];

    const inReplyTo =
      emailData.headers?.["In-Reply-To"] ??
      emailData.headers?.["in-reply-to"] ??
      emailData.in_reply_to;
    const references =
      emailData.headers?.["References"] ??
      emailData.headers?.["references"] ??
      emailData.references;
  const isReply = !!(
      inReplyTo ||
      references ||
      (subject &&
        (subject.toLowerCase().includes("re:") ||
          subject.toLowerCase().includes("ré:")))
    );

  const isFromInbound =
      to &&
      (to.includes(INBOUND_EMAIL) || to.includes("contact@updates.padelxp.eu"));

  // Détecter si c'est un avis modéré via le sujet
  const isModeratedReview = typeof subject === "string" && 
    (subject.toLowerCase().includes("avis modéré") || subject.includes("⚠️"));

  // Si aucun conversationId explicite dans les headers, essayer de l'extraire du sujet
  if (!conversationId && typeof subject === "string") {
    console.log(
      "[resend-inbound] Trying to extract conversationId from subject",
      {
        subjectFull:
          subject.length > 120 ? subject.substring(0, 120) + "…" : subject,
        isModeratedReview,
      }
    );
    // 1) Essayer de trouver un UUID complet entre crochets
    let match = subject.match(/\[([0-9a-fA-F-]{36})\]/);

    // 2) Si pas trouvé, prendre simplement le contenu des premiers crochets
    if (!match) {
      const genericMatch = subject.match(/\[([^\]]+)\]/);
      if (genericMatch && genericMatch[1]) {
        match = genericMatch as RegExpMatchArray;
      }
    }

    console.log("[resend-inbound] Subject regex match result", {
      hasMatch: !!match,
      extractedPreview: match && match[1] ? match[1].substring(0, 40) + "…" : null,
    });

    if (match && match[1]) {
      const extractedId = match[1];
      
      // Si c'est un avis modéré et qu'on n'a pas de reviewId dans les headers,
      // l'ID extrait peut être soit conversationId soit reviewId
      // On va d'abord essayer comme reviewId si c'est un avis modéré
      if (isModeratedReview && !reviewId) {
        reviewId = extractedId;
        console.log("[resend-inbound] Review ID extracted from subject (moderated review)", {
          hasReviewId: true,
        });
    } else {
        conversationId = extractedId;
        console.log("[resend-inbound] Conversation ID extracted from subject", {
          hasConversationId: true,
        });
      }
    }
  }

    // Normaliser les champs potentiellement non-string pour éviter les erreurs de substring
    const fromStr = typeof from === "string" ? from : "";
    const toStr = typeof to === "string" ? to : "";

    console.log("[resend-inbound] Email metadata (anonymized)", {
      senderType,
      hasConversationId: !!conversationId,
      hasClubId: !!clubId,
      hasReviewId: !!reviewId,
      hasPlayerEmail: !!playerEmail,
      hasPlayerName: !!playerName,
      isReply,
      isFromInbound,
      hasEmailId: !!emailId,
      // On tronque les champs potentiellement sensibles
      subjectPreview: subject ? subject.substring(0, 30) : null,
      fromPreview: fromStr ? fromStr.substring(0, 8) + "…" : null,
      toPreview: toStr ? toStr.substring(0, 8) + "…" : null,
    });

  // Récupérer le contenu de l'email (texte + HTML) de manière défensive
  let rawText: string =
    emailData.text ??
    emailData.text_body ??
    emailData.textBody ??
    "";
  let rawHtml: string | undefined =
    emailData.html ??
    emailData.html_body ??
    emailData.htmlBody ??
    undefined;

  // Si le corps n'est pas présent dans le payload, essayer de le récupérer
  // via l'API Resend Received Emails en utilisant emailId.
  // Note: Utilisation de l'API REST directement car le SDK peut ne pas exposer receiving.get()
  console.log("[resend-inbound] Checking if we need to fetch email body", {
    hasRawText: !!rawText && rawText.length > 0,
    hasRawHtml: !!rawHtml && rawHtml.length > 0,
    hasEmailId: !!emailId,
    hasResend: !!resend,
    willFetch: !rawText && !rawHtml && emailId && resend,
  });

  if (!rawText && !rawHtml && emailId && resend) {
    console.log("[resend-inbound] Attempting to fetch email body from Resend API", {
      emailId,
    });
    
    // Fonction helper pour récupérer le contenu avec retry (le contenu peut ne pas être immédiatement disponible)
    const fetchEmailContent = async (retries = 3, delayMs = 1500): Promise<{ text?: string; html?: string } | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Essayer d'abord avec le SDK si la méthode receiving existe
          const resendAny = resend as any;
          const hasReceivingGet = !!resendAny.emails?.receiving?.get;
          
          if (hasReceivingGet) {
            console.log(`[resend-inbound] Attempt ${attempt}/${retries}: Trying SDK receiving.get()`, {
              emailId,
            });
            const fetched = await resendAny.emails.receiving.get(emailId);
            console.log("[resend-inbound] SDK receiving.get() response structure", {
              hasFetched: !!fetched,
              hasData: !!fetched?.data,
              fetchedKeys: fetched ? Object.keys(fetched) : [],
              dataKeys: fetched?.data ? Object.keys(fetched.data) : [],
            });
            
            // Le SDK peut retourner { data: { html, text } } ou directement { html, text }
            const emailData = fetched?.data || fetched;
            if (emailData) {
              const hasText = emailData.text && typeof emailData.text === "string" && emailData.text.length > 0;
              const hasHtml = emailData.html && typeof emailData.html === "string" && emailData.html.length > 0;
              
              if (hasText || hasHtml) {
                console.log("[resend-inbound] Successfully fetched email body via SDK", {
                  hasText,
                  hasHtml,
                  textLength: emailData.text?.length || 0,
                  htmlLength: emailData.html?.length || 0,
                });
                return {
                  text: hasText ? emailData.text : undefined,
                  html: hasHtml ? emailData.html : undefined,
                };
              } else {
                console.log(`[resend-inbound] Attempt ${attempt}: Email body empty, will retry...`);
              }
            }
          }
          
          // Si le SDK ne fonctionne pas ou n'a pas de contenu, essayer l'API REST
          if (resendApiKey) {
            const endpoints = [
              `https://api.resend.com/emails/receiving/${emailId}`,
              `https://api.resend.com/receiving/emails/${emailId}`,
            ];

            for (const endpoint of endpoints) {
              try {
                console.log(`[resend-inbound] Attempt ${attempt}: Trying REST endpoint`, { endpoint });
                const response = await fetch(endpoint, {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json",
                  },
                });

                if (response.ok) {
                  const fetched = await response.json();
                  const emailData = fetched?.data || fetched;
                  
                  const hasText = emailData?.text && typeof emailData.text === "string" && emailData.text.length > 0;
                  const hasHtml = emailData?.html && typeof emailData.html === "string" && emailData.html.length > 0;
                  
                  if (hasText || hasHtml) {
                    console.log("[resend-inbound] Successfully fetched email body via REST API", {
                      endpoint,
                      hasText,
                      hasHtml,
                      textLength: emailData.text?.length || 0,
                      htmlLength: emailData.html?.length || 0,
                    });
                    return {
                      text: hasText ? emailData.text : undefined,
                      html: hasHtml ? emailData.html : undefined,
                    };
                  }
                } else if (response.status !== 404) {
                  const errorText = await response.text().catch(() => "");
                  console.log("[resend-inbound] Endpoint returned error", {
                    endpoint,
                    status: response.status,
                    errorPreview: errorText.substring(0, 100),
                  });
                }
              } catch (fetchError: any) {
                console.log("[resend-inbound] Error trying endpoint", {
                  endpoint,
                  error: fetchError?.message,
                });
              }
            }
          }
          
          // Si on n'a pas réussi et qu'il reste des tentatives, attendre avant de réessayer
          if (attempt < retries) {
            console.log(`[resend-inbound] Waiting ${delayMs}ms before retry ${attempt + 1}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (e: any) {
          console.error(`[resend-inbound] Error in attempt ${attempt}`, {
            message: e?.message,
            name: e?.name,
          });
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      return null;
    };
    
    try {
      const content = await fetchEmailContent(3, 1500);
      if (content) {
        if (content.text) {
          rawText = content.text;
        }
        if (content.html) {
          rawHtml = content.html;
        }
      } else {
        console.error("[resend-inbound] Failed to fetch email body after all retries", {
          emailId,
        });
      }
    } catch (e: any) {
      console.error(
        "[resend-inbound] Failed to fetch email body from Resend API",
        {
          message: e?.message,
          name: e?.name,
        }
      );
    }
  }

  // Construire un texte brut correct même si l'email est uniquement HTML
  let baseText = (rawText || "").trim();
  if (!baseText && rawHtml) {
    // Remplacer les <br> par des retours à la ligne puis enlever les balises
    baseText = rawHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .trim();
  }

  const replyText = baseText;

    // Préparer un petit résumé anonymisé pour les logs
    const replyPreview =
      replyText.length > 0
        ? replyText.substring(0, 30).replace(/\s+/g, " ")
        : null;

  console.log("[resend-inbound] Parsed reply content (anonymized)", {
      hasReplyText: replyText.length > 0,
      replyPreview,
      rawTextLength: rawText?.length || 0,
      rawHtmlLength: rawHtml?.length || 0,
      baseTextLength: baseText.length,
    });
  // --------- CAS 1 : Réponse d'admin dans une conversation de support ---------
  // - Identifiée par la présence de conversationId ET le fait que ce soit une réponse (isReply === true)
  // - ET que ce ne soit PAS un email d'avis modéré (isModeratedReview === false)
  // - L'admin répond depuis Gmail, l'email arrive sur l'inbound
  // - On enregistre le message dans support_messages, mais on NE le renvoie PAS vers Gmail
  if (conversationId && isReply && !isModeratedReview && supabaseAdmin) {
      // Éviter les doublons si emailId déjà traité
      if (emailId) {
        const { data: existingMessage, error: existingError } = await supabaseAdmin
          .from("support_messages")
          .select("id")
          .eq("email_message_id", emailId)
          .maybeSingle();

        if (existingError) {
          console.error(
            "[resend-inbound] Error checking existing support message",
            {
              code: existingError.code,
            }
          );
        }

        if (existingMessage) {
          console.log(
            "[resend-inbound] Support message already stored for this emailId"
          );
          return NextResponse.json({ success: true, deduplicated: true });
        }
      }

      const safeConversationId =
        typeof conversationId === "string"
          ? conversationId
          : Array.isArray(conversationId)
          ? conversationId[0]
          : String(conversationId);

      const senderEmailPreview = from ? from.substring(0, 8) + "…" : null;

      const messageTextToStore =
        replyText ||
        (rawText ? rawText.substring(0, 2000) : "(message vide)");

      if (!supabaseAdmin) {
        console.error("[resend-inbound] supabaseAdmin is null, cannot store support message");
        return NextResponse.json(
          { error: "Database client not available" },
          { status: 500 }
        );
      }

      const { error: insertError } = await supabaseAdmin
        .from("support_messages")
        .insert({
          conversation_id: safeConversationId,
          sender_type: "admin",
          sender_id: null,
          sender_email: from || "unknown",
          message_text: messageTextToStore,
          html_content:
            rawHtml && rawHtml.length > 0
              ? rawHtml.substring(0, 4000)
              : null,
          email_message_id: emailId || null,
        });

      if (insertError) {
        console.error("[resend-inbound] Error inserting support message", {
          code: insertError.code,
        });
        return NextResponse.json(
          { error: "Failed to store support message" },
          { status: 500 }
        );
      }

      console.log("[resend-inbound] Support message stored from admin reply", {
        conversationIdPreview: safeConversationId.substring(0, 8) + "…",
        senderEmailPreview,
      });

      return NextResponse.json({ success: true, storedSupportReply: true });
    }

    // --------- CAS 2 : Avis joueur modéré (réponse admin) ---------
    // - Identifié par headers X-Review-ID et X-Player-Email
    // - L'admin répond à l'email de modération, sa réponse doit être envoyée au joueur
    if (reviewId && playerEmail && replyText.length > 0) {
      const subjectForPlayer =
        subject && subject.toLowerCase().includes("avis modéré")
          ? subject.replace(/⚠️\s*/g, "").substring(0, 120)
          : `Réponse à votre avis (${reviewId.substring(0, 8)}…)`;

      // Ne pas logger l'email complet ni le nom complet
      const playerEmailPreview = playerEmail.substring(0, 5) + "…";
      const playerNamePreview = playerName
        ? String(playerName).substring(0, 10) + "…"
        : null;

      console.log(
        "[resend-inbound] Forwarding moderated review reply to player",
        {
          reviewIdPreview: reviewId.substring(0, 8) + "…",
          playerEmailPreview,
          hasPlayerName: !!playerName,
        }
      );

      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "PadelXP <noreply@padelleague.com>",
        to: playerEmail,
        replyTo: INBOUND_EMAIL,
        subject: subjectForPlayer,
        text: replyText,
      });

      return NextResponse.json({
        success: true,
        forwardedToPlayer: true,
      });
    }

    // --------- CAS 3 : Message initial vers l'inbound (contact club ou avis) ---------
    // - Email envoyé par PadelXP vers INBOUND_EMAIL
    // - On le transfère vers FORWARD_TO (Gmail) si ce n'est pas déjà un reply
    if (!isReply && isFromInbound) {
      const subjectForForward =
        subject && subject.length > 0
          ? subject.substring(0, 200)
          : "(Sans sujet)";

      // Corps du message à envoyer à l'admin :
      // 1) On essaie d'utiliser le texte brut (replyText / baseText)
      // 2) Si c'est vide et qu'on a un reviewId, chercher dans review_messages et reconstruire le HTML
      // 3) Si c'est vide et qu'on a un conversationId, chercher dans support_messages
      // 4) Si c'est vide et qu'on a reviewId/playerName, construire un message basique
      let forwardBody = replyText;
      let forwardHtml: string | undefined = undefined;

      // Pour les avis modérés : récupérer toutes les infos et reconstruire le HTML complet
      if ((!forwardBody || forwardBody.trim().length === 0) && (reviewId || isModeratedReview) && supabaseAdmin) {
        try {
          let reviewConv: any = null;
          let actualReviewId: string | null = reviewId || null;

          // D'abord, essayer de trouver la conversation avec l'ID extrait du sujet
          // (qui peut être soit conversationId soit reviewId selon comment l'email a été envoyé)
          if (conversationId && isModeratedReview) {
            const safeConversationId =
              typeof conversationId === "string"
                ? conversationId
                : Array.isArray(conversationId)
                ? conversationId[0]
                : String(conversationId);

            // Chercher la conversation par son ID
            const { data: convById, error: convByIdError } = await supabaseAdmin
              .from("review_conversations")
              .select("id, review_id, user_name, user_email, subject")
              .eq("id", safeConversationId)
        .maybeSingle();

            if (!convByIdError && convById) {
              reviewConv = convById;
              actualReviewId = convById.review_id;
            }
          }

          // Si on n'a pas trouvé par conversationId, essayer par reviewId
          if (!reviewConv && actualReviewId) {
            const { data: convByReviewId, error: convByReviewIdError } = await supabaseAdmin
              .from("review_conversations")
              .select("id, review_id, user_name, user_email, subject")
              .eq("review_id", actualReviewId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!convByReviewIdError && convByReviewId) {
              reviewConv = convByReviewId;
            }
          }

          if (reviewConv && actualReviewId) {
            // Récupérer l'avis pour avoir rating et comment
            const { data: review, error: reviewError } = await supabaseAdmin
              .from("reviews")
              .select("rating, comment")
              .eq("id", actualReviewId)
              .maybeSingle();

            if (reviewError) {
              console.error("[resend-inbound] Error fetching review", {
                code: reviewError.code,
              });
            }

            const playerName = reviewConv.user_name || "Joueur";
            const playerEmail = reviewConv.user_email || "";
            const rating = review?.rating || 0;
            const comment = review?.comment || null;
            const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

            // Reconstruire le HTML complet avec le même design que lib/email.ts
            forwardHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Inter, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #FF6B6B, #EE5A6F); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .review-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B6B; }
                    .info-row { margin: 10px 0; }
                    .info-label { font-weight: bold; color: #666; }
                    .info-value { color: #333; }
                    .stars { color: #FFD700; font-size: 18px; }
                    .comment-box { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; font-style: italic; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>⚠️ Avis modéré détecté</h1>
                    </div>
                    <div class="content">
                      <p>Bonjour,</p>
                      <p>Un avis a été soumis avec une note faible (3 étoiles ou moins) et un texte court (6 mots ou moins). Cet avis a été automatiquement masqué du site et nécessite votre attention.</p>
                      
                      <div class="review-box">
                        <div class="info-row">
                          <span class="info-label">Joueur :</span>
                          <span class="info-value">${playerName}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Email :</span>
                          <span class="info-value">${playerEmail}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Note :</span>
                          <span class="stars">${stars}</span>
                          <span class="info-value">${rating}/5</span>
                        </div>
                        ${comment ? `
                          <div class="info-row">
                            <span class="info-label">Commentaire :</span>
                          </div>
                          <div class="comment-box">
                            "${comment}"
                          </div>
                        ` : '<div class="info-row"><span class="info-label">Commentaire :</span> <span class="info-value">Aucun commentaire</span></div>'}
                        <div class="info-row">
                          <span class="info-label">ID de l'avis :</span>
                          <span class="info-value">${actualReviewId}</span>
                        </div>
                      </div>
                      
                      <p><strong>Action recommandée :</strong></p>
                      <ul style="margin: 10px 0 0 20px;">
                        <li>Contactez le joueur pour comprendre son problème</li>
                        <li>Résolvez le problème s'il y en a un</li>
                        <li>Si l'avis est justifié, vous pouvez le laisser masqué ou le supprimer</li>
                      </ul>
                      
                      <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196F3;">
                        <p style="margin: 0; font-size: 14px; color: #1976D2;">
                          <strong>💡 Astuce :</strong> Vous pouvez répondre directement à cet email pour contacter le joueur. Votre réponse lui sera envoyée automatiquement à <strong>${playerEmail}</strong>.
                        </p>
                      </div>
                      
                      <p style="margin-top: 30px; font-size: 12px; color: #666;">
                        Cet avis n'est pas visible sur le site public tant qu'il n'a pas été modéré.
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `;

            // Extraire aussi le texte brut pour le fallback
            forwardBody = `Note: ${rating}/5\n${comment ? `Commentaire: ${comment}` : "Aucun commentaire"}\n\nJoueur: ${playerName}\nEmail: ${playerEmail}`;
          } else {
            console.log("[resend-inbound] Could not find review conversation or review data");
          }
        } catch (e: any) {
          console.error("[resend-inbound] Exception fetching review data for forward", {
            message: e?.message,
          });
        }
      }

      // Pour les messages de support : chercher dans support_messages
      if ((!forwardBody || forwardBody.trim().length === 0) && conversationId && supabaseAdmin) {
        const safeConversationId =
          typeof conversationId === "string"
            ? conversationId
            : Array.isArray(conversationId)
            ? conversationId[0]
            : String(conversationId);

        try {
          const { data: lastMessage, error: lastMessageError } = await supabaseAdmin
            .from("support_messages")
            .select("message_text")
            .eq("conversation_id", safeConversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastMessageError) {
            console.error("[resend-inbound] Error fetching last support message for forward", {
              code: lastMessageError.code,
            });
          } else if (lastMessage?.message_text) {
            forwardBody = String(lastMessage.message_text);
          }
        } catch (e: any) {
          console.error("[resend-inbound] Exception fetching last support message for forward", {
            message: e?.message,
          });
        }
      }

      // Fallback : construire un message basique pour les avis modérés si on a les infos
      if ((!forwardBody || forwardBody.trim().length === 0) && isModeratedReview) {
        // Extraire le nom du joueur depuis le sujet si on ne l'a pas dans les headers
        let extractedPlayerName = playerName;
        if (!extractedPlayerName && typeof subject === "string") {
          const nameMatch = subject.match(/⚠️\s*Avis modéré\s*-\s*([^(]+)/i);
          if (nameMatch && nameMatch[1]) {
            extractedPlayerName = nameMatch[1].trim();
          }
        }
        
        if (extractedPlayerName || reviewId) {
          forwardBody = `Avis modéré reçu${extractedPlayerName ? ` de ${extractedPlayerName}` : ""}${playerEmail ? ` (${playerEmail})` : ""}.\n\nVoir les détails dans le sujet de l'email.`;
        }
      }

      // Dernier fallback : texte brut ou message vide
      if (!forwardBody || forwardBody.trim().length === 0) {
        forwardBody =
          (rawText && rawText.trim().length > 0
            ? rawText.substring(0, 2000)
            : "") || "(message vide)";
      }

      console.log(
        "[resend-inbound] Forwarding inbound email to FORWARD_TO (admin)",
        {
          subjectPreview: subjectForForward.substring(0, 30),
          hasForwardBody: !!forwardBody && forwardBody.trim().length > 0,
          hasForwardHtml: !!forwardHtml && forwardHtml.trim().length > 0,
          hasReviewId: !!reviewId,
          hasConversationId: !!conversationId,
          isModeratedReview,
        }
      );

      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "PadelXP Support <support@updates.padelxp.eu>",
        to: FORWARD_TO,
        replyTo: INBOUND_EMAIL,
        subject: subjectForForward,
        // Corps du message : HTML si disponible (avis modérés), sinon texte brut
        html: forwardHtml || undefined,
        text: forwardBody,
      });

      return NextResponse.json({
        success: true,
        forwardedToAdmin: true,
      });
    }

    // --------- CAS 4 : Autres emails (logs minimaux, aucune action métier) ---------
    console.log(
      "[resend-inbound] Email received but no specific handler matched",
      {
        hasConversationId: !!conversationId,
        hasReviewId: !!reviewId,
        hasPlayerEmail: !!playerEmail,
        isReply,
        isFromInbound,
      }
    );

    return NextResponse.json({ success: true, handled: false });
  } catch (error: any) {
    // Important : ne jamais renvoyer 500 au webhook Resend pour éviter les retries incessants.
    // On logge l'erreur de façon anonymisée mais on renvoie un 200 au webhook.
    console.error(
      "[resend-inbound] Unexpected error in inbound webhook handler",
      {
      message: error?.message,
      name: error?.name,
      }
    );
    return NextResponse.json(
      { success: false, error: "Internal server error (logged server-side)" },
      { status: 200 }
    );
  } finally {
    console.log("[resend-inbound] Webhook finished");
  }
}



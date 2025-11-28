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
  // via l'API Resend en utilisant emailId.
  if (!rawText && !rawHtml && emailId && resend) {
    try {
      const fetched = await resend.emails.get(emailId);
      if (fetched?.data && !fetched.error) {
        if (fetched.data.text) {
          rawText = fetched.data.text;
        }
        if (!rawText && fetched.data.html) {
          rawHtml = fetched.data.html;
        }
      }
      console.log("[resend-inbound] Fetched email body from Resend API", {
        hasText: !!rawText,
        hasHtml: !!rawHtml,
      });
    } catch (e: any) {
      console.error(
        "[resend-inbound] Failed to fetch email body from Resend API",
        {
          message: e?.message,
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
      // 2) Si c'est vide et qu'on a un reviewId, chercher dans review_messages
      // 3) Si c'est vide et qu'on a un conversationId, chercher dans support_messages
      // 4) Si c'est vide et qu'on a reviewId/playerName, construire un message basique
      let forwardBody = replyText;

      // Pour les avis modérés : chercher dans review_messages
      // On utilise reviewId (dans les headers ou extrait du sujet) pour trouver la conversation, puis le message
      if ((!forwardBody || forwardBody.trim().length === 0) && (reviewId || isModeratedReview) && supabaseAdmin) {
        // Si on n'a pas de reviewId mais qu'on a un conversationId et que c'est un avis modéré,
        // le conversationId peut être en fait le reviewId
        let actualReviewId = reviewId;
        if (!actualReviewId && conversationId && isModeratedReview) {
          actualReviewId = typeof conversationId === "string" ? conversationId : String(conversationId);
        }
        
        if (!actualReviewId) {
          console.log("[resend-inbound] Cannot fetch review message: no reviewId available");
        } else {
        try {
          // D'abord, trouver la conversation via reviewId
          let reviewConversationId: string | null = null;
          
          // Si on a déjà un conversationId extrait du sujet, l'utiliser directement
          // (mais seulement si ce n'est pas le reviewId lui-même)
          if (conversationId && conversationId !== actualReviewId) {
            reviewConversationId =
              typeof conversationId === "string"
                ? conversationId
                : Array.isArray(conversationId)
                ? conversationId[0]
                : String(conversationId);
          } else {
            // Sinon, chercher la conversation via review_id
            const { data: reviewConv, error: reviewConvError } = await supabaseAdmin
              .from("review_conversations")
              .select("id")
              .eq("review_id", actualReviewId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (reviewConvError) {
              console.error("[resend-inbound] Error fetching review conversation", {
                code: reviewConvError.code,
              });
            } else if (reviewConv?.id) {
              reviewConversationId = reviewConv.id;
            }
          }

          // Si on a trouvé une conversation, chercher le message
          if (reviewConversationId) {
            const { data: reviewMessage, error: reviewMessageError } = await supabaseAdmin
              .from("review_messages")
              .select("message_text, html_content")
              .eq("conversation_id", reviewConversationId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (reviewMessageError) {
              console.error("[resend-inbound] Error fetching review message for forward", {
                code: reviewMessageError.code,
              });
            } else if (reviewMessage?.message_text) {
              forwardBody = String(reviewMessage.message_text);
            } else if (reviewMessage?.html_content) {
              // Extraire le texte du HTML si on n'a que le HTML
              forwardBody = reviewMessage.html_content
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<[^>]*>/g, "")
                .trim();
            }
          }
        } catch (e: any) {
          console.error("[resend-inbound] Exception fetching review message for forward", {
            message: e?.message,
          });
        }
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
          hasReviewId: !!reviewId,
          hasConversationId: !!conversationId,
        }
      );

      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "PadelXP Support <support@updates.padelxp.eu>",
        to: FORWARD_TO,
        replyTo: INBOUND_EMAIL,
        subject: subjectForForward,
        // Corps du message : le texte complet saisi par le club ou l'avis
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



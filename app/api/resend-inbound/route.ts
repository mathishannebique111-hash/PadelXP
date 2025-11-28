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

    const reviewId =
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
    const rawText: string =
      emailData.text ??
      emailData.text_body ??
      emailData.textBody ??
      "";
    const rawHtml: string | undefined =
      emailData.html ??
      emailData.html_body ??
      emailData.htmlBody ??
      undefined;

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
    // - Identifiée par la présence de conversationId
    // - L'admin répond depuis Gmail, l'email arrive sur l'inbound
    // - On enregistre le message dans support_messages, mais on NE le renvoie PAS vers Gmail
    if (conversationId) {
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
      // 2) Si c'est vide, on va chercher le dernier message texte dans support_messages
      let forwardBody = replyText;

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

      // Toujours prévoir un fallback texte
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
        }
      );

      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "PadelXP Support <support@updates.padelxp.eu>",
        to: FORWARD_TO,
        replyTo: INBOUND_EMAIL,
        subject: subjectForForward,
        // Corps du message : le texte complet saisi par le club
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



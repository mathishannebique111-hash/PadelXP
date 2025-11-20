import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
  try {
    // Vérifier les variables d'environnement
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    if (!FORWARD_TO) {
      console.error("FORWARD_TO_EMAIL is not configured");
      return NextResponse.json({ error: "FORWARD_TO_EMAIL not configured" }, { status: 500 });
    }

    // Essayer de parser le JSON, avec fallback sur texte brut pour debug
    let event: any;
    try {
      event = await req.json();
    } catch (jsonError) {
      console.error("Failed to parse JSON, trying text:", jsonError);
      const rawBody = await req.text();
      console.log("Raw body received:", rawBody);
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    console.log("Resend inbound event:", JSON.stringify(event, null, 2));

    // On ne traite que les évènements email.received
    if (event?.type !== "email.received") {
      console.log("Ignoring event type:", event?.type);
      return NextResponse.json({ ignored: true });
    }

    // Les données de l'email sont directement dans le payload du webhook
    const emailData = event.data;
    if (!emailData) {
      console.error("No email data in event:", event);
      return NextResponse.json({ error: "No email data" }, { status: 400 });
    }

    console.log("Full inbound email data:", JSON.stringify(emailData, null, 2));

    // Extraire les informations de l'email selon la structure du webhook Resend
    const subject = emailData.subject ?? emailData.headers?.["subject"] ?? emailData.headers?.["Subject"] ?? "(Sans sujet)";
    const from = emailData.from ?? emailData.headers?.["from"] ?? emailData.headers?.["From"] ?? emailData.sender_email ?? "Expéditeur inconnu";
    const to = emailData.to ?? emailData.headers?.["to"] ?? emailData.headers?.["To"] ?? emailData.recipient_email ?? "";
    const emailId = emailData.email_id;
    
    // Vérifier si c'est un message du club (depuis le formulaire de contact)
    const senderType = emailData.headers?.["X-Sender-Type"] ?? emailData.headers?.["x-sender-type"];
    const conversationId = emailData.headers?.["X-Conversation-ID"] ?? emailData.headers?.["x-conversation-id"];
    const clubId = emailData.headers?.["X-Club-ID"] ?? emailData.headers?.["x-club-id"];
    
    console.log("Email metadata:", {
      senderType,
      conversationId,
      clubId,
      from,
      to,
      subject
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

    // Si c'est un message du club, le message a déjà été enregistré dans /api/contact
    // On transfère juste l'email vers Gmail pour que l'admin puisse répondre
    // Si c'est une réponse de l'admin, elle sera gérée par /api/webhooks/resend
    
    // Transférer l'email vers Gmail avec les headers pour identifier la conversation
    const forwardHeaders: Record<string, string> = {
      'X-Conversation-ID': conversationId || '',
      'X-Club-ID': clubId || '',
      'X-Original-From': from,
    };
    
    // Supprimer les headers vides
    Object.keys(forwardHeaders).forEach(key => {
      if (!forwardHeaders[key]) delete forwardHeaders[key];
    });

    const { error: sendError, data: forwardData } = await resend.emails.send({
      from: "PadelXP Support <support@updates.padelxp.eu>",
      to: [FORWARD_TO],
      subject: `📩 Nouveau message de ${from} : ${subject}`,
      html: emailHtml,
      // IMPORTANT: replyTo doit être l'inbound email pour que les réponses soient capturées par le webhook
      replyTo: INBOUND_EMAIL || 'contact@updates.padelxp.eu',
      headers: Object.keys(forwardHeaders).length > 0 ? forwardHeaders : undefined,
    });

    if (sendError) {
      console.error("Error forwarding to Gmail:", sendError);
      return NextResponse.json({ error: "forward_failed" }, { status: 500 });
    }

    console.log("Email forwarded successfully:", {
      to: FORWARD_TO,
      conversationId,
      messageId: forwardData?.id
    });

    return NextResponse.json({ ok: true, forwarded: true });
  } catch (error: any) {
    console.error("Unexpected error in resend-inbound:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error?.message },
      { status: 500 }
    );
  }
}

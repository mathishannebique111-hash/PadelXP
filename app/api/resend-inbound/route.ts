import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FORWARD_TO = process.env.FORWARD_TO_EMAIL!; // contactpadelxp@gmail.com

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
    
    // Essayer différentes propriétés pour le contenu
    const text = emailData.text ?? emailData.text_body ?? emailData.body_text ?? emailData.plain_text ?? "";
    const html = emailData.html ?? emailData.html_body ?? emailData.body_html ?? emailData.body ?? "";
    
    console.log("Extracted email content:", {
      subject,
      from,
      to,
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

    // Renvoyer vers ta boîte Gmail
    const { error: sendError } = await resend.emails.send({
      from: "PadelXP Support <support@updates.padelxp.eu>",
      to: [FORWARD_TO],
      subject: `📩 Nouveau message de ${from} : ${subject}`,
      html: emailHtml,
      replyTo: from,
    });

    if (sendError) {
      console.error("Error forwarding to Gmail:", sendError);
      return NextResponse.json({ error: "forward_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Unexpected error in resend-inbound:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error?.message },
      { status: 500 }
    );
  }
}

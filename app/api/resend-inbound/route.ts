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

    const subject = emailData.subject ?? emailData.headers?.["subject"] ?? "(Sans sujet)";
    const from = emailData.from ?? emailData.headers?.["from"] ?? "Expéditeur inconnu";
    const text = emailData.text ?? emailData.text_body ?? "";
    const html = emailData.html ?? emailData.html_body ?? `<pre>${text}</pre>`;

    // Renvoyer vers ta boîte Gmail
    const { error: sendError } = await resend.emails.send({
      from: "PadelXP Support <support@updates.padelxp.eu>",
      to: [FORWARD_TO],
      subject: `📩 Nouveau message de ${from} : ${subject}`,
      html: html,
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

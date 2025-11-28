import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { extractReplyContent } from "@/lib/utils/email-utils";

// Initialisation conditionnelle de Resend
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    if (!process.env.RESEND_API_KEY || !resend) {
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
      console.log("📄 Raw body received:", rawBody.substring(0, 500));
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    console.log("📨 Resend inbound event type:", event?.type);
    console.log("📨 Resend inbound event (full):", JSON.stringify(event, null, 2).substring(0, 1000));

    // On ne traite que les évènements email.received
    if (event?.type !== "email.received") {
      console.log("⚠️ Ignoring event type:", event?.type);
      return NextResponse.json({ ignored: true, type: event?.type });
    }
    
    console.log("✅ Event type is email.received, processing...");

    const emailData = event.data;
    if (!emailData) {
      console.error("❌ No email data in event:", event);
      return NextResponse.json({ error: "No email data" }, { status: 400 });
    }

    console.log("✅ Email data found");
    console.log("📧 Full inbound email data keys:", Object.keys(emailData));

    const subject = emailData.subject ?? emailData.headers?.["subject"] ?? emailData.headers?.["Subject"] ?? "(Sans sujet)";
    const from = emailData.from ?? emailData.headers?.["from"] ?? emailData.headers?.["From"] ?? emailData.sender_email ?? "Expéditeur inconnu";
    const to = emailData.to ?? emailData.headers?.["to"] ?? emailData.headers?.["To"] ?? emailData.recipient_email ?? "";
    const emailId = emailData.email_id;
    
    const senderType = emailData.headers?.["X-Sender-Type"] ?? emailData.headers?.["x-sender-type"];
    let conversationId = emailData.headers?.["X-Conversation-ID"] ?? emailData.headers?.["x-conversation-id"];
    const clubId = emailData.headers?.["X-Club-ID"] ?? emailData.headers?.["x-club-id"];
    
    const reviewId = emailData.headers?.["X-Review-ID"] ?? emailData.headers?.["x-review-id"];
    const playerEmail = emailData.headers?.["X-Player-Email"] ?? emailData.headers?.["x-player-email"];
    const playerName = emailData.headers?.["X-Player-Name"] ?? emailData.headers?.["x-player-name"];
    
    const inReplyTo = emailData.headers?.["In-Reply-To"] ?? emailData.headers?.["in-reply-to"] ?? emailData.in_reply_to;
    const references = emailData.headers?.["References"] ?? emailData.headers?.["references"] ?? emailData.references;
    const isReply = !!(inReplyTo || references || (subject && (subject.toLowerCase().includes('re:') || subject.toLowerCase().includes('ré:'))));
    
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

    // ---- À partir d’ici, tout le reste de ton code reste identique ----
    // (aucun autre changement nécessaire pour Resend, tu peux garder le reste
    //  exactement comme dans ta version actuelle, y compris tous les traitements,
    //  accès Supabase, extractions de contenu, envois d'emails avec resend.emails.send, etc.)
    // ------------------------------------------------------------------

    // ... COLLE ICI TOUT LE RESTE DE TON FICHIER À L’IDENTIQUE ...
    // (à partir du bloc "Si on a un email_id, récupérer le contenu via l'API Resend"
    //  jusqu'à la fin du try/catch/finally)

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

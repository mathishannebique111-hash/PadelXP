import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FORWARD_TO = process.env.FORWARD_TO_EMAIL!; // contactpadelxp@gmail.com

export async function POST(req: NextRequest) {
  const event = await req.json();
  console.log("Resend inbound event:", event);

  // On ne traite que les évènements email.received
  if (event.type !== "email.received") {
    return NextResponse.json({ ignored: true });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: "No email_id" }, { status: 400 });
  }

  // 1) Récupérer le contenu complet de l'email reçu
  const { data: email, error } = await resend.emails.receiving.get(emailId);
  if (error || !email) {
    console.error("Error fetching received email:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  console.log("Full inbound email:", email);

  const subject = email.subject ?? "(Sans sujet)";
  const from = email.from ?? "Expéditeur inconnu";

  // 2) Renvoyer vers ta boîte Gmail
  const { error: sendError } = await resend.emails.send({
    from: "PadelXP Support <support@updates.padelxp.eu>",
    to: [FORWARD_TO],
    subject: `📩 Nouveau message de ${from} : ${subject}`,
    html: email.html ?? `<pre>${email.text ?? ""}</pre>`,
    reply_to: from,
  });

  if (sendError) {
    console.error("Error forwarding to Gmail:", sendError);
    return NextResponse.json({ error: "forward_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

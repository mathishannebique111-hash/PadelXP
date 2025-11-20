import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FORWARD_TO = process.env.FORWARD_TO_EMAIL!; // contactpadelxp@gmail.com

export async function POST(req: NextRequest) {
  const event = await req.json();
  console.log("Resend inbound event:", event);

  if (event.type !== "email.received") {
    return NextResponse.json({ ignored: true });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: "No email_id" }, { status: 400 });
  }

  // Récupérer le mail complet
  const { data: email, error } = await resend.emails.receiving.get(emailId);
  if (error || !email) {
    console.error("Error fetching received email:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  console.log("Full inbound email:", email);

  const subject = email.subject ?? "(Sans sujet)";
  const from = email.from ?? "Expéditeur inconnu";

  // Construire un HTML propre avec le contenu
  const bodyHtml =
    email.html ??
    `<pre style="white-space:pre-wrap;font-family:system-ui">${email.text ?? "(aucun texte)"}</pre>`;

  const forwardHtml = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5">
      <p>Tu as reçu un <strong>nouveau message</strong> pour PadelXP.</p>
      <p><strong>De :</strong> ${from}</p>
      <p><strong>À :</strong> ${email.to?.join(", ")}</p>
      <p><strong>Objet original :</strong> ${subject}</p>
      <hr style="margin:16px 0" />
      ${bodyHtml}
    </div>
  `;

  const { error: sendError } = await resend.emails.send({
    from: "PadelXP Support <support@updates.padelxp.eu>",
    to: [FORWARD_TO],
    subject: `Nouveau message de ${from} : ${subject}`,
    html: forwardHtml,
    reply_to: from,
  });

  if (sendError) {
    console.error("Error forwarding to Gmail:", sendError);
    return NextResponse.json({ error: "forward_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

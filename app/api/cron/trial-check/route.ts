import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
  }

  const { email, clubName, daysLeft } = await request.json();

  const { data, error } = await resend.emails.send({
    from: 'PadelXP <noreply@votre-domaine.com>',
    to: email,
    subject: `Il reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} à votre essai PadelXP`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #333;">Bonjour ${clubName}</h1>
        <p style="font-size: 16px; color: #555;">
          Votre essai gratuit se termine dans <strong style="color: #000;">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
        </p>
        <p style="font-size: 16px; color: #555;">
          Pour continuer à profiter de PadelXP, activez votre abonnement dès maintenant.
        </p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing"
           style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold;">
          Activer mon abonnement
        </a>
        <p style="font-size: 14px; color: #888; margin-top: 30px;">
          L'équipe PadelXP
        </p>
      </div>
    `
  });

  if (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
  }

  const { email, clubName, daysLeft } = await request.json();

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'PadelXP <noreply@padelleague.com>';
  
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Il reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} à votre essai PadelXP`,
    html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  </head>
  <body style="margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; background-color:#0b0c10; width:100%;">
  <!--[if mso]>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b0c10;">
    <tr>
      <td align="center" style="padding:12px 12px;">
        <table width="576" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:12px;">
  <![endif]-->
  <!--[if !mso]><!-->
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color:#0b0c10; padding:12px 12px; width:100%; max-width:100%; box-sizing:border-box; -webkit-box-sizing:border-box; -moz-box-sizing:border-box;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%; max-width:100%; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
      <tr>
        <td align="center" style="padding:0;">
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="width:100%; max-width:576px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.18); border-collapse:collapse; box-sizing:border-box; -webkit-box-sizing:border-box; -moz-box-sizing:border-box;">
  <!--<![endif]-->
            <!-- En-tête -->
            <tr>
              <td style="background: radial-gradient(circle at top left, #00D8FF 0, #0066FF 45%, #081229 100%); padding:16px 12px; color:#ffffff; word-wrap:break-word; word-break:break-word;">
                <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" style="padding-bottom:6px; word-wrap:break-word; word-break:break-word;">
                      <div style="font-size:16px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; line-height:1.3; word-wrap:break-word;">
                        PadelXP
                      </div>
                      <div style="margin-top:4px; font-size:11px; opacity:0.9; line-height:1.4; word-wrap:break-word;">
                        La plateforme qui fait passer ton club au niveau supérieur.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="font-size:11px; opacity:0.85; padding-top:4px; word-wrap:break-word; word-break:break-word;">
                      Essai PadelXP · ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Contenu principal -->
            <tr>
              <td style="padding:16px 12px 8px 12px; word-wrap:break-word; word-break:break-word;">
                <h1 style="margin:0 0 10px 0; font-size:18px; color:#111827; line-height:1.4; word-wrap:break-word; word-break:break-word; font-weight:700;">
                  ${daysLeft === 1 ? 'Dernier jour d\'essai, ' : 'Votre essai se termine bientôt, '}${clubName}
                </h1>
                <p style="margin:0 0 10px 0; font-size:14px; color:#4b5563; line-height:1.6; word-wrap:break-word; word-break:break-word;">
                  Votre essai gratuit de <strong style="color:#111827;">PadelXP</strong> se termine dans 
                  <strong style="color:#111827;">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
                  Pour continuer à profiter de la plateforme sans interruption, il vous suffit d'activer votre abonnement.
                </p>

                <p style="margin:0 0 14px 0; font-size:14px; color:#4b5563; line-height:1.6; word-wrap:break-word; word-break:break-word;">
                  En activant PadelXP, vous gardez&nbsp;:
                </p>

                <ul style="margin:0 0 16px 14px; padding:0; font-size:13px; color:#374151; line-height:1.7; word-wrap:break-word; word-break:break-word;">
                  <li style="margin-bottom:6px;">Vos ligues, classements et historiques de matchs déjà configurés.</li>
                  <li style="margin-bottom:6px;">Les profils joueurs et leurs statistiques centralisées.</li>
                  <li style="margin-bottom:0;">Une gestion simplifiée des compétitions et de la communication avec vos membres.</li>
                </ul>

                <div style="text-align:center; margin:20px 0 14px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/facturation"
                    style="display:inline-block; background:linear-gradient(135deg, #00D8FF, #0066FF); color:#ffffff; padding:12px 20px; border-radius:999px; font-weight:600; font-size:14px; text-decoration:none; max-width:100%; box-sizing:border-box; word-wrap:break-word;">
                    Activer mon abonnement PadelXP
                  </a>
                </div>

                <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280; line-height:1.6; word-wrap:break-word; word-break:break-word;">
                  Si vous ne faites rien, votre accès sera limité à la fin de l'essai, 
                  mais vos données resteront sauvegardées pour une éventuelle réactivation.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:12px 12px 16px 12px; border-top:1px solid #e5e7eb; word-wrap:break-word; word-break:break-word;">
                <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" style="font-size:11px; color:#9ca3af; padding-bottom:6px; word-wrap:break-word; word-break:break-word;">
                      À bientôt sur les terrains,<br/>
          L'équipe PadelXP
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="font-size:10px; color:#9ca3af; word-wrap:break-word; word-break:break-word;">
                      Cet email vous a été envoyé car vous avez démarré un essai sur PadelXP.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
  <!--[if !mso]><!-->
        </td>
      </tr>
    </table>
      </div>
  <!--<![endif]-->
  <!--[if mso]>
        </table>
      </td>
    </tr>
  </table>
  <![endif]-->
  </body>
  </html>
    `
  });

  if (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

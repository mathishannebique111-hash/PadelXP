import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
  }

  const { email, clubName, daysLeft } = await request.json();

  const { data, error } = await resend.emails.send({
    from: 'PadelXP <onboarding@resend.dev>',
    to: email,
    subject: `Il reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} à votre essai PadelXP`,
    html: `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color:#0b0c10; padding:32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.18);">
            
            <!-- En-tête -->
            <tr>
              <td style="background: radial-gradient(circle at top left, #00D8FF 0, #0066FF 45%, #081229 100%); padding:24px 32px; color:#ffffff;">
                <table width="100%" role="presentation">
                  <tr>
                    <td align="left">
                      <div style="font-size:20px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;">
                        PadelXP
                      </div>
                      <div style="margin-top:8px; font-size:13px; opacity:0.9;">
                        La plateforme qui fait passer ton club au niveau supérieur.
                      </div>
                    </td>
                    <td align="right" style="font-size:13px; opacity:0.85;">
                      Essai PadelXP · ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Contenu principal -->
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <h1 style="margin:0 0 12px 0; font-size:22px; color:#111827;">
                  ${daysLeft === 1 ? 'Dernier jour d\'essai, ' : 'Votre essai se termine bientôt, '} ${clubName}
                </h1>
                <p style="margin:0 0 12px 0; font-size:15px; color:#4b5563; line-height:1.6;">
                  Votre essai gratuit de <strong style="color:#111827;">PadelXP</strong> se termine dans 
                  <strong style="color:#111827;">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
                  Pour continuer à profiter de la plateforme sans interruption, il vous suffit d'activer votre abonnement.
                </p>

                <p style="margin:0 0 18px 0; font-size:15px; color:#4b5563; line-height:1.6;">
                  En activant PadelXP, vous gardez&nbsp;:
                </p>

                <ul style="margin:0 0 18px 18px; padding:0; font-size:14px; color:#374151; line-height:1.7;">
                  <li>Vos ligues, classements et historiques de matchs déjà configurés.</li>
                  <li>Les profils joueurs et leurs statistiques centralisées.</li>
                  <li>Une gestion simplifiée des compétitions et de la communication avec vos membres.</li>
                </ul>

                <div style="text-align:center; margin:24px 0 16px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/facturation"
                    style="display:inline-block; background:linear-gradient(135deg, #00D8FF, #0066FF); 
                           color:#ffffff; padding:14px 32px; border-radius:999px; 
                           font-weight:600; font-size:15px; text-decoration:none;">
                    Activer mon abonnement PadelXP
                  </a>
                </div>

                <p style="margin:0 0 10px 0; font-size:13px; color:#6b7280; line-height:1.6;">
                  Si vous ne faites rien, votre accès sera limité à la fin de l'essai, 
                  mais vos données resteront sauvegardées pour une éventuelle réactivation.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 32px 24px 32px; border-top:1px solid #e5e7eb;">
                <table width="100%" role="presentation">
                  <tr>
                    <td align="left" style="font-size:12px; color:#9ca3af;">
                      À bientôt sur les terrains,<br/>
                      L'équipe PadelXP
                    </td>
                    <td align="right" style="font-size:11px; color:#9ca3af;">
                      Cet email vous a été envoyé car vous avez démarré un essai sur PadelXP.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
`
  });

  if (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

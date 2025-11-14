import { Resend } from "resend";

let resend: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function sendMatchConfirmationEmail(
  to: string,
  playerName: string,
  matchCreatorName: string,
  matchScore: string,
  confirmationUrl: string
): Promise<void> {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured. Email not sent. In production, configure Resend to send confirmation emails.");
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PadelLeague <noreply@padelleague.com>",
      to,
      subject: `🎾 Confirmation de match - ${matchCreatorName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Inter, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0066FF, #0052CC); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .button:hover { background: #0052CC; }
              .score-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎾 Confirmation de match</h1>
              </div>
              <div class="content">
                <p>Bonjour ${playerName},</p>
                <p><strong>${matchCreatorName}</strong> a enregistré un match de padel avec vous.</p>
                <div class="score-box">
                  Score: ${matchScore}
                </div>
                <p>Veuillez confirmer ce score en cliquant sur le bouton ci-dessous :</p>
                <a href="${confirmationUrl}" class="button">Confirmer le match</a>
                <p>Si ce score est incorrect, vous pouvez ignorer cet email ou contacter ${matchCreatorName}.</p>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  Le match sera validé lorsque 2 joueurs sur 3 auront confirmé.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    throw error;
  }
}

export async function sendAdminInvitationEmail(
  to: string,
  clubName: string,
  inviterName: string | null,
  invitationUrl: string
): Promise<void> {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured. Email not sent. In production, configure Resend to send invitation emails.");
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PadelLeague <noreply@padelleague.com>",
      to,
      subject: `🎾 Invitation à devenir administrateur de ${clubName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Inter, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0066FF, #0052CC); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
              .button:hover { background: #0052CC; }
              .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066FF; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎾 Invitation administrateur</h1>
              </div>
              <div class="content">
                <p>Bonjour,</p>
                ${inviterName ? `<p><strong>${inviterName}</strong> vous invite à devenir administrateur du club <strong>${clubName}</strong> sur PadelXP.</p>` : `<p>Vous avez été invité à devenir administrateur du club <strong>${clubName}</strong> sur PadelXP.</p>`}
                <div class="info-box">
                  <p style="margin: 0;">En tant qu'administrateur, vous pourrez :</p>
                  <ul style="margin: 10px 0 0 20px;">
                    <li>Gérer les membres du club</li>
                    <li>Voir les statistiques détaillées</li>
                    <li>Exporter les données du club</li>
                    <li>Inviter d'autres administrateurs</li>
                  </ul>
                </div>
                <p>Pour accepter cette invitation et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>
                <a href="${invitationUrl}" class="button">Accepter l'invitation</a>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  Ce lien est valide pendant 48 heures. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
                </p>
                <p style="font-size: 12px; color: #666;">
                  Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                  <a href="${invitationUrl}" style="color: #0066FF; word-break: break-all;">${invitationUrl}</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending admin invitation email:", error);
    throw error;
  }
}


import { Resend } from "resend";
import { logger } from "@/lib/logger";

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
    logger.warn("RESEND_API_KEY not configured. Email not sent. In production, configure Resend to send confirmation emails.", { to: to.substring(0, 5) + "…" });
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PadelXP <noreply@padelleague.com>",
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
    logger.error("Error sending confirmation email", { to: to.substring(0, 5) + "…", error });
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
    logger.warn("RESEND_API_KEY not configured. Email not sent. In production, configure Resend to send invitation emails.", { to: to.substring(0, 5) + "…", clubName });
    return;
  }

  try {
    // S'assurer que l'URL utilise le site de production
    const productionUrl = invitationUrl.replace('http://localhost:3000', 'https://padelxp.eu');

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PadelXP <noreply@padelleague.com>",
      to,
      subject: `🎾 Invitation à devenir administrateur de ${clubName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0066FF, #0052CC); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🎾 Invitation administrateur</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Bonjour,</p>
                ${inviterName ? `<p><strong>${inviterName}</strong> vous invite à devenir administrateur du club <strong>${clubName}</strong> sur PadelXP.</p>` : `<p>Vous avez été invité à devenir administrateur du club <strong>${clubName}</strong> sur PadelXP.</p>`}
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066FF;">
                  <p style="margin: 0;">En tant qu'administrateur, vous pourrez :</p>
                  <ul style="margin: 10px 0 0 20px;">
                    <li>Gérer les membres du club</li>
                    <li>Voir les statistiques détaillées</li>
                    <li>Exporter les données du club</li>
                    <li>Inviter d'autres administrateurs</li>
                  </ul>
                </div>
                <p>Pour accepter cette invitation et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                  <tr>
                    <td align="center" bgcolor="#0066FF" style="border-radius: 6px;">
                      <a href="${productionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: Inter, Arial, sans-serif; font-size: 16px; font-weight: bold; color: #FFFFFF; text-decoration: none; border-radius: 6px;">Accepter l'invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  Ce lien est valide pendant 48 heures. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    logger.error("Error sending admin invitation email", { to: to.substring(0, 5) + "…", clubName, error });
    throw error;
  }
}

/**
 * Envoie un email à l'administrateur lorsqu'un avis problématique est soumis
 * (3 étoiles ou moins avec 6 mots ou moins)
 */
export async function sendModeratedReviewEmail(
  adminEmail: string,
  playerName: string,
  playerEmail: string,
  rating: number,
  comment: string | null,
  reviewId: string,
  conversationId?: string // Optionnel: ID de la conversation si elle existe déjà
): Promise<void> {
  if (!resend || !process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured. Email not sent for moderated review.", { reviewId: reviewId.substring(0, 8) + "…", playerEmail: playerEmail.substring(0, 5) + "…" });
    return;
  }

  try {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

    // Utiliser le système d'inbound email comme pour le support club
    // Envoyer l'email à l'inbound email qui sera transféré à Gmail
    const INBOUND_EMAIL = process.env.RESEND_INBOUND_EMAIL || 'contact@updates.padelxp.eu';
    const FORWARD_TO_EMAIL = process.env.FORWARD_TO_EMAIL || adminEmail;

    // Préparer les options d'email
    const emailOptions: any = {
      from: process.env.RESEND_FROM_EMAIL || "PadelXP <noreply@padelleague.com>",
      to: INBOUND_EMAIL, // Envoyer à l'inbound email pour être capturé par le webhook et transféré à Gmail
      subject: conversationId
        ? `⚠️ Avis modéré - ${playerName} (${rating}/5 étoiles) [${conversationId}]`
        : `⚠️ Avis modéré - ${playerName} (${rating}/5 étoiles) [${reviewId}]`,
      headers: {
        'X-Review-ID': reviewId,
        'X-Conversation-ID': conversationId || '', // ID de la conversation pour les réponses
        'X-Player-Email': playerEmail,
        'X-Player-Name': playerName,
        'X-Sender-Type': 'moderated-review', // Identifier que c'est un avis modéré
      },
    };

    emailOptions.html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Inter, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF6B6B, #EE5A6F); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .review-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B6B; }
              .info-row { margin: 10px 0; }
              .info-label { font-weight: bold; color: #666; }
              .info-value { color: #333; }
              .stars { color: #FFD700; font-size: 18px; }
              .comment-box { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Avis modéré détecté</h1>
              </div>
              <div class="content">
                <p>Bonjour,</p>
                <p>Un avis a été soumis avec une note faible (3 étoiles ou moins) et un texte court (6 mots ou moins). Cet avis a été automatiquement masqué du site et nécessite votre attention.</p>
                
                <div class="review-box">
                  <div class="info-row">
                    <span class="info-label">Joueur :</span>
                    <span class="info-value">${playerName}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Email :</span>
                    <span class="info-value">${playerEmail}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Note :</span>
                    <span class="stars">${stars}</span>
                    <span class="info-value">${rating}/5</span>
                  </div>
                  ${comment ? `
                    <div class="info-row">
                      <span class="info-label">Commentaire :</span>
                    </div>
                    <div class="comment-box">
                      "${comment}"
                    </div>
                  ` : '<div class="info-row"><span class="info-label">Commentaire :</span> <span class="info-value">Aucun commentaire</span></div>'}
                  <div class="info-row">
                    <span class="info-label">ID de l'avis :</span>
                    <span class="info-value">${reviewId}</span>
                  </div>
                </div>
                
                <p><strong>Action recommandée :</strong></p>
                <ul style="margin: 10px 0 0 20px;">
                  <li>Contactez le joueur pour comprendre son problème</li>
                  <li>Résolvez le problème s'il y en a un</li>
                  <li>Si l'avis est justifié, vous pouvez le laisser masqué ou le supprimer</li>
                </ul>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196F3;">
                  <p style="margin: 0; font-size: 14px; color: #1976D2;">
                    <strong>💡 Astuce :</strong> Vous pouvez répondre directement à cet email pour contacter le joueur. Votre réponse lui sera envoyée automatiquement à <strong>${playerEmail}</strong>.
                  </p>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  Cet avis n'est pas visible sur le site public tant qu'il n'a pas été modéré.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

    // Envoyer à l'inbound email pour être capturé par le webhook et transféré à Gmail
    await resend.emails.send(emailOptions);

    logger.info("✅ Moderated review email sent via inbound email", { reviewId: reviewId.substring(0, 8) + "…", playerEmail: playerEmail.substring(0, 5) + "…", conversationId: conversationId?.substring(0, 8) + "…" || null });
  } catch (error) {
    logger.error("❌ Error sending moderated review email", { reviewId: reviewId.substring(0, 8) + "…", playerEmail: playerEmail.substring(0, 5) + "…", error });
    // Ne pas throw l'erreur pour ne pas bloquer la soumission de l'avis
  }
}

export async function sendGuestMatchInvitationEmail(
  to: string,
  playerName: string,
  matchCreatorName: string,
  matchScore: string,
  targetUrl: string = "https://padelxp.eu"
): Promise<void> {
  if (!resend || !process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured. Guest email not sent.", { to: to.substring(0, 5) + "…" });
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PadelXP <noreply@padelleague.com>",
      to,
      subject: `🎾 Match enregistré avec toi - PadelXP`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Inter, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF9900, #FF6600); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #FF6600; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
              .button:hover { background: #E65C00; }
              .score-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; border-left: 4px solid #FF6600; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎾 Tu as joué un match !</h1>
              </div>
              <div class="content">
                <p>Bonjour ${playerName},</p>
                <p><strong>${matchCreatorName}</strong> a enregistré un match de padel avec toi sur PadelXP.</p>
                
                <div class="score-box">
                  Score: ${matchScore}
                </div>
                
                <p>Clique sur le bouton ci-dessous pour confirmer ta participation et recevoir les nouvelles du club si tu le souhaites.</p>
                
                <div style="text-align: center;">
                  <a href="${targetUrl}" class="button">Confirmer le match</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                  Si ce n'est pas toi, tu peux ignorer cet email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    logger.info("✅ Guest invitation email sent", { to: to.substring(0, 5) + "…" });
  } catch (error) {
    logger.error("❌ Error sending guest invitation email", { to: to.substring(0, 5) + "…", error });
    // Ne pas bloquer le flux principal
  }
}


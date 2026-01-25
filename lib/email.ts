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

/**
 * Interface for match details to pass to the guest invitation email
 */
interface GuestEmailMatchDetails {
  clubName: string;
  team1Players: string;
  team2Players: string;
  winnerTeam: 1 | 2;
  score: string;
}

export async function sendGuestMatchInvitationEmail(
  to: string,
  playerName: string,
  matchCreatorName: string,
  matchId: string,
  matchDetails: GuestEmailMatchDetails,
  targetUrl: string = "https://padelxp.eu"
): Promise<void> {
  if (!resend || !process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured. Guest email not sent.", { to: to.substring(0, 5) + "…" });
    return;
  }

  // SVG tennis ball icon (Lucide-style)
  const tennisBallSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M18.09 6.24c-2.07 2.83-2.07 8.69 0 11.52"/><path d="M5.91 6.24c2.07 2.83 2.07 8.69 0 11.52"/><path d="M2 12h20"/></svg>`;

  // SVG Trophy icon
  const trophySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;

  // SVG MapPin icon
  const mapPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

  const winnerText = matchDetails.winnerTeam === 1
    ? `${trophySvg} Équipe gagnante : Équipe 1 (${matchDetails.score})`
    : `${trophySvg} Équipe gagnante : Équipe 2 (${matchDetails.score})`;

  // Generate a unique reference to prevent Gmail trimming/threading
  const uniqueRef = new Date().getTime().toString(36);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PadelXP <noreply@padelleague.com>",
      to,
      subject: `Match enregistré avec toi - PadelXP (${new Date().toLocaleDateString('fr-FR')})`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="color-scheme" content="light dark">
            <meta name="supported-color-schemes" content="light dark">
            <style>
              :root {
                color-scheme: light dark;
                supported-color-schemes: light dark;
              }
              body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #ffffff; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #071554, #050C30); color: #ffffff !important; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header-icon { margin-bottom: 10px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; color: #333333; }
              .button { display: inline-block; background: #071554; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 10px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(7, 21, 84, 0.2); }
              .button:hover { background: #0A1E75; }
              .match-details { background: #ffffff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #071554; color: #333333; }
              .match-row { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
              .match-row:last-child { border-bottom: none; }
              .match-label { font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; }
              .match-value { font-size: 15px; font-weight: 600; color: #333333; margin-top: 2px; }
              .winner-row { background: linear-gradient(90deg, #f0f4ff, #ffffff); padding: 12px; border-radius: 6px; margin-top: 10px; }
              .checkbox-section { background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 20px 0; color: #333333; }
              .checkbox-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 14px; color: #555555; }
              .checkbox-note { font-size: 12px; color: #888888; margin-top: 8px; }

              /* Dark Mode Overrides */
              @media (prefers-color-scheme: dark) {
                body { background-color: #1a1a1a !important; color: #e0e0e0 !important; }
                .content { background-color: #2d2d2d !important; color: #e0e0e0 !important; }
                .match-details { background-color: #333333 !important; color: #e0e0e0 !important; border-left-color: #4da6ff !important; }
                .match-value { color: #ffffff !important; }
                .match-label { color: #aaaaaa !important; }
                .match-row { border-bottom-color: #444444 !important; }
                .winner-row { background: #f0f4ff !important; border: 1px solid #444444 !important; } /* Light background for black text in dark mode */
                .winner-text { color: #000000 !important; } /* Force black text as requested */
                .checkbox-section { background-color: #333333 !important; border-color: #444444 !important; color: #e0e0e0 !important; }
                .checkbox-label { color: #cccccc !important; }
                .header { color: #ffffff !important; } /* Force header white in dark mode */
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="header-icon">${tennisBallSvg}</div>
                <h1 style="margin: 0; font-size: 24px; color: #ffffff !important;">Tu as joué un match !</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${playerName}</strong>,</p>
                <p><strong>${matchCreatorName}</strong> a enregistré un match de padel avec toi sur PadelXP.</p>
                
                <div class="match-details">
                  <div class="match-row">
                    <div class="match-label">${mapPinSvg} Lieu</div>
                    <div class="match-value">${matchDetails.clubName}</div>
                  </div>
                  <div class="match-row">
                    <div class="match-label">Équipe 1</div>
                    <div class="match-value">${matchDetails.team1Players}</div>
                  </div>
                  <div class="match-row">
                    <div class="match-label">Équipe 2</div>
                    <div class="match-value">${matchDetails.team2Players}</div>
                  </div>
                  <div class="winner-row">
                    <div class="match-value winner-text" style="color: #000000;">${winnerText}</div>
                  </div>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                  <a href="${targetUrl}" class="button" style="color: #ffffff !important;">Confirmer le match</a>
                  <p style="font-size: 13px; color: #666; margin-top: 8px;">Clique ci-dessus pour valider ta participation</p>
                </div>
                
                <div class="checkbox-section">
                  <label class="checkbox-label">
                    <input type="checkbox" name="newsletter" style="width: 18px; height: 18px; margin-top: 2px;">
                    <span>Je souhaite recevoir les actualités et événements du club par email</span>
                  </label>
                  <p class="checkbox-note">Cette case est optionnelle. Tu peux te désinscrire à tout moment.</p>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                  Ref: ${uniqueRef} • Si ce n'est pas toi, tu peux ignorer cet email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    logger.info("✅ Guest invitation email sent", { to: to.substring(0, 5) + "…" });
  } catch (error) {
    console.error("❌ Error sending guest invitation email:", error);
    logger.error("❌ Error sending guest invitation email", { to: to.substring(0, 5) + "…", error });
  }
}


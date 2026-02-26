import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

const WaitlistSchema = z.object({
    email: z.string().email("Adresse email invalide"),
});

const FORWARD_TO_EMAIL = process.env.FORWARD_TO_EMAIL || 'contactpadelxp@gmail.com';

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const parsed = WaitlistSchema.safeParse(body);
        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors;
            const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";

            return NextResponse.json(
                { error: firstError },
                { status: 400 }
            );
        }

        const { email } = parsed.data;

        if (!resend || !process.env.RESEND_API_KEY) {
            return NextResponse.json({
                error: "Service d'envoi d'email non configuré."
            }, { status: 500 });
        }

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'PadelXP <support@updates.padelxp.eu>';
        const emailSubject = `Nouvelle inscription liste d'attente Android`;
        const submitDate = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

        let emailResult = await resend.emails.send({
            from: fromEmail,
            to: FORWARD_TO_EMAIL,
            replyTo: email,
            subject: emailSubject,
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
              .info { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .info-item { margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📱 Nouvelle inscription liste d'attente Android</h1>
              </div>
              <div class="content">
                <div class="info">
                  <div class="info-item"><strong>Email du joueur :</strong> ${email}</div>
                  <div class="info-item"><strong>Date d'inscription :</strong> ${submitDate}</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
        });

        if (emailResult.error) {
            return NextResponse.json({
                error: "Erreur lors de l'envoi de l'email."
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Inscription réussie'
        });
    } catch (error) {
        return NextResponse.json({
            error: "Erreur serveur lors de l'inscription",
        }, { status: 500 });
    }
}

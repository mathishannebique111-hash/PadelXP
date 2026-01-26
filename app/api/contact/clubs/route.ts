import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ClubContactSchema = z.object({
    clubName: z.string().min(1, "Le nom du club est requis"),
    city: z.string().min(1, "La ville est requise"),
    contactName: z.string().min(1, "Le nom du contact est requis"),
    phone: z.string().min(1, "Le téléphone est requis"),
    email: z.string().email("Email invalide"),
});

const FORWARD_TO_EMAIL = process.env.FORWARD_TO_EMAIL || 'contactpadelxp@gmail.com';
const RESEND_ONBOARDING_EMAIL = 'onboarding@resend.dev';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validation
        const parsed = ClubContactSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { clubName, city, contactName, phone, email } = parsed.data;

        // Initialiser Resend
        if (!process.env.RESEND_API_KEY) {
            logger.error('[contact-clubs] RESEND_API_KEY not found', {});
            return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        // Utiliser l'email vérifié ou celui de test si pas de domaine configuré
        // Dans resend gratuit, on doit utiliser onboarding@resend.dev ou un domaine vérifié
        // On suppose que updates.padelxp.eu est vérifié d'après le code existant
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'PadelXP Clubs <contact@updates.padelxp.eu>';

        const emailResult = await resend.emails.send({
            from: fromEmail,
            to: FORWARD_TO_EMAIL,
            replyTo: email,
            subject: `[Lead Club] ${clubName} (${city})`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066FF; border-bottom: 2px solid #eee; padding-bottom: 10px;">Nouveau prospect Club</h2>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>🏠 Club :</strong> ${clubName}</p>
            <p><strong>📍 Ville :</strong> ${city}</p>
          </div>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
            <p><strong>👤 Contact :</strong> ${contactName}</p>
            <p><strong>📞 Téléphone :</strong> <a href="tel:${phone}">${phone}</a></p>
            <p><strong>📧 Email :</strong> <a href="mailto:${email}">${email}</a></p>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
            Envoyé depuis la Landing Page Clubs PadelXP.
          </p>
        </div>
      `
        });

        if (emailResult.error) {
            logger.error('[contact-clubs] Error sending email', { error: emailResult.error });
            return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[contact-clubs] Unexpected error', { error });
        return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
    }
}

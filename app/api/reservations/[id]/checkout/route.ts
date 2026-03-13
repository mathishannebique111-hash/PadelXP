
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-10-29.clover",
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: reservationId } = await params;
    let stripeAccountId: string | null = null;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // 1. Récupérer la réservation et le participant
        // On a besoin du club_id pour le compte Stripe, et du montant du participant
        const { data: participant, error: participantError } = await supabase
            .from("reservation_participants")
            .select(`
                id,
                amount,
                payment_status,
                reservation:reservation_id (
                    id,
                    court:court_id (
                        name,
                        club:club_id (
                            id,
                            name,
                            stripe_account_id
                        )
                    )
                )
            `)
            .eq("reservation_id", reservationId)
            .eq("user_id", user.id)
            .single();

        if (participantError || !participant) {
            return NextResponse.json({ error: "Participant introuvable" }, { status: 404 });
        }

        if (participant.payment_status === 'paid') {
            return NextResponse.json({ error: "Déjà payé" }, { status: 400 });
        }

        const reservation = participant.reservation as any;
        const club = reservation.court.club;
        stripeAccountId = club.stripe_account_id;

        if (!stripeAccountId) {
            return NextResponse.json({ error: "Ce club n'accepte pas les paiements en ligne" }, { status: 400 });
        }

        // --- CONFIGURATION FRAIS SERVICE & COMMISSION ---
        // 1. Frais de Service (Commission PadelXP) pour les NON-PREMIUM
        // Formule : 2.2% + 0.25€ par transaction, arrondi au centime supérieur
        // Premium : 0€ de frais

        let serviceFeeCents = 0;

        // Vérifier si l'utilisateur est Premium
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .single();

        if (!profile?.is_premium) {
            // Calcul des frais : (Montant * 2.2%) + 0.25€
            const feeAmount = (participant.amount * 0.022) + 0.25;
            // Arrondir au centime supérieur
            serviceFeeCents = Math.ceil(feeAmount * 100);
        }

        const totalApplicationFee = serviceFeeCents;

        // Le montant total à payer par l'utilisateur inclut le prix du terrain + frais de service
        const unitAmount = Math.round(participant.amount * 100) + serviceFeeCents;

        // 2. Créer la session Stripe Checkout
        const session = await (stripe.checkout.sessions as any).create({
            // Utiliser les modes de paiement automatiques pour activer Apple Pay / Google Pay
            automatic_payment_methods: {
                enabled: true,
            },
            line_items: [
                {
                    price_data: {
                        currency: "eur",
                        product_data: {
                            name: `Réservation Padel - ${club.name}`,
                            description: `${reservation.court.name} - Part individuelle`,
                        },
                        unit_amount: unitAmount, // Prix terrain + Frais service
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book?tab=my-reservations&payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book?tab=my-reservations&payment=cancel`,
            metadata: {
                reservation_id: reservation.id,
                participant_id: participant.id,
                user_id: user.id,
                club_id: club.id,
                is_premium: profile?.is_premium ? "true" : "false",
                service_fee: serviceFeeCents.toString()
            },
            payment_intent_data: {
                application_fee_amount: totalApplicationFee,
            },
        }, {
            stripeAccount: stripeAccountId,
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        logger.error("Erreur création session checkout réservation", { 
            message: error?.message,
            code: error?.code,
            type: error?.type,
            stack: error?.stack,
            reservationId
        });

        const isDev = process.env.NODE_ENV === 'development';
        
        // Gestion spécifique des erreurs Stripe Connect
        if (error?.type === 'StripePermissionError' || error?.message?.includes('access to account')) {
            return NextResponse.json({ 
                error: "Configuration de paiement du club invalide",
                details: "Le club doit reconnecter son compte Stripe Connect. L'accès à leur compte a été révoqué ou est mal configuré.",
                stripe_account_id: stripeAccountId
            }, { status: 400 });
        }

        return NextResponse.json({ 
            error: isDev ? (error?.message || "Erreur serveur") : "Erreur serveur",
            details: isDev ? error : undefined
        }, { status: 500 });
    }
}

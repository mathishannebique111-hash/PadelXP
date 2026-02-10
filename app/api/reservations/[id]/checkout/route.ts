
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-10-29.clover",
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: reservationId } = await params;
        const supabase = createRouteHandlerClient({ cookies });
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
        const stripeAccountId = club.stripe_account_id;

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

        const PADELXP_COMMISSION_CENTS = Math.round(participant.amount * 100 * 0.01);
        // Note: Stripe Application Fee plafonnée au montant total si nécessaire, mais ici c'est différent.
        // On veut que PadelXP touche la commission.
        // Si on utilise destination charges (ce qui semble être le cas via stripeAccount: stripeAccountId),
        // application_fee_amount est ce que la plateforme (PadelXP) garde.

        // Donc PadelXP garde : Les frais de service (payés par le user en plus) + evt une com sur la part club ? 
        // L'utilisateur a demandé : "pas de commissions sur les réservations pour les premiums"
        // Ça sous-entend que pour les non-premium, PadelXP prend ces frais.

        const totalApplicationFee = serviceFeeCents;

        // Le montant total à payer par l'utilisateur inclut le prix du terrain + frais de service
        const unitAmount = Math.round(participant.amount * 100) + serviceFeeCents;

        // 2. Créer la session Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
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

    } catch (error) {
        logger.error("Erreur création session checkout réservation", { error });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}


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
                        unit_amount: Math.round(participant.amount * 100), // En centimes
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
                club_id: club.id
            },
            payment_intent_data: {
                transfer_data: {
                    destination: stripeAccountId,
                },
            },
        });

        return NextResponse.json({ url: session.url });

    } catch (error) {
        logger.error("Erreur création session checkout réservation", { error });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

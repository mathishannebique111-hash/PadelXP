import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-10-29.clover',
});

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: { autoRefreshToken: false, persistSession: false }
        }
    )
    : null;

export const dynamic = 'force-dynamic';

/**
 * Webhook pour les événements Stripe Connect (comptes connectés des clubs)
 * Utilise STRIPE_CONNECT_WEBHOOK_SECRET pour la vérification
 */
export async function POST(req: NextRequest) {
    try {
        // Utiliser le secret dédié aux webhooks Connect, sinon fallback sur le principal
        const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            logger.error('[connect-webhook] Webhook secret not configured');
            return NextResponse.json(
                { error: 'Webhook secret not configured' },
                { status: 500 }
            );
        }

        // Récupérer le body et la signature
        const body = await req.text();
        const headersList = await headers();
        const signature = headersList.get('stripe-signature');

        if (!signature) {
            logger.error('[connect-webhook] Missing stripe-signature header');
            return NextResponse.json(
                { error: 'Missing signature' },
                { status: 400 }
            );
        }

        // Vérifier la signature du webhook
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            logger.error('[connect-webhook] Signature verification failed:', err.message);
            return NextResponse.json(
                { error: `Webhook signature verification failed: ${err.message}` },
                { status: 400 }
            );
        }

        logger.info('[connect-webhook] Event received', {
            eventType: event.type,
            eventId: event.id,
            account: event.account // L'ID du compte connecté
        });

        // Traiter les événements des comptes connectés
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                logger.info('[connect-webhook] checkout.session.completed', {
                    sessionId: session.id,
                    metadata: session.metadata,
                    connectedAccount: event.account
                });

                // Vérifier que c'est un paiement de réservation
                if (session.mode === 'payment' && session.metadata?.reservation_id) {
                    const reservationId = session.metadata.reservation_id;
                    const participantId = session.metadata.participant_id;
                    const paymentIntentId = session.payment_intent as string;

                    logger.info('[connect-webhook] Processing reservation payment', {
                        reservationId,
                        participantId,
                        paymentIntentId
                    });

                    if (supabaseAdmin && participantId) {
                        // Mettre à jour le statut de paiement du participant
                        const { error: updateError } = await supabaseAdmin
                            .from('reservation_participants')
                            .update({
                                payment_status: 'paid',
                                paid_at: new Date().toISOString(),
                                stripe_payment_intent_id: paymentIntentId
                            })
                            .eq('id', participantId);

                        if (updateError) {
                            logger.error('[connect-webhook] Failed to update participant payment status', {
                                error: updateError,
                                participantId
                            });
                        } else {
                            logger.info('[connect-webhook] Participant marked as paid', { participantId });

                            // Vérifier si tous les participants ont payé pour confirmer la réservation
                            // (Le trigger SQL s'en occupe normalement, mais on double-check)
                            const { data: participants } = await supabaseAdmin
                                .from('reservation_participants')
                                .select('payment_status')
                                .eq('reservation_id', reservationId);

                            if (participants) {
                                const allPaid = participants.every(p => p.payment_status === 'paid');
                                if (allPaid && participants.length === 4) {
                                    await supabaseAdmin
                                        .from('reservations')
                                        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
                                        .eq('id', reservationId)
                                        .eq('status', 'pending_payment');

                                    logger.info('[connect-webhook] Reservation confirmed - all participants paid', { reservationId });
                                }
                            }
                        }
                    }
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                logger.warn('[connect-webhook] Payment failed', {
                    paymentIntentId: paymentIntent.id,
                    error: paymentIntent.last_payment_error?.message
                });
                // TODO: Notifier le joueur que son paiement a échoué
                break;
            }

            case 'account.updated': {
                // Un compte connecté a été mis à jour (onboarding completé, etc.)
                const account = event.data.object as Stripe.Account;
                logger.info('[connect-webhook] Account updated', {
                    accountId: account.id,
                    chargesEnabled: account.charges_enabled,
                    detailsSubmitted: account.details_submitted
                });
                break;
            }

            default:
                logger.info('[connect-webhook] Unhandled event type:', event.type);
        }

        // Toujours retourner 200 pour confirmer la réception
        return NextResponse.json({ received: true, eventType: event.type });

    } catch (error: any) {
        logger.error('[connect-webhook] Error processing webhook', { err: error });
        return NextResponse.json(
            { error: `Webhook error: ${error.message}` },
            { status: 500 }
        );
    }
}

// Stripe peut tester l'endpoint via GET
export async function GET() {
    return NextResponse.json({
        message: 'Stripe Connect webhook endpoint',
        status: 'active'
    });
}

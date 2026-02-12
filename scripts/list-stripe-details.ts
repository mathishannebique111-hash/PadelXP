
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listSessionsDetails() {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
        console.error('Missing STRIPE_SECRET_KEY');
        return;
    }

    const stripe = new Stripe(stripeSecret, {
        apiVersion: '2025-10-29.clover',
    });

    try {
        console.log('Listing details for last 2 successful sessions...');
        const result = await stripe.checkout.sessions.list({
            limit: 2,
        });

        for (const session of result.data) {
            console.log(`- Session ID: ${session.id}`);
            console.log(`  Payment Status: ${session.payment_status}`);
            console.log(`  Customer Email: ${session.customer_details?.email}`);

            if (session.payment_intent) {
                const intent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
                console.log(`  Payment Intent ID: ${intent.id}`);
                console.log(`  Status: ${intent.status}`);
                console.log(`  Amount: ${intent.amount / 100} ${intent.currency}`);
            } else if (session.subscription) {
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
                    expand: ['latest_invoice.payment_intent']
                });
                console.log(`  Subscription ID: ${subscription.id}`);
                const invoice = subscription.latest_invoice as Stripe.Invoice;
                console.log(`  Latest Invoice ID: ${invoice.id}`);
                console.log(`  Invoice Status: ${invoice.status}`);
                console.log(`  Amount Due: ${invoice.amount_due / 100} ${invoice.currency}`);
                if (invoice.payment_intent) {
                    const pi = invoice.payment_intent as Stripe.PaymentIntent;
                    console.log(`  Payment Intent status: ${pi.status}`);
                } else {
                    console.log(`  No payment intent on invoice (Amount might be 0 or handled differently)`);
                }
            }
            console.log('---');
        }

    } catch (error) {
        console.error('Error listing session details:', error);
    }
}

listSessionsDetails();


import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listSessions() {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
        console.error('Missing STRIPE_SECRET_KEY');
        return;
    }

    const stripe = new Stripe(stripeSecret, {
        apiVersion: '2025-10-29.clover',
    });

    try {
        console.log('Listing last 5 Checkout Sessions...');
        const result = await stripe.checkout.sessions.list({
            limit: 5,
        });

        for (const session of result.data) {
            console.log(`- Session ID: ${session.id}`);
            console.log(`  Status: ${session.status}`);
            console.log(`  Payment Status: ${session.payment_status}`);
            console.log(`  Amount: ${session.amount_total / 100} ${session.currency}`);
            console.log(`  Customer Email: ${session.customer_details?.email || 'N/A'}`);
            console.log(`  Metadata: ${JSON.stringify(session.metadata)}`);
            console.log('---');
        }

    } catch (error) {
        console.error('Error listing sessions:', error);
    }
}

listSessions();

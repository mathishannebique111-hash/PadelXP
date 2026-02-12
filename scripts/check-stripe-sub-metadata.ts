
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSubscription() {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const subscriptionId = 'sub_1T03Rx3RWATPTiiqBZlQZobX'; // Sarah's sub ID from previous log

    if (!stripeSecret) {
        console.error('Missing STRIPE_SECRET_KEY');
        return;
    }

    const stripe = new Stripe(stripeSecret, {
        apiVersion: '2025-10-29.clover',
    });

    try {
        console.log(`Checking Subscription: ${subscriptionId}...`);
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('Subscription Metadata:');
        console.log(JSON.stringify(sub.metadata, null, 2));
        console.log('Full Subscription (truncated):');
        console.log(JSON.stringify({
            id: sub.id,
            status: sub.status,
            customer: sub.customer
        }, null, 2));
    } catch (error) {
        console.error('Error retrieving subscription:', error);
    }
}

checkSubscription();

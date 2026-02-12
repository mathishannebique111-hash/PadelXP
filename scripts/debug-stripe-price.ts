
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkPrice() {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!stripeSecret || !priceId) {
        console.error('Missing STRIPE_SECRET_KEY or STRIPE_PREMIUM_PRICE_ID in .env.local');
        return;
    }

    const stripe = new Stripe(stripeSecret, {
        apiVersion: '2025-10-29.clover',
    });

    try {
        console.log(`Checking price: ${priceId}...`);
        const price = await stripe.prices.retrieve(priceId, {
            expand: ['product'],
        });

        console.log('Price Details:');
        console.log(JSON.stringify(price, null, 2));

        if (price.active === false) {
            console.warn('WARNING: This price is INACTIVE');
        }

    } catch (error) {
        console.error('Error retrieving price:', error);
    }
}

checkPrice();

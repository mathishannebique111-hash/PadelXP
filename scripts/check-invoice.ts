
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkInvoice() {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const invoiceId = 'in_1T03RO3RWATPTiiqnCqXlDti'; // The latest invoice ID found

    if (!stripeSecret) {
        console.error('Missing STRIPE_SECRET_KEY');
        return;
    }

    const stripe = new Stripe(stripeSecret, {
        apiVersion: '2025-10-29.clover',
    });

    try {
        console.log(`Checking Invoice: ${invoiceId}...`);
        const invoice = await stripe.invoices.retrieve(invoiceId);

        console.log('Invoice Details:');
        console.log(`- Amount Due: ${invoice.amount_due / 100} ${invoice.currency}`);
        console.log(`- Amount Paid: ${invoice.amount_paid / 100} ${invoice.currency}`);
        console.log(`- Amount Remaining: ${invoice.amount_remaining / 100} ${invoice.currency}`);
        console.log(`- Subtotal: ${invoice.subtotal / 100} ${invoice.currency}`);
        console.log(`- Total: ${invoice.total / 100} ${invoice.currency}`);
        console.log(`- Status: ${invoice.status}`);

        console.log('Line Items:');
        for (const item of invoice.lines.data) {
            console.log(`  * Description: ${item.description}`);
            console.log(`    Amount: ${item.amount / 100} ${item.currency}`);
            console.log(`    Quantity: ${item.quantity}`);
        }

    } catch (error) {
        console.error('Error retrieving invoice:', error);
    }
}

checkInvoice();

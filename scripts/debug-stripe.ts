import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

// Try to read .env.local manually to be sure
const envContent = fs.readFileSync('.env.local', 'utf8');
const manualKeyMatch = envContent.match(/STRIPE_SECRET_KEY=(sk_test_[a-zA-Z0-9]+)/);
const manualKey = manualKeyMatch ? manualKeyMatch[1] : null;

const key = process.env.STRIPE_SECRET_KEY || manualKey;

if (!key) {
    console.error("❌ Aucune clé STRIPE_SECRET_KEY trouvée dans .env.local");
    process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2025-10-29.clover' });

console.log("---------------------------------------------------");
console.log("🔍 DIAGNOSTIC ULTIME STRIPE CONNECT");
console.log("---------------------------------------------------");

async function diagnose() {
    try {
        const account = await stripe.account.retrieve();

        console.log(`🆔 ID DU COMPTE : ${account.id}`);
        console.log(`📧 Email        : ${account.email}`);
        console.log(`❌ Details Submitted : ${account.details_submitted}`);
        console.log(`❌ Charges Enabled   : ${account.charges_enabled}`);
        console.log(`❌ Payouts Enabled   : ${account.payouts_enabled}`);

        console.log("\n📋 EXIGENCES MANQUANTES (Requirements) :");
        if (account.requirements?.currently_due?.length === 0) {
            console.log("   ✅ Aucun champ requis manquant.");
        } else {
            account.requirements?.currently_due?.forEach(req => {
                console.log(`   🔴 Manquant : ${req}`);
            });
        }

        console.log("\n📋 ERREURS ÉVENTUELLES :");
        if (account.requirements?.errors?.length === 0) {
            console.log("   ✅ Aucune erreur sur le compte.");
        } else {
            account.requirements?.errors?.forEach(err => {
                console.log(`   ⚠️  Erreur : ${err.reason} - ${err.requirement}`);
            });
        }

        console.log("\n🧪 Test Capabilities (Express)...");
        try {
            const newAccount = await stripe.accounts.create({
                type: 'express',
                country: 'FR',
            });
            console.log("✅ SUCCÈS ! (Ce n'est pas censé arriver si Connect est KO)");
            await stripe.accounts.del(newAccount.id);
        } catch (e: any) {
            console.log("❌ Test échoué (Normal) -> " + e.message);
        }

    } catch (error: any) {
        console.error("❌ Erreur critique : " + error.message);
    }
}

diagnose();

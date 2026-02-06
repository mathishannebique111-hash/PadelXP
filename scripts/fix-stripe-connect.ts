import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const envContent = fs.readFileSync('.env.local', 'utf8');
const manualKeyMatch = envContent.match(/STRIPE_SECRET_KEY=(sk_test_[a-zA-Z0-9]+)/);
const key = process.env.STRIPE_SECRET_KEY || (manualKeyMatch ? manualKeyMatch[1] : null);

if (!key) {
    console.error("❌ Aucune clé STRIPE_SECRET_KEY trouvée");
    process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });

console.log("=========================================");
console.log("🔧 ACTIVATION FORCÉE DE STRIPE CONNECT");
console.log("=========================================");

async function forceActivateConnect() {
    try {
        // 1. Récupérer le compte actuel
        const account = await stripe.account.retrieve();
        console.log(`\n📋 Compte : ${account.id}`);
        console.log(`   Email  : ${account.email}`);
        console.log(`   Type   : ${account.type || 'standard/platform'}`);

        // 2. Afficher les infos business_profile actuelles
        console.log("\n📊 Business Profile actuel :");
        console.log(`   Name : ${account.business_profile?.name || '❌ NON DÉFINI'}`);
        console.log(`   URL  : ${account.business_profile?.url || '❌ NON DÉFINI'}`);
        console.log(`   MCC  : ${account.business_profile?.mcc || '❌ NON DÉFINI'}`);

        // 3. Tenter de mettre à jour le business_profile
        console.log("\n🔄 Tentative de mise à jour du business_profile...");

        try {
            await stripe.accounts.update(account.id, {
                business_profile: {
                    name: "PadelXP",
                    url: "https://padelxp.eu",
                    mcc: "7941", // Sporting/recreational camps (Padel is a sport)
                },
            });
            console.log("   ✅ Mise à jour réussie !");
        } catch (updateError: any) {
            console.log(`   ⚠️  Mise à jour échouée : ${updateError.message}`);
        }

        // 4. Vérifier les settings actuels
        console.log("\n📊 Settings actuels :");
        console.log(`   Branding Icon  : ${account.settings?.branding?.icon || '❌ NON DÉFINI'}`);
        console.log(`   Branding Logo  : ${account.settings?.branding?.logo || '❌ NON DÉFINI'}`);
        console.log(`   Branding Color : ${account.settings?.branding?.primary_color || '❌ NON DÉFINI'}`);

        // 5. Tenter de créer un compte Express
        console.log("\n🧪 Test de création de compte Express...");
        try {
            const newAccount = await stripe.accounts.create({
                type: 'express',
                country: 'FR',
                email: `test-${Date.now()}@padelxp.eu`,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            console.log(`   ✅ SUCCÈS ! Compte créé : ${newAccount.id}`);
            console.log("   🎉 STRIPE CONNECT EST MAINTENANT ACTIF !");

            // Nettoyer le compte de test
            await stripe.accounts.del(newAccount.id);
            console.log("   🧹 Compte de test supprimé.");

        } catch (createError: any) {
            console.log(`   ❌ ÉCHEC : ${createError.message}`);

            if (createError.message.includes("signed up for Connect")) {
                console.log("\n" + "=".repeat(50));
                console.log("❌ DIAGNOSTIC FINAL : CONNECT N'EST PAS ACTIVÉ");
                console.log("=".repeat(50));
                console.log("\nLe problème est que le produit 'Stripe Connect' n'est");
                console.log("pas activé sur ce compte. C'est une configuration qui");
                console.log("ne peut se faire QUE via le Dashboard Stripe.");
                console.log("\n👉 URL directe : https://dashboard.stripe.com/test/connect/accounts/overview");
                console.log("\nSi cette URL affiche 'Dotez votre plateforme...',");
                console.log("vous devez CRÉER UN NOUVEAU COMPTE Stripe (gratuit)");
                console.log("car ce compte est dans un état buggé.");
            }
        }

    } catch (error: any) {
        console.error("❌ Erreur critique :", error.message);
    }
}

forceActivateConnect();

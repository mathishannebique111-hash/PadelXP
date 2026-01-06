#!/usr/bin/env node

/**
 * Script de vérification de la configuration Stripe
 * Usage: node check-stripe-config.js
 */

require('dotenv').config({ path: '.env.local' });

const requiredVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_QUARTERLY: process.env.STRIPE_PRICE_QUARTERLY,
  STRIPE_PRICE_ANNUAL: process.env.STRIPE_PRICE_ANNUAL,
};

console.log('\n🔍 Vérification de la configuration Stripe\n');
console.log('='.repeat(50));

let allGood = true;

// Vérifier STRIPE_SECRET_KEY
if (!requiredVars.STRIPE_SECRET_KEY) {
  console.log('❌ STRIPE_SECRET_KEY: MANQUANT');
  allGood = false;
} else if (!requiredVars.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.log('⚠️  STRIPE_SECRET_KEY: Présent mais ne commence pas par "sk_test_" (mode test)');
  console.log('   Valeur:', requiredVars.STRIPE_SECRET_KEY.substring(0, 10) + '...');
} else {
  console.log('✅ STRIPE_SECRET_KEY: Configuré (mode test)');
}

// Vérifier les Price IDs
const priceIds = {
  monthly: requiredVars.STRIPE_PRICE_MONTHLY,
  quarterly: requiredVars.STRIPE_PRICE_QUARTERLY,
  annual: requiredVars.STRIPE_PRICE_ANNUAL,
};

Object.entries(priceIds).forEach(([key, value]) => {
  const varName = `STRIPE_PRICE_${key.toUpperCase()}`;
  if (!value) {
    console.log(`❌ ${varName}: MANQUANT`);
    allGood = false;
  } else if (!value.startsWith('price_')) {
    console.log(`⚠️  ${varName}: Présent mais format invalide (doit commencer par "price_")`);
    console.log(`   Valeur: ${value}`);
    allGood = false;
  } else {
    console.log(`✅ ${varName}: Configuré`);
    console.log(`   Valeur: ${value}`);
  }
});

console.log('='.repeat(50));

if (allGood) {
  console.log('\n✅ Toutes les variables sont correctement configurées !');
  console.log('\n💡 Si vous avez toujours des erreurs :');
  console.log('   1. Redémarrez votre serveur (npm run dev)');
  console.log('   2. Vérifiez les logs du serveur pour voir les erreurs détaillées');
  console.log('   3. Vérifiez que les Price IDs existent dans Stripe Dashboard (mode test)\n');
} else {
  console.log('\n❌ Certaines variables sont manquantes ou incorrectes.');
  console.log('\n📝 Pour configurer :');
  console.log('   1. Ouvrez votre fichier .env.local');
  console.log('   2. Ajoutez les variables manquantes :');
  console.log('      STRIPE_PRICE_MONTHLY=price_xxxxx');
  console.log('      STRIPE_PRICE_QUARTERLY=price_xxxxx');
  console.log('      STRIPE_PRICE_ANNUAL=price_xxxxx');
  console.log('   3. Trouvez vos Price IDs sur : https://dashboard.stripe.com/test/products');
  console.log('   4. Redémarrez le serveur après modification\n');
}

process.exit(allGood ? 0 : 1);



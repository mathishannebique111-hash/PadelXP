import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/PageTitle";
import { getPlayerBoostStats } from "@/lib/utils/boost-utils";
import BoostPurchaseButton from "@/components/BoostPurchaseButton";
import { BOOST_PRICE_IDS, BOOST_PRICES } from "@/lib/config/boost-prices";

export const dynamic = "force-dynamic";

export default async function BoostPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Session requise</h1>
        <a className="text-blue-600 underline" href="/login">Se connecter</a>
      </div>
    );
  }

  const boostStats = await getPlayerBoostStats(user.id);

  // Debug: Vérifier les variables d'environnement directement et via BOOST_PRICE_IDS
  const directEnvVars = {
    x1: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1 || process.env.STRIPE_PRICE_PLAYER_BOOST || 'NOT SET',
    x5: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5 || 'NOT SET',
    x10: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10 || 'NOT SET',
  };
  const boostPriceIds = {
    x1: BOOST_PRICE_IDS.x1 || 'EMPTY',
    x5: BOOST_PRICE_IDS.x5 || 'EMPTY',
    x10: BOOST_PRICE_IDS.x10 || 'EMPTY',
  };
  
  // Debug: Vérifier les prix
  const directPriceVars = {
    x1: process.env.NEXT_PUBLIC_BOOST_PRICE_1 || 'NOT SET',
    x5: process.env.NEXT_PUBLIC_BOOST_PRICE_5 || 'NOT SET',
    x10: process.env.NEXT_PUBLIC_BOOST_PRICE_10 || 'NOT SET',
  };
  const boostPrices = {
    x1: BOOST_PRICES.x1,
    x5: BOOST_PRICES.x5,
    x10: BOOST_PRICES.x10,
  };
  
  console.log('[Boost Page] Direct env vars (Price IDs):', directEnvVars);
  console.log('[Boost Page] Direct env vars (Prices):', directPriceVars);
  console.log('[Boost Page] BOOST_PRICE_IDS:', boostPriceIds);
  console.log('[Boost Page] BOOST_PRICES:', boostPrices);
  console.log('[Boost Page] All NEXT_PUBLIC vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_STRIPE_PRICE') || k.startsWith('NEXT_PUBLIC_BOOST_PRICE')));

  // Vérifier que les Price IDs sont configurés
  const hasPriceIds = BOOST_PRICE_IDS.x1 && BOOST_PRICE_IDS.x5 && BOOST_PRICE_IDS.x10;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-20 md:pt-10 pb-10 text-white">
        <div className="mb-6">
          <PageTitle title="Boosts de Points" />
        </div>


        {/* Hero Section */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white bg-white p-6 text-center backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="mb-3 flex justify-center">
              <img 
                src="/images/Éclair%20boost.png" 
                alt="Éclair boost" 
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
              />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-900 text-center">Accélère ta montée au classement !</h2>
            <p className="text-sm text-gray-700 font-normal text-center max-w-2xl mx-auto">
              Un boost = <strong className="font-semibold text-gray-900">+30% de points</strong> sur ta prochaine victoire
            </p>
          </div>
        </div>

        {/* Purchase Section */}
        <div className="mb-6 rounded-2xl border border-white bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-8 sm:mb-10">
          <h3 className="mb-2 text-xl font-semibold text-white">Achète des boosts</h3>
          <p className="text-sm text-white/70 font-normal">
            Donne un coup d'accélérateur à ton classement !
          </p>
        </div>
        {!hasPriceIds && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-white/70 mb-2 font-normal">
              ⚠️ Les Price IDs Stripe ne sont pas configurés. Veuillez ajouter les variables d'environnement suivantes dans votre fichier <code className="px-1 py-0.5 bg-white/10 rounded text-white/80">.env.local</code> :
            </p>
            <ul className="ml-4 list-disc text-xs text-white/60 space-y-1 font-normal">
              <li><code className="text-white/70">NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1</code></li>
              <li><code className="text-white/70">NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5=price_1SUWLv3RWATPTiiq2HqRby7v</code></li>
              <li><code className="text-white/70">NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10=price_1SUWNE3RWATPTiiqMTwmOJUR</code></li>
            </ul>
            <p className="mt-2 text-xs text-white/60 font-normal">
              Puis redémarrez le serveur de développement.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 items-center justify-center">
          {/* Pack 1 boost - gauche */}
          <BoostPurchaseButton 
            quantity={1} 
            priceId={BOOST_PRICE_IDS.x1}
            price={BOOST_PRICES.x1}
          />
          
          {/* Pack 10 boosts - centre (MIS EN AVANT) */}
          <BoostPurchaseButton 
            quantity={10} 
            priceId={BOOST_PRICE_IDS.x10}
            price={BOOST_PRICES.x10}
            isFeatured={true}
            offerText="1 boost GRATUIT inclus !"
            oldPrice={7.89}
          />
          
          {/* Pack 5 boosts - droite */}
          <BoostPurchaseButton 
            quantity={5} 
            priceId={BOOST_PRICE_IDS.x5}
            price={BOOST_PRICES.x5}
          />
        </div>

        {/* Section garantie et réassurance */}
        <div className="mt-6 sm:mt-8 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs sm:text-sm text-white/80 font-normal">
            <span>✅ Paiement sécurisé par Stripe</span>
            <span>·</span>
            <span>Disponible immédiatement</span>
            <span>·</span>
            <span>Aucun abonnement</span>
          </div>
        </div>
      </div>

        {/* Stats Section */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white bg-white p-5 backdrop-blur-sm">
            <div className="mb-2 text-2xl font-bold text-green-400 tabular-nums">{boostStats.creditsAvailable}</div>
            <div className="text-xs text-gray-600 font-normal">Boosts disponibles</div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-5 backdrop-blur-sm">
            <div className="mb-2 text-2xl font-bold text-gray-900 tabular-nums">{boostStats.usedThisMonth}</div>
            <div className="text-xs text-gray-600 font-normal">Utilisés ce mois-ci</div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-5 backdrop-blur-sm">
            <div className="mb-2 text-2xl font-bold text-gray-900 tabular-nums">{boostStats.remainingThisMonth}</div>
            <div className="text-xs text-gray-600 font-normal">Restants ce mois</div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-white bg-white/5 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-xl font-semibold text-white">Comment ça marche ?</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-base">🎯</span>
            <div>
              <strong className="text-sm font-semibold text-white">Active un boost lors de l'enregistrement d'un match</strong>
              <p className="mt-1 text-xs text-white/60 font-normal">
                Tu peux cocher l'option "Appliquer un boost" avant d'enregistrer ton match.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-base">🏆</span>
            <div>
              <strong className="text-sm font-semibold text-white">Gagne +30% de points si tu gagnes</strong>
              <p className="mt-1 text-xs text-white/60 font-normal">
                Si tu gagnes le match, tu reçois 13 points au lieu de 10 (+30%).
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-base">📊</span>
            <div>
              <strong className="text-sm font-semibold text-white">Limite de 10 boosts par mois</strong>
              <p className="mt-1 text-xs text-white/60 font-normal">
                Pour garder le classement fair-play, tu peux utiliser maximum 10 boosts par mois.
              </p>
            </div>
          </li>
        </ul>
        </div>
      </div>
    </div>
  );
}


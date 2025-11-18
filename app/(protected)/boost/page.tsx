import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import { getPlayerBoostStats } from "@/lib/utils/boost-utils";
import BoostPurchaseButton from "@/components/BoostPurchaseButton";
import { BOOST_PRICE_IDS } from "@/lib/config/boost-prices";

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
  
  console.log('[Boost Page] Direct env vars:', directEnvVars);
  console.log('[Boost Page] BOOST_PRICE_IDS:', boostPriceIds);
  console.log('[Boost Page] All NEXT_PUBLIC vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_STRIPE_PRICE')));

  // Vérifier que les Price IDs sont configurés
  const hasPriceIds = BOOST_PRICE_IDS.x1 && BOOST_PRICE_IDS.x5 && BOOST_PRICE_IDS.x10;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Boosts de Points</h1>
        <LogoutButton />
      </div>


      {/* Hero Section */}
      <div className="mb-6 rounded-2xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-4 text-center backdrop-blur-sm">
        <div className="mb-2 text-4xl">⚡</div>
        <h2 className="mb-2 text-2xl font-semibold text-white">Accélère ta montée au classement !</h2>
        <p className="text-sm text-white/70">
          Un boost = <strong className="font-semibold text-blue-300">+30% de points</strong> sur ta prochaine victoire
        </p>
      </div>

      {/* Purchase Section */}
      <div className="mb-6 rounded-2xl border border-white/40 ring-1 ring-white/10 bg-gradient-to-br from-white/5 via-white/5 to-white/10 p-6 backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="mb-2 text-xl font-semibold text-white">Achète des boosts</h3>
          <p className="text-sm text-white/70">
            Les boosts sont utilisables immédiatement après l'achat. Ils n'expirent pas et peuvent être utilisés à tout moment.
          </p>
        </div>
        {!hasPriceIds && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 backdrop-blur-sm">
            <p className="text-xs text-yellow-200 mb-2">
              ⚠️ Les Price IDs Stripe ne sont pas configurés. Veuillez ajouter les variables d'environnement suivantes dans votre fichier <code className="px-1 py-0.5 bg-white/10 rounded">.env.local</code> :
            </p>
            <ul className="ml-4 list-disc text-xs text-yellow-300/90 space-y-1">
              <li><code>NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1</code></li>
              <li><code>NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5=price_1SUWLv3RWATPTiiq2HqRby7v</code></li>
              <li><code>NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10=price_1SUWNE3RWATPTiiqMTwmOJUR</code></li>
            </ul>
            <p className="mt-2 text-xs text-yellow-200/80">
              Puis redémarrez le serveur de développement.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-4">
          <BoostPurchaseButton 
            quantity={1} 
            priceId={BOOST_PRICE_IDS.x1}
            price={0.99}
          />
          <BoostPurchaseButton 
            quantity={5} 
            priceId={BOOST_PRICE_IDS.x5}
            price={4.95}
          />
          <BoostPurchaseButton 
            quantity={10} 
            priceId={BOOST_PRICE_IDS.x10}
            price={8.90}
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-2 text-2xl font-bold text-blue-300 tabular-nums">{boostStats.creditsAvailable}</div>
          <div className="text-xs text-white/70 font-normal">Boosts disponibles</div>
        </div>
        <div className="rounded-2xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-2 text-2xl font-bold text-purple-300 tabular-nums">{boostStats.usedThisMonth}</div>
          <div className="text-xs text-white/70 font-normal">Utilisés ce mois-ci</div>
        </div>
        <div className="rounded-2xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-2 text-2xl font-bold text-green-300 tabular-nums">{boostStats.remainingThisMonth}</div>
          <div className="text-xs text-white/70 font-normal">Restants ce mois</div>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-xl font-semibold text-white">Comment ça marche ?</h3>
        <ul className="space-y-3 text-white/70">
          <li className="flex items-start gap-3">
            <span className="text-base">🎯</span>
            <div>
              <strong className="text-sm font-semibold text-white">Active un boost lors de l'enregistrement d'un match</strong>
              <p className="mt-1 text-xs text-white/60">
                Tu peux cocher l'option "Appliquer un boost" avant d'enregistrer ton match.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-base">🏆</span>
            <div>
              <strong className="text-sm font-semibold text-white">Gagne +30% de points si tu gagnes</strong>
              <p className="mt-1 text-xs text-white/60">
                Si tu gagnes le match, tu reçois 13 points au lieu de 10 (+30%). Le boost n'est consommé que si tu gagnes.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-base">📊</span>
            <div>
              <strong className="text-sm font-semibold text-white">Limite de 10 boosts par mois</strong>
              <p className="mt-1 text-xs text-white/60">
                Pour garder le classement fair-play, tu peux utiliser maximum 10 boosts par mois.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}


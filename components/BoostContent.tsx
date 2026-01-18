import { createClient } from "@/lib/supabase/server";
import { getPlayerBoostStats } from "@/lib/utils/boost-utils";
import BoostPurchaseButton from "@/components/BoostPurchaseButton";
import { BOOST_PRICE_IDS, BOOST_PRICES } from "@/lib/config/boost-prices";
import { logger } from '@/lib/logger';
import Link from "next/link";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BoostContent() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 font-normal">
                <p>Vous devez être connecté pour accéder aux boosts.</p>
                <Link href="/login" className="text-blue-400 underline mt-2 inline-block">Se connecter</Link>
            </div>
        );
    }

    const boostStats = await getPlayerBoostStats(user.id);

    // Vérifier que les Price IDs sont configurés
    const hasPriceIds = BOOST_PRICE_IDS.x1 && BOOST_PRICE_IDS.x5 && BOOST_PRICE_IDS.x10;

    return (
        <div className="space-y-6">


            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-8 sm:mb-10 text-center md:text-left">
                    <h2 className="mb-1 text-xl font-semibold text-white">Accélère ta montée au classement !</h2>
                    <p className="text-sm text-white/70 font-normal">
                        Un boost = <strong className="font-semibold text-white">+30% de points</strong> sur ta prochaine victoire
                    </p>
                </div>
                {!hasPriceIds && (
                    <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                        <p className="text-xs text-white/70 mb-2 font-normal">
                            ⚠️ Les Price IDs Stripe ne sont pas configurés. Veuillez ajouter les variables d'environnement.
                        </p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 items-center justify-center">
                    {/* Pack 1 boost */}
                    <BoostPurchaseButton
                        quantity={1}
                        priceId={BOOST_PRICE_IDS.x1}
                        price={BOOST_PRICES.x1}
                    />

                    {/* Pack 10 boosts - featured */}
                    <BoostPurchaseButton
                        quantity={10}
                        priceId={BOOST_PRICE_IDS.x10}
                        price={BOOST_PRICES.x10}
                        isFeatured={true}
                        offerText="1 boost GRATUIT"
                        oldPrice={7.89}
                    />

                    {/* Pack 5 boosts */}
                    <BoostPurchaseButton
                        quantity={5}
                        priceId={BOOST_PRICE_IDS.x5}
                        price={BOOST_PRICES.x5}
                    />
                </div>

                {/* Section garantie */}
                <div className="mt-6 sm:mt-8 text-center">
                    <div className="flex items-center justify-center gap-2 flex-wrap text-xs sm:text-sm text-white/80 font-normal">
                        <span>Paiement sécurisé par Stripe</span>
                        <span>·</span>
                        <span>Disponible immédiatement</span>
                        <span>·</span>
                        <span>Aucun abonnement</span>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="rounded-2xl border border-white bg-white p-4 backdrop-blur-sm">
                <div className="grid grid-cols-3 gap-2 divide-x divide-gray-100">
                    <div className="text-center px-2">
                        <div className="mb-1 text-xl sm:text-2xl font-bold text-[#071554] tabular-nums">{boostStats.creditsAvailable}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 font-normal leading-tight">Boosts disponibles</div>
                    </div>
                    <div className="text-center px-2">
                        <div className="mb-1 text-xl sm:text-2xl font-bold text-[#071554] tabular-nums">{boostStats.usedThisMonth}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 font-normal leading-tight">Utilisés ce mois-ci</div>
                    </div>
                    <div className="text-center px-2">
                        <div className="mb-1 text-xl sm:text-2xl font-bold text-[#071554] tabular-nums">{boostStats.remainingThisMonth}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 font-normal leading-tight">Restants ce mois</div>
                    </div>
                </div>
            </div>

            {/* How it works */}
            <div className="rounded-2xl border border-white bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-xl font-semibold text-white">Comment ça marche ?</h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                        <div>
                            <strong className="text-sm font-semibold text-padel-green">Active un boost lors de l'enregistrement d'un match</strong>
                            <p className="mt-1 text-xs text-white font-normal">
                                Tu peux cocher l'option "Appliquer un boost" avant d'enregistrer ton match.
                            </p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <div>
                            <strong className="text-sm font-semibold text-padel-green">Gagne +30% de points si tu gagnes</strong>
                            <p className="mt-1 text-xs text-white font-normal">
                                Si tu gagnes le match, tu reçois 13 points au lieu de 10 (+30%).
                            </p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <div>
                            <strong className="text-sm font-semibold text-padel-green">Limite de 10 boosts par mois</strong>
                            <p className="mt-1 text-xs text-white font-normal">
                                Pour garder le classement fair-play, tu peux utiliser maximum 10 boosts par mois.
                            </p>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    );
}

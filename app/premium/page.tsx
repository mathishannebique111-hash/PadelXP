"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Trophy, Award, TrendingUp, Users, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { createPremiumCheckoutSession } from "@/app/actions/premium";
import { useAppleIAP } from "@/lib/hooks/useAppleIAP";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export default function PremiumPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>}>
            <PremiumContent />
        </Suspense>
    );
}

function PremiumContent() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isApp, loading: iapLoading, purchasePremium, restorePurchases, product } = useAppleIAP();

    const handleSubscribe = async () => {
        if (isApp) {
            purchasePremium();
            return;
        }

        try {
            setLoading(true);
            const returnPath = searchParams ? searchParams.get("returnPath") || "/home" : "/home";
            const result = await createPremiumCheckoutSession(returnPath);
            if (result?.url) {
                window.location.href = result.url;
            } else if (result?.error) {
                toast.error(`Erreur: ${result.error}`);
            } else {
                toast.error("Erreur lors de l'initialisation du paiement");
            }
        } catch (error: any) {
            toast.error(error.message || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    const isProcessing = loading || iapLoading;

    const features = [
        {
            icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />,
            title: "Statistiques avancées",
            description: "Analysez votre jeu avec des graphiques détaillés, suivez votre évolution et identifiez vos points forts."
        },
        {
            icon: <Award className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />,
            title: "Badges exclusifs",
            description: "Débloquez des badges uniques réservés aux membres Premium et montrez votre statut sur le terrain."
        },
        {
            icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />,
            title: "Challenges exclusifs",
            description: "Accédez à des défis spéciaux avec des récompenses plus importantes pour booster votre progression."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center font-sans">
            {/* Background Effects (Subtle) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] opacity-20" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] opacity-20" />
            </div>

            <div className="relative z-10 w-full h-[100dvh] max-w-md mx-auto flex flex-col pt-12 pb-6 px-6">

                {/* 1. Header Section - Fixed Top Area */}
                <div className="flex-none flex flex-col items-center w-full mb-4">
                    <div className="w-full flex items-center justify-between mb-2 absolute top-12 left-0 px-6 z-20">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 rounded-full bg-slate-800/50 text-white backdrop-blur-md active:scale-95 transition-transform"
                            aria-label="Retour"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="relative w-40 h-16 mt-8 mb-2">
                        <Image
                            src="/padelxp-logo-transparent.png"
                            alt="PadelXP Premium"
                            fill
                            className="object-contain"
                            style={{
                                filter: 'brightness(0) saturate(100%) invert(74%) sepia(58%) saturate(466%) hue-rotate(357deg) brightness(103%) contrast(107%) drop-shadow(0 0 10px rgba(245, 158, 11, 0.3))'
                            }}
                            priority
                        />
                    </div>
                </div>

                {/* 2. Main Title - Center Stage */}
                <div className="flex-none text-center mb-6">
                    <h1 className="text-3xl font-black text-white tracking-tighter leading-none">
                        PASSEZ AU NIVEAU <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">
                            SUPÉRIEUR
                        </span>
                    </h1>
                </div>

                {/* 3. Features List - Vertical Stack */}
                <div className="flex-1 flex flex-col justify-start space-y-5 px-2 overflow-y-auto no-scrollbar">
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 shrink-0 mt-0.5">
                                {feature.icon}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white leading-tight mb-0.5">{feature.title}</h3>
                                <p className="text-xs text-slate-400 leading-snug">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 4. CTA Section - Locked Bottom */}
                <div className="flex-none pt-4 mt-auto">
                    <div className="p-[1px] rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-amber-500/30 w-full mb-3">
                        <div className="bg-slate-900/90 backdrop-blur-xl rounded-[15px] p-4 border border-white/5 flex flex-col gap-3 items-center">

                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] uppercase font-black tracking-widest text-amber-500/80">ABONNEMENT MENSUEL</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-white">
                                        {isApp ? (product?.pricing?.price || "...") : "4.99€"}
                                    </span>
                                    {(!isApp || !product?.pricing?.price) && (
                                        <span className="text-sm font-medium text-slate-500">/mois</span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-black text-base shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Chargement...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>DÉMARRER MON PASS PREMIUM</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            {/* Restore and Legal Buttons */}
                            <div className="flex flex-col items-center gap-2 mt-1">
                                {isApp && (
                                    <button
                                        onClick={restorePurchases}
                                        className="text-[10px] text-slate-500 font-medium underline decoration-slate-700 underline-offset-2 hover:text-slate-300 transition-colors"
                                    >
                                        Déjà membre ? Restaurer mes achats
                                    </button>
                                )}
                                <div className="flex items-center gap-3">
                                    <Link href="/player/terms" className="text-[9px] text-slate-600 hover:text-slate-400 underline underline-offset-2">
                                        Conditions d'utilisation
                                    </Link>
                                    <Link href="/player/privacy" className="text-[9px] text-slate-600 hover:text-slate-400 underline underline-offset-2">
                                        Confidentialité
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-600 text-center font-medium">
                        Renouvellement automatique de 4.99€/mois • Annulation à tout moment dans iTunes
                    </p>
                </div>

            </div>
        </div>
    );
}

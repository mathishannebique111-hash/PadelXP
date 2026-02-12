"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
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
    const { isApp, loading: iapLoading, purchasePremium, restorePurchases } = useAppleIAP();

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
        },
        {
            icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />,
            title: "Ligues entre amis",
            description: "Créez et rejoignez des ligues privées pour vous mesurer à vos amis et collègues."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-center">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] opacity-30" />
            </div>

            <div className="relative z-10 w-full h-[100dvh] max-w-lg mx-auto flex flex-col pt-safe-top pb-safe-bottom px-4">

                {/* 1. Header Section - Flex Shrink but clear hierarchy */}
                <div className="flex-none pt-2 flex flex-col items-center justify-center relative min-h-[15%]">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-0 top-3 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors z-20"
                    >
                        <ArrowLeft className="w-5 h-5 sm:w-6 h-6" />
                    </button>

                    <div className="relative w-32 h-10 sm:w-40 sm:h-12 mb-1">
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

                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-0.5 text-center">
                        Passez au niveau <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">
                            Supérieur
                        </span>
                    </h1>
                </div>

                {/* 2. Main Content - Features Grid - Grows to fill available space */}
                <div className="flex-1 flex flex-col justify-center py-2 min-h-0">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full max-h-[50vh]">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="group p-3 sm:p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 transition-all flex flex-col items-center text-center justify-center h-full"
                            >
                                <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center mb-1.5 shrink-0 group-hover:scale-110 transition-transform">
                                    <div className="text-amber-400 flex items-center justify-center">
                                        {feature.icon}
                                    </div>
                                </div>
                                <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5 leading-tight">{feature.title}</h3>
                                <p className="text-[10px] sm:text-xs text-slate-400 leading-tight line-clamp-3 overflow-hidden">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. CTA Section - Locked at Bottom with Safe Area */}
                <div className="flex-none pb-4 pt-2">
                    <div className="p-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 w-full">
                        <div className="bg-slate-950 rounded-[14px] p-4 sm:p-5 border border-amber-500/20 flex flex-col gap-3">

                            <div className="flex flex-col items-center justify-center -mb-1">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl sm:text-4xl font-black text-white">4.99€</span>
                                    <span className="text-slate-500 font-medium text-xs sm:text-sm">/mois</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Sans engagement. Annulable à tout moment.</p>
                            </div>

                            <button
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                                className="w-full group px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold text-sm sm:text-base shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Chargement...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Je veux y accéder</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            {isApp && (
                                <button
                                    onClick={restorePurchases}
                                    className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 underline transition-colors -mt-1"
                                >
                                    Déjà membre ? Restaurer mes achats
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

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

                {/* 1. Header Section - Clear and Visible */}
                <div className="flex-none pt-6 flex flex-col items-center justify-center relative min-h-[15%] w-full">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-0 top-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50 backdrop-blur-md"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    <div className="relative w-48 h-16 sm:w-56 sm:h-20 mb-2 mt-4">
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

                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none text-center sr-only">
                        Passez au niveau Supérieur
                    </h1>
                </div>

                {/* 2. Main Content - List of Features (No Cards, Stacked) */}
                <div className="flex-1 flex flex-col justify-center py-4 min-h-0 w-full max-w-sm mx-auto">
                    <div className="flex flex-col space-y-6">
                        {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-4 text-left">
                                <div className="mt-0.5 shrink-0">
                                    {feature.icon}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-1">{feature.title}</h3>
                                    <p className="text-xs sm:text-sm text-slate-400 leading-snug">{feature.description}</p>
                                </div>
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

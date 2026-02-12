"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { Sparkles, Trophy, Award, TrendingUp, Users, Check, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
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
            icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
            title: "Statistiques avancées",
            description: "Analysez votre jeu avec des graphiques détaillés, suivez votre évolution et identifiez vos points forts."
        },
        {
            icon: <Award className="w-6 h-6 text-yellow-400" />,
            title: "Badges exclusifs",
            description: "Débloquez des badges uniques réservés aux membres Premium et montrez votre statut sur le terrain."
        },
        {
            icon: <Trophy className="w-6 h-6 text-amber-500" />,
            title: "Challenges exclusifs",
            description: "Accédez à des défis spéciaux avec des récompenses plus importantes pour booster votre progression."
        },
        {
            icon: <Users className="w-6 h-6 text-emerald-400" />,
            title: "Ligues entre amis",
            description: "Créez et rejoignez des ligues privées pour vous mesurer à vos amis et collègues."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-4 py-8 sm:py-12">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] opacity-30" />
            </div>

            <div className="relative z-10 max-w-4xl w-full mx-auto text-center space-y-4 sm:space-y-6">

                {/* Header with Back Button and Logo */}
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="absolute left-0 top-0 p-1.5 sm:p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-5 h-5" />
                    </button>

                    {/* Gold Logo PadelXP */}
                    <div className="mb-2 sm:mb-4 relative w-32 h-8 sm:w-48 h-12">
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

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                        Passez au niveau <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">
                            Supérieur
                        </span>
                    </h1>

                    <p className="text-[11px] sm:text-sm md:text-base text-slate-400 max-w-lg mx-auto leading-relaxed mt-1 sm:mt-2">
                        Débloquez tout le potentiel de PadelXP. Plus de statistiques, plus de fun, plus de compétition.
                    </p>
                </div>

                {/* Features Grid - 2x2 on ALL screens for ultra-compactness if needed, or mobile first */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-left animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className="group p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 transition-all hover:bg-slate-900/80 hover:shadow-lg hover:shadow-amber-900/10 flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-3"
                        >
                            <div className="w-8 h-8 sm:w-10 h-10 rounded-lg sm:rounded-xl bg-slate-800/50 border border-slate-700/50 flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                {/* Force Gold Color for all icons */}
                                <div className="text-amber-400">
                                    {feature.icon.props?.children ? feature.icon : <feature.icon.type {...feature.icon.props} className="w-4 h-4 sm:w-5 h-5 text-amber-400" />}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[11px] sm:text-sm font-bold text-white mb-0.5">{feature.title}</h3>
                                <p className="text-[10px] sm:text-xs text-slate-400 leading-tight hidden sm:block">{feature.description}</p>
                                {/* Moblie very short desc or visible */}
                                <p className="text-[9px] text-slate-500 leading-tight sm:hidden line-clamp-2">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA Section - Compact */}
                <div className="pt-2 sm:pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 pb-4 sm:pb-8">
                    <div className="p-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 inline-block w-full max-w-sm">
                        <div className="bg-slate-950 rounded-[14px] p-4 sm:p-5 border border-amber-500/20">
                            <div className="flex items-baseline justify-center gap-1 mb-0.5 sm:mb-1">
                                <span className="text-2xl sm:text-3xl font-black text-white">0.01€</span>
                                <span className="text-slate-500 font-medium text-xs sm:text-sm">/mois</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400 mb-3 sm:mb-4">Sans engagement. Annulable à tout moment.</p>

                            <button
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                                className="w-full group px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-amber-900/20 hover:shadow-amber-900/40 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
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
                                    className="mt-4 text-[10px] sm:text-xs text-slate-500 hover:text-slate-400 underline transition-colors"
                                >
                                    Restaurer mes achats
                                </button>
                            )}

                            <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 sm:gap-3 text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                                <span className="flex items-center gap-1 min-w-max"><Check className="w-2 h-2 sm:w-2.5 h-2.5 text-amber-500" /> Paiement sécurisé</span>
                                <span className="flex items-center gap-1 min-w-max"><Check className="w-2 h-2 sm:w-2.5 h-2.5 text-amber-500" /> Accès immédiat</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

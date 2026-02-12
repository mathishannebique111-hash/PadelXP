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



    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-4 py-8 sm:py-12">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] opacity-30" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto h-[100dvh] flex flex-col px-4 pt-safe-top pb-safe-bottom">

                {/* 1. Header Section - Compact but Impactful */}
                <div className="flex-none pt-2 relative flex flex-col items-center">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-0 top-3 p-2 rounded-full bg-slate-800/40 text-slate-300 backdrop-blur-sm border border-slate-700/30 active:scale-95 transition-all z-20"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="relative w-32 h-12 mb-1 opacity-90">
                        <Image
                            src="/padelxp-logo-transparent.png"
                            alt="PadelXP"
                            fill
                            className="object-contain"
                            style={{ filter: 'brightness(0) invert(1)' }}
                            priority
                        />
                    </div>

                    <h1 className="text-3xl font-black text-center leading-none tracking-tight mb-2">
                        <span className="text-white drop-shadow-lg">PASSEZ </span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-sm">GOLD</span>
                    </h1>
                </div>

                {/* 2. Main Content - Features Grid in Center */}
                <div className="flex-1 flex flex-col justify-center py-2 space-y-3 min-h-0">
                    {/* Hero Benefit */}
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-900/20 shrink-0">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-tight">Statistiques Pro</h3>
                                <p className="text-xs text-slate-300 leading-snug mt-1">Analysez votre jeu comme un pro avec des graphiques détaillés.</p>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Benefits Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: Trophy, title: "Tournois", desc: "Création illimitée" },
                            { icon: Users, title: "Ligues", desc: "Invitez vos amis" },
                            { icon: Award, title: "Badges", desc: "Collection exclusive" },
                            { icon: Sparkles, title: "Prioritaire", desc: "Support client" }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 flex flex-col gap-2 hover:bg-slate-800/40 transition-colors">
                                <item.icon className="w-5 h-5 text-amber-500" />
                                <div>
                                    <div className="font-bold text-sm text-slate-200">{item.title}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. CTA Section - Locked at Bottom */}
                <div className="flex-none pb-4 pt-2">
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-[20px] p-1 border border-slate-800 shadow-2xl">
                        <div className="bg-slate-950/50 rounded-[16px] p-4 text-center border border-white/5">
                            <div className="flex flex-col items-center justify-center mb-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-white tracking-tight">4.99€</span>
                                    <span className="text-sm font-medium text-slate-500">/mois</span>
                                </div>
                                <div className="text-[10px] text-amber-500/80 font-medium tracking-wide uppercase mt-1 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-900/30">
                                    Sans engagement
                                </div>
                            </div>

                            <button
                                onClick={handleSubscribe}
                                disabled={isProcessing}
                                className="w-full relative overflow-hidden group bg-white hover:bg-slate-50 active:bg-slate-200 text-black font-black text-lg py-3.5 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all transform active:scale-[0.98]"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                                            <span className="text-slate-600">Chargement...</span>
                                        </>
                                    ) : (
                                        <>
                                            JE PASSE GOLD
                                            <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                                        </>
                                    )}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            </button>

                            {isApp && (
                                <button onClick={restorePurchases} className="mt-3 text-[10px] text-slate-600 font-medium hover:text-white transition-colors">
                                    Déjà membre ? Restaurer les achats
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-600 text-center mt-2 font-medium">
                        Paiement sécurisé par Apple • Annulation à tout moment
                    </p>
                </div>

            </div>
        </div>
    );
}

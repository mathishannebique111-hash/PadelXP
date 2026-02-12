"use client";

import { useState, Suspense } from "react";
import { Sparkles, Trophy, Award, TrendingUp, Users, Check, ArrowRight, Loader2 } from "lucide-react";
import { createPremiumCheckoutSession } from "@/app/actions/premium";
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

    const handleSubscribe = async () => {
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
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-4 py-12">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] opacity-30" />
            </div>

            <div className="relative z-10 max-w-4xl w-full mx-auto text-center space-y-12">

                {/* Header */}
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 mb-4">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Offre Premium</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                        Passez au niveau <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">
                            Supérieur
                        </span>
                    </h1>

                    <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Débloquez tout le potentiel de PadelXP. Plus de statistiques, plus de fun, plus de compétition.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className="group p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 transition-all hover:bg-slate-900/80 hover:shadow-2xl hover:shadow-amber-900/10"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 inline-block">
                        <div className="bg-slate-950 rounded-xl p-6 sm:p-8 border border-amber-500/20 max-w-md mx-auto">
                            <div className="flex items-baseline justify-center gap-1 mb-2">
                                <span className="text-4xl font-black text-white">0.01€</span>
                                <span className="text-slate-500 font-medium">/mois</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-6">Sans engagement. Annulable à tout moment.</p>

                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className="w-full group px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold text-lg shadow-xl shadow-amber-900/20 hover:shadow-amber-900/40 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Chargement...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Je veux y accéder</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Paiement sécurisé</span>
                                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Accès immédiat</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

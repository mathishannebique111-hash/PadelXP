"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Crown, Loader2, Trophy, Skull, Heart, Calendar, ArrowRight, Sparkles, Clock, Swords } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { getPremiumStatsData } from "@/app/actions/premium";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface PremiumData {
    evolution: { date: string; points: number; level: number }[];
    topVictims: any[];
    topNemesis: any[];
    topPartners: any[];
    insights: {
        luckyDay: { name: string; winrate: number };
        bestMonth: { name: string; winrate: number };
        goldenHour: { name: string; winrate: number };
        currentForm: number;
        reaction: { opportunities: number; success: number; rate: number };
        levelPerformance: {
            stronger: { label: string; wins: number; total: number };
            weaker: { label: string; wins: number; total: number };
            equal: { label: string; wins: number; total: number };
        };
    };
}

type TimeRange = '1W' | '1M' | '1Y' | 'ALL';

export default function PremiumStats() {
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [statsData, setStatsData] = useState<PremiumData | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('1W');
    const router = useRouter();

    useEffect(() => {
        checkPremiumAndFetchStats();
    }, []);

    async function checkPremiumAndFetchStats() {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("is_premium")
                    .eq("id", user.id)
                    .single();

                const premiumStatus = profile?.is_premium || false;
                setIsPremium(premiumStatus);

                if (premiumStatus) {
                    const data = await getPremiumStatsData();
                    if (data) {
                        setStatsData(data as any);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleUpgrade = () => {
        router.push(`/premium?returnPath=${window.location.pathname}`);
    };

    if (loading) return <div className="p-8 text-slate-500 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

    if (!isPremium) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-center mt-6 shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-5 shadow-lg">
                        <Crown className="w-7 h-7 text-yellow-500 fill-yellow-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Passez au niveau supérieur</h2>
                    <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
                        Débloquez l'analyse détaillée de vos performances : évolution, performance par adversaire, quels sont vos meilleurs jours et heures pour performer... et pleins d'autres données !
                    </p>
                    <button
                        onClick={handleUpgrade}
                        className="group px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-900/20 hover:shadow-amber-900/40 hover:scale-[1.02] transition-all flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Devenir premium
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-[10px] text-slate-600 mt-4">Sans engagement.</p>
                </div>
            </div>
        );
    }

    // Filter Logic
    const fullEvolution = statsData?.evolution || [];
    let filteredEvolution = fullEvolution;

    const now = new Date();
    if (timeRange === '1W') {
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredEvolution = fullEvolution.filter(d => new Date(d.date) >= cutoff);
    } else if (timeRange === '1M') {
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredEvolution = fullEvolution.filter(d => new Date(d.date) >= cutoff);
    } else if (timeRange === '1Y') {
        const cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filteredEvolution = fullEvolution.filter(d => new Date(d.date) >= cutoff);
    }

    const chartLabels = filteredEvolution.map(d => new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
    const chartValues = filteredEvolution.map(d => d.level);

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: "Niveau",
                data: chartValues,
                fill: true,
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    if (!ctx) return "rgba(59, 130, 246, 0.1)"; // Blue tint
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, "rgba(59, 130, 246, 0.2)");
                    gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
                    return gradient;
                },
                borderColor: "#3b82f6", // Blue-500
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#0f172a",
                pointBorderColor: "#3b82f6",
                pointBorderWidth: 2,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: "index" as const,
                intersect: false,
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                titleColor: "#94a3b8",
                bodyColor: "#fff",
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: function (context: any) {
                        return `Niveau : ${context.parsed.y.toFixed(2)}`;
                    }
                }
            },
        },
        scales: {
            y: {
                display: true,
                grid: { color: "rgba(255,255,255,0.05)" },
                ticks: { color: "rgba(148, 163, 184, 0.8)", font: { size: 10, family: 'Inter' } },
                suggestedMin: 0,
                suggestedMax: 10,
            },
            x: {
                display: true,
                grid: { display: false },
                ticks: { color: "rgba(148, 163, 184, 0.8)", font: { size: 10, family: 'Inter' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
            },
        },
    };

    const renderList = (title: string, icon: any, list: any[], colorClass: string, emptyMessage: string) => {
        if (!list || list.length === 0) return null;

        const isPartners = title === "Partenaires Favoris";
        const isVictims = title === "Mes Victimes";
        const isNemesis = title === "Mes Bourreaux";

        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full relative overflow-hidden group hover:border-[#CCFF00]/20 transition-all">
                <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#CCFF00] to-transparent opacity-20`}></div>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-100 uppercase tracking-wide">
                    <span className={`p-1.5 rounded-md bg-slate-800/50 border border-slate-700/50 ${colorClass}`}>{icon}</span>
                    {title}
                </h3>
                <div className="space-y-3 flex-1">
                    {list.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between group p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all">
                                    {item.avatar_url ? <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-200 text-sm font-semibold truncate max-w-[120px]">{item.name}</span>
                                    <span className="text-[10px] text-slate-500">{item.winrate}% de réussite</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-slate-700 transition-colors`}>
                                    {isPartners ? `${item.count} matchs` :
                                        isVictims ? `${item.count} vict. / ${item.total} matchs` :
                                            `${item.count} déf. / ${item.total} matchs`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 mt-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Statistiques Premium
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Analyse détaillée de vos performances</p>
                </div>

                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-sm">
                    {['1W', '1M', '1Y', 'ALL'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as TimeRange)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === range
                                ? "bg-slate-800 text-white shadow-md border border-slate-700"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                }`}
                        >
                            {range === '1W' ? '7J' : range === '1M' ? '30J' : range === '1Y' ? '1 AN' : 'TOUT'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Evolution Chart - Premium Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                Évolution du niveau
                            </h3>
                            <p className="text-xs text-slate-500">Votre progression sur la période</p>
                        </div>
                        {filteredEvolution.length > 0 && (
                            <div className="text-right bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                                <div className="text-2xl font-black text-white">{filteredEvolution[filteredEvolution.length - 1].level.toFixed(2)}</div>
                                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Niveau Actuel</div>
                            </div>
                        )}
                    </div>

                    {filteredEvolution.length > 0 ? (
                        <div className="h-[250px] w-full">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    ) : (
                        <div className="h-[250px] flex flex-col items-center justify-center text-slate-600 gap-3 border border-dashed border-slate-800 rounded-xl bg-slate-800/20">
                            <TrendingUp className="w-10 h-10 opacity-20" />
                            <p className="text-sm font-medium">Pas assez de données sur cette période</p>
                            <button onClick={() => setTimeRange('ALL')} className="text-xs text-blue-400 font-bold hover:text-blue-300 hover:underline">Voir tout l'historique</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Insights Cards - Premium Grid */}
            {/* Temporal Glory Section - Grouped */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Mes Succès
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    {/* Jour de Gloire */}
                    <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg group hover:border-blue-500/30 transition-all">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Jour de Gloire</span>
                        <span className="text-[10px] text-slate-500 mb-3">Taux de victoire max</span>
                        <span className="text-2xl font-black text-white group-hover:scale-105 transition-transform duration-300">{statsData?.insights?.luckyDay?.name || "-"}</span>
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <span className="text-[10px] text-blue-400 font-bold">{statsData?.insights?.luckyDay?.winrate || 0}% victoires</span>
                        </div>
                    </div>

                    {/* Heures de Gloire */}
                    <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg group hover:border-blue-500/30 transition-all">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Heures de Gloire</span>
                        <span className="text-[10px] text-slate-500 mb-3">Taux de victoire max</span>
                        <span className="text-xl font-black text-white group-hover:scale-105 transition-transform duration-300 px-2 line-clamp-1">{statsData?.insights?.goldenHour?.name || "-"}</span>
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <span className="text-[10px] text-blue-400 font-bold">{statsData?.insights?.goldenHour?.winrate || 0}% victoires</span>
                        </div>
                    </div>

                    {/* Meilleur Mois */}
                    <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg group hover:border-blue-500/30 transition-all">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                            <Trophy className="w-5 h-5 text-blue-300" />
                        </div>
                        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Meilleur Mois</span>
                        <span className="text-[10px] text-slate-500 mb-3">Période optimale</span>
                        <span className="text-xl font-black text-white group-hover:scale-105 transition-transform duration-300">{statsData?.insights?.bestMonth?.name || "-"}</span>
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <span className="text-[10px] text-blue-300 font-bold">{statsData?.insights?.bestMonth?.winrate || 0}% victoires</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form and Reaction Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Current Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Forme (5 derniers)</span>
                    <span className="text-[10px] text-slate-500 mb-3">% victoires sur les 5 derniers</span>
                    <span className={`text-4xl font-black group-hover:scale-110 transition-transform duration-300 mb-1 text-white`}>
                        {statsData?.insights?.currentForm || 0}%
                    </span>
                    <div className={`mt-1 h-1 w-16 rounded-full ${(statsData?.insights?.currentForm || 0) >= 60 ? "bg-emerald-500" :
                        (statsData?.insights?.currentForm || 0) >= 40 ? "bg-blue-500" : "bg-amber-500"
                        }`}></div>
                </div>

                {/* Reaction Capacity */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden group hover:border-blue-500/30 transition-all sm:col-span-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <Swords className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Capacité de Réaction</span>
                    <span className="text-[10px] text-slate-500 mb-3">Victoires après perte du 1er set</span>

                    <div className="flex items-center gap-6 mt-1">
                        <span className="text-4xl font-black text-white group-hover:scale-110 transition-transform duration-300">{statsData?.insights?.reaction?.rate || 0}%</span>
                        <div className="h-8 w-[1px] bg-slate-800"></div>
                        <div className="flex flex-col items-start text-left">
                            <span className="text-xs text-slate-300 font-bold">{statsData?.insights?.reaction?.success || 0} remontadas</span>
                            <span className="text-[10px] text-slate-500">sur {statsData?.insights?.reaction?.opportunities || 0} opportunités</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance vs Level Section */}
            {(statsData?.insights?.levelPerformance) && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                        <Swords className="w-5 h-5 text-slate-400" />
                        Performance par adversaire
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                        {[
                            { key: 'weaker', color: 'text-emerald-400', barGradient: 'from-emerald-600 to-emerald-400', label: 'vs Plus Faible', icon: <ArrowRight className="w-3 h-3 rotate-45 text-emerald-400" /> },
                            { key: 'equal', color: 'text-blue-400', barGradient: 'from-blue-600 to-blue-400', label: 'vs Niveau Équivalent', icon: <ArrowRight className="w-3 h-3 text-blue-400" /> },
                            { key: 'stronger', color: 'text-amber-400', barGradient: 'from-amber-600 to-amber-400', label: 'vs Plus Fort', icon: <ArrowRight className="w-3 h-3 -rotate-45 text-amber-400" /> }
                        ].map((item) => {
                            // @ts-ignore
                            const stat = statsData?.insights?.levelPerformance?.[item.key] || { wins: 0, total: 0 };
                            const winrate = stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0;
                            return (
                                <div key={item.key} className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30 backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            {item.icon}
                                            <span className="text-xs text-slate-300 font-bold uppercase tracking-wide">{item.label}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-end gap-2 mb-3">
                                        <span className={`text-3xl font-black ${item.color}`}>{winrate}%</span>
                                        <span className="text-[10px] text-slate-500 font-medium mb-1.5">de réussite</span>
                                    </div>

                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r ${item.barGradient} rounded-full`} style={{ width: `${winrate}%` }}></div>
                                    </div>

                                    <div className="text-[10px] text-slate-400 mt-2 font-medium flex justify-between">
                                        <span>{stat.wins} victoires</span>
                                        <span className="text-slate-600">/</span>
                                        <span>{stat.total} matchs</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Lists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderList("Mes Victimes", <Trophy className="w-4 h-4 text-[#CCFF00]" />, statsData?.topVictims || [], "text-[#CCFF00] border-[#CCFF00]/20 bg-[#CCFF00]/10", "Vous n'avez pas encore gagné contre d'autres joueurs.")}
                {renderList("Mes Bourreaux", <Skull className="w-4 h-4 text-[#CCFF00]" />, statsData?.topNemesis || [], "text-[#CCFF00] border-[#CCFF00]/20 bg-[#CCFF00]/10", "Vous n'avez pas encore perdu contre d'autres joueurs.")}
                {renderList("Partenaires Favoris", <Heart className="w-4 h-4 text-[#CCFF00]" />, statsData?.topPartners || [], "text-[#CCFF00] border-[#CCFF00]/20 bg-[#CCFF00]/10", "Jouez des matchs pour voir vos partenaires.")}
            </div>
        </div>
    );
}

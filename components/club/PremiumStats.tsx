"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Loader2, Trophy, Skull, Heart, Calendar, ArrowRight, Sparkles, Clock, Swords } from "lucide-react";
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
    ScriptableContext,
} from "chart.js";
import { getPremiumStatsData } from "@/app/actions/premium";
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

interface PlayerStat {
    name: string;
    winrate: number;
    count: number;
    total?: number;
    avatar_url?: string;
}

interface PremiumData {
    evolution: { date: string; points: number; level: number }[];
    topVictims: PlayerStat[];
    topNemesis: PlayerStat[];
    topPartners: PlayerStat[];
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
    const [statsData, setStatsData] = useState<PremiumData | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('1W');
    const [successTab, setSuccessTab] = useState<'day' | 'hour' | 'month'>('day');
    const [performanceTab, setPerformanceTab] = useState<'weaker' | 'equal' | 'stronger'>('weaker');
    const [listTab, setListTab] = useState<'victims' | 'nemesis' | 'partners'>('victims');
    const [formTab, setFormTab] = useState<'form' | 'reaction'>('form');
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

                // Toujours charger les données (le serveur s'occupe de masquer si pas premium)
                const data = await getPremiumStatsData();
                if (data) {
                    setStatsData(data as PremiumData);
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

    const renderList = (title: string, icon: React.ReactNode, list: PlayerStat[], colorClass: string) => {
        if (!list || list.length === 0) return null;

        const isPartners = title === "Partenaires Favoris";
        const isVictims = title === "Mes Victimes";
        const isNemesis = title === "Mes Bourreaux";

        // Filter list: show up to 5
        const displayList = list.slice(0, 5);

        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full relative overflow-hidden group hover:border-[#CCFF00]/20 transition-all">
                <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#CCFF00] to-transparent opacity-20`}></div>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-100 uppercase tracking-wide">
                    <span className={`p-1.5 rounded-md bg-slate-800/50 border border-slate-700/50 ${colorClass}`}>{icon}</span>
                    {title}
                </h3>
                <div className="space-y-3 flex-1 relative">
                    {displayList.map((item, idx) => {
                        const isBlurred = !isPremium && idx < 3;
                        return (
                            <div key={idx} className={`flex items-center justify-between group p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-slate-800 ${isBlurred ? 'blur-lg opacity-30 pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all">
                                        {item.avatar_url ? <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" /> : null}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-slate-200 text-sm font-semibold truncate">{item.name}</span>
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
                        );
                    })}

                    {!isPremium && displayList.length > 0 && (
                        <div className="absolute inset-0 flex items-start justify-center pt-4 z-20 pointer-events-none">
                            <div className="bg-[#071554] border-2 border-[#CCFF00] p-6 rounded-2xl shadow-[0_0_30px_rgba(204,255,0,0.2)] flex flex-col items-center text-center w-[90%] sm:w-auto sm:max-w-md pointer-events-auto backdrop-blur-md">
                                <Sparkles className="w-6 h-6 text-[#CCFF00] mb-3 animate-pulse" />
                                <p className="text-sm sm:text-base text-white font-black leading-tight mb-4 uppercase tracking-tight">
                                    {isVictims ? `Ta meilleure victime est ${list[0].name}` :
                                        isNemesis ? `Ton pire cauchemar est ${list[0].name}` :
                                            `Ton partenaire favori est ${list[0].name}`}
                                </p>
                                <button
                                    onClick={handleUpgrade}
                                    className="w-full sm:w-auto bg-[#CCFF00] text-[#071554] px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(204,255,0,0.3)] flex items-center justify-center gap-2"
                                >
                                    découvre qui c&apos;est
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

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
                backgroundColor: (context: ScriptableContext<'line'>) => {
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
                    label: function (context: { parsed: { y: number } }) {
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

    return (
        <div className="space-y-8 mt-10 relative">

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

            {/* Section 1: Evolution du niveau */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden group">
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
                            <div className={`text-right bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-sm ${!isPremium ? 'blur-md' : ''}`}>
                                <div className="text-2xl font-black text-white">{filteredEvolution[filteredEvolution.length - 1].level.toFixed(2)}</div>
                                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Niveau Actuel</div>
                            </div>
                        )}
                    </div>

                    <div className={`transition-all duration-700 ${!isPremium ? 'blur-xl select-none pointer-events-none opacity-40 scale-[0.98]' : ''}`}>
                        {filteredEvolution.length > 0 ? (
                            <div className="h-[250px] w-full">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <div className="h-[250px] flex flex-col items-center justify-center text-slate-600 gap-3 border border-dashed border-slate-800 rounded-xl bg-slate-800/20">
                                <TrendingUp className="w-10 h-10 opacity-20" />
                                <p className="text-sm font-medium">Pas assez de données sur cette période</p>
                                <button onClick={() => setTimeRange('ALL')} className="text-xs text-blue-400 font-bold hover:text-blue-300 hover:underline">Voir tout l&apos;historique</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 2: Performance par adversaire (REPLACED AS REQUESTED) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Swords className="w-5 h-5 text-slate-400" />
                    Performance par adversaire
                </h3>

                {/* List Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                    {[
                        { id: 'victims', label: 'Mes Victimes' },
                        { id: 'nemesis', label: 'Mes Bourreaux' },
                        { id: 'partners', label: 'Partenaires Favoris' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setListTab(tab.id as 'victims' | 'nemesis' | 'partners')}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${listTab === tab.id
                                ? "bg-[#CCFF00] text-[#172554] border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative z-10 min-h-[300px]">
                    {listTab === 'victims' && renderList("Mes Victimes", <Trophy className="w-4 h-4 text-[#CCFF00]" />, statsData?.topVictims || [], "text-[#CCFF00] border-[#CCFF00]/20 bg-[#CCFF00]/10")}
                    {listTab === 'nemesis' && renderList("Mes Bourreaux", <Skull className="w-4 h-4 text-[#CCFF00]" />, statsData?.topNemesis || [], "text-[#CCFF00] border-[#CCFF00]/20 bg-[#CCFF00]/10")}
                    {listTab === 'partners' && renderList("Partenaires Favoris", <Heart className="w-4 h-4 text-[#CCFF00]" />, statsData?.topPartners || [], "text-[#CCFF00] border-[#CCFF00]/20 bg-[#CCFF00]/10")}
                </div>

                <div className="h-[1px] w-full bg-slate-800/50 my-8 relative z-10" />

                {/* Level Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                    {[
                        { id: 'weaker', label: 'vs Plus Faible' },
                        { id: 'equal', label: 'vs Niveau Équivalent' },
                        { id: 'stronger', label: 'vs Plus Fort' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setPerformanceTab(tab.id as 'weaker' | 'equal' | 'stronger')}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${performanceTab === tab.id
                                ? "bg-[#CCFF00] text-[#172554] border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className={`relative z-10 mb-8 transition-all ${!isPremium ? 'blur-xl opacity-40' : ''}`}>
                    {(() => {
                        const items = [
                            { key: 'weaker', color: 'text-emerald-400', barGradient: 'from-emerald-600 to-emerald-400', label: 'vs Plus Faible', icon: <ArrowRight className="w-3 h-3 rotate-45 text-emerald-400" /> },
                            { key: 'equal', color: 'text-blue-400', barGradient: 'from-blue-600 to-blue-400', label: 'vs Niveau Équivalent', icon: <ArrowRight className="w-3 h-3 text-blue-400" /> },
                            { key: 'stronger', color: 'text-amber-400', barGradient: 'from-amber-600 to-amber-400', label: 'vs Plus Fort', icon: <ArrowRight className="w-3 h-3 -rotate-45 text-amber-400" /> }
                        ];
                        const item = items.find(i => i.key === performanceTab)!;

                        // @ts-expect-error levelPerformance might be undefined
                        const stat = statsData?.insights?.levelPerformance?.[item.key] || { wins: 0, total: 0 };
                        const winrate = stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0;

                        return (
                            <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30 backdrop-blur-md max-w-xl">
                                <div className="flex items-end gap-2 mb-4">
                                    <span className={`text-4xl font-black ${item.color}`}>{winrate}%</span>
                                    <span className="text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">de réussite</span>
                                </div>
                                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden mb-4">
                                    <div className={`h-full bg-gradient-to-r ${item.barGradient} rounded-full transition-all duration-700`} style={{ width: `${winrate}%` }}></div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium flex justify-between">
                                    <span>{stat.wins} victoires</span>
                                    <span>{stat.total} matchs</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Section 3: Mes Succès */}
            <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-700 ${!isPremium ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Mes Succès
                </h3>

                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                    {[
                        { id: 'day', label: 'Jour de Gloire' },
                        { id: 'hour', label: 'Heures de Gloire' },
                        { id: 'month', label: 'Meilleur Mois' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSuccessTab(tab.id as 'day' | 'hour' | 'month')}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${successTab === tab.id
                                ? "bg-[#CCFF00] text-[#172554] border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className={`relative z-10 max-w-sm transition-all ${!isPremium ? 'blur-lg' : ''}`}>
                    {successTab === 'day' && (
                        <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg group hover:border-[#CCFF00]/30 transition-all">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <Calendar className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Jour de Gloire</span>
                            <span className="text-[10px] text-slate-500 mb-4">Taux de victoire max</span>
                            <span className="text-3xl font-black text-white group-hover:scale-105 transition-transform duration-300">{statsData?.insights?.luckyDay?.name || "-"}</span>
                            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                <span className="text-xs text-blue-400 font-bold">{statsData?.insights?.luckyDay?.winrate || 0}% victoires</span>
                            </div>
                        </div>
                    )}

                    {successTab === 'hour' && (
                        <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg group hover:border-[#CCFF00]/30 transition-all">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <Clock className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Heures de Gloire</span>
                            <span className="text-[10px] text-slate-500 mb-4">Créneau le plus efficace</span>
                            <span className="text-2xl font-black text-white group-hover:scale-105 transition-transform duration-300 px-2 break-all">{statsData?.insights?.goldenHour?.name || "-"}</span>
                            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                <span className="text-xs text-blue-400 font-bold">{statsData?.insights?.goldenHour?.winrate || 0}% victoires</span>
                            </div>
                        </div>
                    )}

                    {successTab === 'month' && (
                        <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg group hover:border-[#CCFF00]/30 transition-all">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <Trophy className="w-6 h-6 text-blue-300" />
                            </div>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Meilleur Mois</span>
                            <span className="text-[10px] text-slate-500 mb-4">Période optimale</span>
                            <span className="text-3xl font-black text-white group-hover:scale-105 transition-transform duration-300">{statsData?.insights?.bestMonth?.name || "-"}</span>
                            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                <span className="text-xs text-blue-300 font-bold">{statsData?.insights?.bestMonth?.winrate || 0}% victoires</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 4: Ma Forme */}
            <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all duration-700 ${!isPremium ? 'opacity-30 blur-sm' : ''}`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Ma Forme
                </h3>

                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                    {[
                        { id: 'form', label: 'Forme' },
                        { id: 'reaction', label: 'Capacité de Réaction' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFormTab(tab.id as 'form' | 'reaction')}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${formTab === tab.id
                                ? "bg-[#CCFF00] text-[#172554] border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative z-10 max-w-sm">
                    {formTab === 'form' ? (
                        <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg group hover:border-[#CCFF00]/30 transition-all">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <TrendingUp className="w-6 h-6 text-blue-500" />
                            </div>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Forme (5 derniers matchs)</span>
                            <span className="text-[10px] text-slate-500 mb-4">% victoires sur les 5 derniers</span>
                            <span className={`text-5xl font-black group-hover:scale-110 transition-transform duration-300 mb-3 text-white`}>
                                {statsData?.insights?.currentForm || 0}%
                            </span>
                            <div className={`h-2 w-24 rounded-full ${(statsData?.insights?.currentForm || 0) >= 60 ? "bg-emerald-500" :
                                (statsData?.insights?.currentForm || 0) >= 40 ? "bg-blue-500" : "bg-amber-500"
                                }`}></div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/30 border border-slate-700/30 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg group hover:border-[#CCFF00]/30 transition-all">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <Swords className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Capacité de Réaction</span>
                            <span className="text-[10px] text-slate-500 mb-4">Victoires après perte du 1er set</span>

                            <div className="flex flex-col items-center gap-2 mt-1">
                                <span className="text-5xl font-black text-white group-hover:scale-110 transition-transform duration-300">{statsData?.insights?.reaction?.rate || 0}%</span>
                                <div className="flex flex-col items-center text-center mt-2">
                                    <span className="text-xs text-slate-300 font-bold">{statsData?.insights?.reaction?.success || 0} remontadas</span>
                                    <span className="text-[10px] text-slate-500 mt-1">sur {statsData?.insights?.reaction?.opportunities || 0} opportunités</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

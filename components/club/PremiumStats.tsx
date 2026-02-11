"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Crown, Loader2, Trophy, Skull, Heart, Calendar, ArrowRight, Sparkles } from "lucide-react";
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
import { activatePremium, getPremiumStatsData } from "@/app/actions/premium";
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
        currentForm: number;
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

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const result = await activatePremium();
            if (result.success) {
                toast.success("Félicitations ! Vous êtes maintenant Premium.");
                setIsPremium(true);
                const data = await getPremiumStatsData();
                if (data) setStatsData(data as any);
                router.refresh();
            } else {
                toast.error("Erreur lors de l'activation : " + result.error);
            }
        } catch (e) {
            toast.error("Erreur inattendue");
        } finally {
            setUpgrading(false);
        }
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
                        Débloquez l'analyse détaillée de vos performances : évolution, partenaires favoris, némésis et insights exclusifs.
                    </p>
                    <button
                        onClick={handleUpgrade}
                        disabled={upgrading}
                        className="group px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-900/20 hover:shadow-amber-900/40 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Découvrir Premium Gratuitement
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-[10px] text-slate-600 mt-4">Offre découverte sans engagement.</p>
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
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                titleColor: "#94a3b8",
                bodyColor: "#fff",
                borderColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                padding: 10,
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
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: "rgba(148, 163, 184, 0.6)", font: { size: 10 } },
                suggestedMin: 0,
                suggestedMax: 10,
            },
            x: {
                display: true,
                grid: { display: false },
                ticks: { color: "rgba(148, 163, 184, 0.6)", font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
            },
        },
    };

    const renderList = (title: string, icon: any, list: any[], colorClass: string, emptyMessage: string) => {
        if (list.length === 0) return null; // Hide if empty per user request

        const isPartners = title === "Partenaires Favoris";
        const isVictims = title === "Mes Victimes";

        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-200">
                    <span className={`p-1.5 rounded-lg bg-slate-800 ${colorClass}`}>{icon}</span> {title}
                </h3>
                <div className="space-y-3">
                    {list.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all">
                                    {item.avatar_url ? <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" /> : null}
                                </div>
                                <span className="text-slate-200 text-sm font-medium truncate max-w-[100px]">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 ${colorClass}`}>
                                        {isPartners ?
                                            `${item.count} matchs` :
                                            `${item.count} ${isVictims ? 'vict.' : 'déf.'} / ${item.total} matchs`
                                        }
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">{item.winrate}% réussite</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 mt-8">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Statistiques Avancées
                </h2>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    {['1W', '1M', '1Y', 'ALL'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as TimeRange)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${timeRange === range
                                ? "bg-slate-700 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {range === '1W' ? '7J' : range === '1M' ? '30J' : range === '1Y' ? '1 AN' : 'Tout'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Evolution Chart */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 h-[300px] relative">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-200 mb-0.5">Évolution du niveau</h3>
                    </div>
                    {filteredEvolution.length > 0 && (
                        <div className="text-right">
                            <span className="text-2xl font-black text-blue-500">{filteredEvolution[filteredEvolution.length - 1].level.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Niveau Actuel</span>
                        </div>
                    )}
                </div>

                {filteredEvolution.length > 0 ? (
                    <div className="h-[210px] w-full">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-2">
                        <TrendingUp className="w-8 h-8 opacity-20" />
                        <p className="text-xs">Pas assez de données sur cette période</p>
                        <button onClick={() => setTimeRange('ALL')} className="text-[10px] text-blue-500 underline hover:text-blue-400">Voir tout l'historique</button>
                    </div>
                )}
            </div>

            {/* Insights Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
                    {/* Orange accent top border */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-orange-500 opacity-80"></div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 pt-2">Jour de Chance</span>
                    <span className="text-lg font-black text-white group-hover:scale-105 transition-transform duration-300">{statsData?.insights?.luckyDay?.name || "-"}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{statsData?.insights?.luckyDay?.winrate || 0}% de victoires</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500 opacity-80"></div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 pt-2">Meilleur Mois</span>
                    <span className="text-lg font-black text-white group-hover:scale-105 transition-transform duration-300">{statsData?.insights?.bestMonth?.name || "-"}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{statsData?.insights?.bestMonth?.winrate || 0}% de victoires</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500 opacity-80"></div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 pt-2">Forme (5 derniers)</span>
                    <span className={`text-2xl font-black group-hover:scale-110 transition-transform duration-300 ${(statsData?.insights?.currentForm || 0) >= 60 ? "text-emerald-500" :
                        (statsData?.insights?.currentForm || 0) >= 40 ? "text-blue-500" : "text-amber-500"
                        }`}>
                        {statsData?.insights?.currentForm || 0}%
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">de victoires</span>
                </div>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {renderList("Mes Victimes", <Trophy className="w-4 h-4" />, statsData?.topVictims || [], "text-yellow-500", "Vous n'avez pas encore gagné contre d'autres joueurs.")}
                {renderList("Mes Bourreaux", <Skull className="w-4 h-4" />, statsData?.topNemesis || [], "text-red-500", "Vous n'avez pas encore perdu contre d'autres joueurs.")}
                {renderList("Partenaires Favoris", <Heart className="w-4 h-4" />, statsData?.topPartners || [], "text-pink-500", "Jouez des matchs pour voir vos partenaires.")}
            </div>
        </div>
    );
}

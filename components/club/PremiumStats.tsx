"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Users, Zap, Crown, Loader2, Trophy, Skull, Heart } from "lucide-react";
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
        maxStreak: number;
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

    if (loading) return <div className="p-8 text-white/50 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

    if (!isPremium) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 p-6 sm:p-8 text-center mt-6">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                        <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Passez au niveau supérieur</h2>
                    <p className="text-sm sm:text-base text-white/60 mb-6 max-w-md">
                        Débloquez l'analyse détaillée : évolution de niveau, victimes favorites, némésis et plus encore.
                    </p>
                    <button
                        onClick={handleUpgrade}
                        disabled={upgrading}
                        className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl bg-white text-black text-sm sm:text-base font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        Devenir Premium (Gratuit - Test)
                    </button>
                    <p className="text-[10px] text-white/30 mt-4">Offre de test interne uniquement.</p>
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

    // If empty after filtering (e.g. no matches in last week), show at least last point or message
    // We want to ensure the graph looks good

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
                    if (!ctx) return "rgba(251, 191, 36, 0.2)";
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, "rgba(251, 191, 36, 0.2)");
                    gradient.addColorStop(1, "rgba(251, 191, 36, 0)");
                    return gradient;
                },
                borderColor: "#f59e0b",
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#1e1e1e",
                pointBorderColor: "#f59e0b",
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
                backgroundColor: "rgba(30, 30, 30, 0.9)",
                titleColor: "#fff",
                bodyColor: "#fbbf24",
                borderColor: "rgba(255,255,255,0.1)",
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
                grid: { color: "rgba(255,255,255,0.05)" },
                ticks: { color: "rgba(255,255,255,0.4)", font: { size: 10 } },
                suggestedMin: 0,
                suggestedMax: 10,
            },
            x: {
                display: true,
                grid: { display: false },
                ticks: { color: "rgba(255,255,255,0.4)", font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
            },
        },
    };

    const renderList = (title: string, icon: any, list: any[], colorClass: string) => (
        <div className="bg-[#0f172a]/40 border border-white/5 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${colorClass}`}>
                {icon} {title}
            </h3>
            <div className="space-y-3">
                {list.length > 0 ? list.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden ring-2 ring-white/5 group-hover:ring-white/20 transition-all">
                                {item.avatar_url ? <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" /> : null}
                            </div>
                            <span className="text-white text-sm font-medium truncate max-w-[90px] sm:max-w-[110px]">{item.name}</span>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <span className={`text-xs font-bold ${colorClass.replace("text-", "bg-") / 10}`}>{item.count}</span>
                                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{title === "Top Partenaires" ? "matchs" : (title === "Mes Victimes" ? "vict." : "def.")}</span>
                            </div>
                            <div className="text-[10px] text-white/30 font-medium">{item.winrate}% réussite</div>
                        </div>
                    </div>
                )) : <p className="text-xs text-white/30 italic py-2 text-center">Aucune donnée disponible</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 mt-8">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    Statistiques Premium
                </h2>
                <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                    {['1W', '1M', '1Y', 'ALL'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as TimeRange)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${timeRange === range
                                ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                                : "text-white/40 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {range === '1W' ? '7J' : range === '1M' ? '30J' : range === '1Y' ? '1 AN' : 'Tout'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Evolution Chart */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/60 border border-white/5 h-[320px] relative backdrop-blur-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-white mb-0.5">Évolution du niveau</h3>
                        <p className="text-[10px] text-white/40">Basé sur vos résultats de matchs</p>
                    </div>
                    {filteredEvolution.length > 0 && (
                        <div className="text-right">
                            <span className="text-2xl font-black text-yellow-500">{filteredEvolution[filteredEvolution.length - 1].level.toFixed(2)}</span>
                            <span className="text-[10px] text-white/30 block uppercase tracking-wider">Actuel</span>
                        </div>
                    )}
                </div>

                {filteredEvolution.length > 0 ? (
                    <div className="h-[230px] w-full">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-2">
                        <TrendingUp className="w-8 h-8 opacity-20" />
                        <p className="text-xs">Pas assez de données sur cette période</p>
                        <button onClick={() => setTimeRange('ALL')} className="text-[10px] text-yellow-500 underline hover:text-yellow-400">Voir tout l'historique</button>
                    </div>
                )}
            </div>

            {/* Insights Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
                    <span className="text-[10px] uppercase tracking-wider text-orange-400/80 font-bold mb-2">Max Streak</span>
                    <span className="text-xl sm:text-2xl font-black text-white group-hover:scale-110 transition-transform duration-300">{statsData?.insights?.maxStreak || 0}</span>
                    <span className="text-[10px] text-white/30 mt-1">victoires consécutives</span>
                </div>

                <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                    <span className="text-[10px] uppercase tracking-wider text-purple-400/80 font-bold mb-2">Meilleur Mois</span>
                    <span className="text-sm sm:text-base font-bold text-white truncate max-w-full group-hover:scale-105 transition-transform duration-300">{statsData?.insights?.bestMonth?.name || "-"}</span>
                    <span className="text-[10px] text-white/30 mt-1">{statsData?.insights?.bestMonth?.winrate || 0}% de victoires</span>
                </div>

                <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold mb-2">Forme Actuelle</span>
                    <span className={`text-xl sm:text-2xl font-black group-hover:scale-110 transition-transform duration-300 ${(statsData?.insights?.currentForm || 0) >= 60 ? "text-emerald-400" :
                        (statsData?.insights?.currentForm || 0) >= 40 ? "text-blue-400" : "text-red-400"
                        }`}>
                        {statsData?.insights?.currentForm || 0}%
                    </span>
                    <span className="text-[10px] text-white/30 mt-1">sur 5 matchs</span>
                </div>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {renderList("Mes Victimes", <Trophy className="w-4 h-4" />, statsData?.topVictims || [], "text-yellow-400")}
                {renderList("Mes Némésis", <Skull className="w-4 h-4" />, statsData?.topNemesis || [], "text-red-400")}
                {renderList("Partenaires Favoris", <Heart className="w-4 h-4" />, statsData?.topPartners || [], "text-pink-400")}
            </div>
        </div>
    );
}

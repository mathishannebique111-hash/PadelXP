"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Trophy,
    TrendingUp,
    Target,
    Award,
    Brain,
    Zap,
} from "lucide-react";
import type { LevelResult } from "@/lib/padel/levelCalculator";
import LevelRadarChart from "./LevelRadarChart";

interface Props {
    result: LevelResult;
}

export default function LevelResultContent({ result }: Props) {
    const [activeTab, setActiveTab] = useState<"technique" | "tactique" | "mental">("technique");

    return (
        <div className="space-y-6 w-full">
            {/* En-tête résultat - Plus compact */}
            <div className="text-center bg-slate-950/40 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-padel-green/5 to-blue-500/5"
                    animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                />

                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <Trophy
                            size={32}
                            className="text-yellow-500"
                        />
                        <h1 className="text-4xl md:text-5xl font-black text-padel-green">
                            Niveau {result.niveau}
                        </h1>
                    </div>

                    <p className="text-sm md:text-lg text-white/80 font-semibold italic mt-2 max-w-sm mx-auto">
                        Ton niveau évoluera au fur et à mesure de tes matchs
                    </p>

                    {result.niveau >= 9 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-3 inline-block px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white text-xs font-bold flex items-center gap-2 mx-auto"
                        >
                            <Award size={14} />
                            Niveau d&apos;élite !
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Graphique radar - Plus petit */}
            <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl">
                <LevelRadarChart breakdown={result.breakdown} />
            </div>

            {/* Points forts / faibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                        <TrendingUp size={18} />
                        Points forts
                    </h3>
                    <ul className="space-y-2">
                        {result.strengths.map((s, i) => (
                            <motion.li
                                key={i}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="text-sm md:text-base text-green-300 flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                {s}
                            </motion.li>
                        ))}
                    </ul>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                        <Target size={18} />
                        Axes d'amélioration
                    </h3>
                    <ul className="space-y-2">
                        {result.weaknesses.map((w, i) => (
                            <motion.li
                                key={i}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="text-sm md:text-base text-orange-300 flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                                {w}
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Conseils - Système d'onglets pour compacter */}
            <div className="space-y-3">
                <div className="flex p-1 bg-slate-950/40 rounded-xl border border-white/10">
                    {(["technique", "tactique", "mental"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${activeTab === tab
                                ? "bg-blue-600 text-white shadow-lg"
                                : "text-white/40 hover:text-white/60"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-950/40 border border-white/10 rounded-2xl p-5 shadow-xl min-h-[120px]"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activeTab === 'technique' ? 'bg-blue-500/20 text-blue-400' :
                            activeTab === 'tactique' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-emerald-500/20 text-emerald-400'
                            }`}>
                            {activeTab === 'technique' && <Target size={16} />}
                            {activeTab === 'tactique' && <Brain size={16} />}
                            {activeTab === 'mental' && <Zap size={16} />}
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                            Focus {activeTab}
                        </h4>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed italic">
                        "{result.tips[activeTab]}"
                    </p>
                </motion.div>
            </div>

            {/* Progression vers niveau suivant */}
            {result.niveau < 10 && (
                <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-white/50 uppercase font-black tracking-widest">
                            Vers niveau {result.niveau + 1}
                        </span>
                        <span className="text-sm text-padel-green font-black">
                            {Math.round(result.nextLevelProgress)}%
                        </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-padel-green"
                            initial={{ width: 0 }}
                            animate={{ width: `${result.nextLevelProgress}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

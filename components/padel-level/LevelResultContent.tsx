"use client";

import { motion } from "framer-motion";
import { Trophy, Award } from "lucide-react";
import type { LevelResult } from "@/lib/padel/levelCalculator";
import LevelRadarChart from "./LevelRadarChart";

interface Props {
    result: LevelResult;
}

export default function LevelResultContent({ result }: Props) {
    return (
        <div className="space-y-6 w-full">
            {/* En-tête résultat */}
            <div className="text-center bg-slate-950/40 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r opacity-20"
                    style={{ backgroundImage: 'linear-gradient(to right, rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1), rgba(0, 102, 255, 0.1))' }}
                    animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                />

                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <Trophy size={32} className="text-yellow-500" />
                        <h1 className="text-4xl md:text-5xl font-black" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>
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

            {/* Graphique radar */}
            <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-2 md:p-3 shadow-xl max-w-xs mx-auto">
                <LevelRadarChart breakdown={result.breakdown} />
            </div>
        </div>
    );
}

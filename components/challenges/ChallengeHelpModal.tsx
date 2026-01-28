"use client";

import { useEffect, useState } from "react";
import { X, Trophy, Flame, Shield, Users, Swords, Calendar, Clock, Activity, Award } from "lucide-react";

interface ChallengeHelpModalProps {
    onClose: () => void;
    onPrefill: (title: string, objective: string) => void;
}

type ChallengeType = {
    title: string;
    Icon: any;
    description: string;
    keywords: string[];
    example: string;
    color: string;
};

const CHALLENGE_TYPES: ChallengeType[] = [
    {
        title: "Participation Active",
        Icon: Activity,
        description: "Récompense la régularité, peu importe le résultat.",
        keywords: ["jouer", "participer"],
        example: "Jouer 10 matchs",
        color: "text-emerald-400"
    },
    {
        title: "Cumul de Victoires",
        Icon: Trophy,
        description: "Récompense la performance pure.",
        keywords: ["gagner", "remporter", "victoire", "win"],
        example: "Gagner 5 matchs",
        color: "text-amber-400"
    },
    {
        title: "Série de Victoires",
        Icon: Flame,
        description: "Gagner plusieurs matchs d'affilée sans perdre.",
        keywords: ["consécutif", "d'affilée", "de suite", "sans défaite"],
        example: "Gagner 3 matchs d'affilée",
        color: "text-orange-500"
    },
    {
        title: "Victoire Nette",
        Icon: Shield,
        description: "Gagner sans perdre un seul set (2-0).",
        keywords: ["sans perdre de set", "2-0", "3-0", "clean sheet"],
        example: "Gagner 3 matchs sans perdre de set",
        color: "text-blue-400"
    },
    {
        title: "Partenaires Variés",
        Icon: Users,
        description: "Encourage à jouer avec différents partenaires.",
        keywords: ["partenaire", "différent", "varié"],
        example: "Jouer avec 3 partenaires différents",
        color: "text-indigo-400"
    },
    {
        title: "Adversaires Variés",
        Icon: Swords,
        description: "Encourage à affronter différents adversaires.",
        keywords: ["adversaire", "différent"],
        example: "Gagner contre 5 adversaires différents",
        color: "text-rose-400"
    },
    {
        title: "Matchs du Week-end",
        Icon: Calendar,
        description: "Récompense les joueurs du week-end.",
        keywords: ["week-end", "weekend", "samedi", "dimanche"],
        example: "Jouer 4 matchs le week-end",
        color: "text-pink-400"
    },
    {
        title: "Horaires Spécifiques",
        Icon: Clock,
        description: "Encourage à jouer à des heures spécifiques.",
        keywords: ["avant X heure", "après X heure", "matin", "soir"],
        example: "Jouer 2 matchs avant 10 heures",
        color: "text-purple-400"
    },
    {
        title: "Matchs en 3 Sets",
        Icon: Award, // Ou une autre icône appropriée
        description: "Récompense les matchs longs en 3 sets.",
        keywords: ["3 sets", "match long"],
        example: "Jouer 3 matchs en 3 sets",
        color: "text-yellow-200"
    },
];

export default function ChallengeHelpModal({ onClose, onPrefill }: ChallengeHelpModalProps) {
    // Fermer avec Echap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Empêcher le scroll du body quand le modal est ouvert
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop: Covers the entire screen including sidebar */}
            <div
                className="absolute inset-0 transition-opacity"
                onClick={onClose}
            />

            {/* Content Wrapper: Respects sidebar offset and layout */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none md:pl-[18rem] p-4 sm:p-6">
                {/* Modal Card: Interactive content */}
                <div className="pointer-events-auto relative flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#0f172a] shadow-2xl ring-1 ring-white/10 animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-[#1e293b]/50 px-6 py-4 backdrop-blur-md">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">💡</span>
                            Guide des Challenges
                        </h2>
                        <button
                            onClick={onClose}
                            className="rounded-full bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                        <p className="mb-6 text-sm text-slate-400 w-full whitespace-nowrap overflow-hidden text-ellipsis">
                            Le système analyse automatiquement votre texte pour comprendre les règles. Utilisez les mots-clés ci-dessous pour créer des challenges variés.
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {CHALLENGE_TYPES.map((type, index) => (
                                <ChallengeTypeCard key={index} type={type} onPrefill={onPrefill} onClose={onClose} />
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-white/10 bg-[#1e293b]/50 px-6 py-4 text-center backdrop-blur-md">
                        <button
                            onClick={onClose}
                            className="rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
                        >
                            J'ai compris, je crée mon challenge !
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

}

function ChallengeTypeCard({ type, onPrefill, onClose }: { type: ChallengeType; onPrefill: (title: string, objective: string) => void; onClose: () => void }) {
    const Icon = type.Icon;

    const handlePrefill = () => {
        // Generate a title using the challenge type
        const title = type.title;
        // Generate an objective with at least one keyword
        const objective = type.example;
        onPrefill(title, objective);
        onClose();
    };

    return (
        <div className="group relative flex h-full flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all hover:border-blue-500/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-blue-500/5">
            {/* Header: Icon + Title */}
            <div className="mb-3 flex items-center gap-3">
                <Icon className={`h-6 w-6 flex-shrink-0 ${type.color}`} />
                <h3 className="font-bold text-slate-200 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{type.title}</h3>
            </div>

            {/* Description */}
            <p className="mb-4 text-xs leading-relaxed text-slate-400 h-8 whitespace-nowrap overflow-hidden text-ellipsis">
                {type.description}
            </p>

            {/* Keywords */}
            <div className="mt-auto space-y-3">
                <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mots-clés requis</p>
                    <div className="flex flex-wrap gap-1.5">
                        {type.keywords.map((keyword, i) => (
                            <span key={i} className="inline-block rounded-md bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-300 border border-blue-500/20 whitespace-nowrap">
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Example */}
                <div className="rounded-lg bg-black/20 p-2.5 ring-1 ring-white/5 mt-2 group-hover:bg-black/40 transition-colors">
                    <p className="text-[10px] text-slate-500 mb-1">Exemple</p>
                    <p className="text-xs font-medium text-emerald-300 italic line-clamp-2" title={type.example}>"{type.example}"</p>
                </div>

                {/* Pre-fill button */}
                <button
                    onClick={handlePrefill}
                    className="w-full rounded-lg bg-blue-600/80 px-3 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
                >
                    Pré-remplir avec ce challenge
                </button>
            </div>
        </div>
    );
}

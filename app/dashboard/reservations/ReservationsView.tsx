"use client";

import { useState } from "react";
import PageTitle from "@/app/dashboard/PageTitle";
import StripeConnectCard from "@/components/club/StripeConnectCard";
import ScheduleManager from "@/components/club/reservations/ScheduleManager";
import CourtsManager from "@/components/club/reservations/CourtsManager";
import PlanningManager from "@/components/club/reservations/PlanningManager";
import { Clock, ShieldCheck, MapPin, Calendar, Loader2 } from "lucide-react";

interface ReservationsViewProps {
    clubId: string;
}

export default function ReservationsView({ clubId }: ReservationsViewProps) {
    const [activeTab, setActiveTab] = useState<"planning" | "schedule" | "pricing" | "stripe">("planning");

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <PageTitle
                    title="Réservations"
                    subtitle="Gérez votre planning et vos horaires d'ouverture"
                />
            </header>

            {/* Tabs */}
            <div className="border-b border-white/10">
                <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("planning")}
                        className={`${activeTab === "planning"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-white/60 hover:text-white hover:border-white/30"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <Calendar className="w-4 h-4" />
                        Planning
                    </button>
                    <button
                        onClick={() => setActiveTab("schedule")}
                        className={`${activeTab === "schedule"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-white/60 hover:text-white hover:border-white/30"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <Clock className="w-4 h-4" />
                        Horaires
                    </button>
                </nav>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === "planning" && (
                    <PlanningManager clubId={clubId} />
                )}

                {activeTab === "schedule" && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-white mb-1">Horaires d'ouverture hebdomadaires</h3>
                        <p className="text-white/60 text-sm mb-6">
                            Définissez les heures d'ouverture standard de votre club pour chaque terrain.
                        </p>
                        <ScheduleManager clubId={clubId} />
                    </div>
                )}
            </div>
        </div>
    );
}

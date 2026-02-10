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
    const [activeTab, setActiveTab] = useState<"general" | "planning" | "schedule" | "courts">("planning");

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <PageTitle
                    title="Réservations & Tarifs"
                    subtitle="Gérez vos paiements, horaires et tarifs de terrains"
                />
            </header>

            {/* Tabs */}
            <div className="border-b border-white/10">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
                        Horaires d'ouverture
                    </button>
                    <button
                        onClick={() => setActiveTab("courts")}
                        className={`${activeTab === "courts"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-white/60 hover:text-white hover:border-white/30"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <MapPin className="w-4 h-4" />
                        Terrains & Tarifs
                    </button>
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`${activeTab === "general"
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-white/60 hover:text-white hover:border-white/30"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Paiements & Général
                    </button>
                </nav>
            </div>

            {activeTab === "planning" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <PlanningManager clubId={clubId} />
                </div>
            )}

            {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-4">Connexion Stripe</h2>
                        <StripeConnectCard />
                    </section>
                </div>
            )}

            {activeTab === "schedule" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-white mb-1">Horaires d'ouverture hebdomadaires</h3>
                        <p className="text-white/60 text-sm mb-6">
                            Définissez les heures d'ouverture standard de votre club. Ces horaires détermineront les créneaux disponibles à la réservation.
                        </p>
                        <ScheduleManager clubId={clubId} />
                    </div>
                </div>
            )}

            {activeTab === "courts" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-white mb-1">Gestion des terrains</h3>
                        <p className="text-white/60 text-sm mb-6">
                            Configurez le prix de l'heure pour chaque terrain et gérez les règles de tarification (heures pleines/creuses).
                        </p>
                        <CourtsManager clubId={clubId} />
                    </div>
                </div>
            )}
        </div>
    );
}

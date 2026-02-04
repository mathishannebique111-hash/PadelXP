"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Calendar, MapPin, Users, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Reservation {
    id: string;
    is_organizer: boolean;
    payment_status: string;
    amount: number;
    reservation: {
        id: string;
        start_time: string;
        end_time: string;
        status: string;
        total_price: number;
        expires_at: string | null;
        court: {
            id: string;
            name: string;
            club: {
                id: string;
                name: string;
            };
        };
    };
}

export default function MyReservationsPage() {
    const supabase = createClientComponentClient();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

    useEffect(() => {
        async function loadReservations() {
            setLoading(true);
            try {
                const response = await fetch("/api/reservations");
                const data = await response.json();

                if (data.reservations) {
                    setReservations(data.reservations);
                }
            } catch (error) {
                console.error("Error loading reservations:", error);
            } finally {
                setLoading(false);
            }
        }

        loadReservations();
    }, []);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const now = new Date();
    const filteredReservations = reservations.filter((r) => {
        const startTime = new Date(r.reservation.start_time);
        return filter === "upcoming" ? startTime >= now : startTime < now;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "confirmed":
                return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Confirmée</span>;
            case "pending_payment":
                return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">En attente</span>;
            case "cancelled":
                return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Annulée</span>;
            case "expired":
                return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">Expirée</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-white/60">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
                <div className="px-4 py-4">
                    <h1 className="text-xl font-bold text-white">Mes Réservations</h1>
                </div>

                {/* Filter Tabs */}
                <div className="flex px-4 pb-3 gap-2">
                    <button
                        onClick={() => setFilter("upcoming")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "upcoming"
                                ? "bg-blue-600 text-white"
                                : "bg-white/10 text-white/70"
                            }`}
                    >
                        À venir
                    </button>
                    <button
                        onClick={() => setFilter("past")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "past"
                                ? "bg-blue-600 text-white"
                                : "bg-white/10 text-white/70"
                            }`}
                    >
                        Passées
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {filteredReservations.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">
                            {filter === "upcoming"
                                ? "Aucune réservation à venir"
                                : "Aucune réservation passée"}
                        </p>
                        {filter === "upcoming" && (
                            <Link
                                href="/clubs"
                                className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium"
                            >
                                Réserver un terrain
                            </Link>
                        )}
                    </div>
                ) : (
                    filteredReservations.map((item) => (
                        <Link
                            key={item.id}
                            href={`/reservations/${item.reservation.id}`}
                            className="block bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-white font-semibold">
                                        {item.reservation.court.club.name}
                                    </h3>
                                    <p className="text-sm text-white/60">{item.reservation.court.name}</p>
                                </div>
                                {getStatusBadge(item.reservation.status)}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-white/70">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(item.reservation.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {formatTime(item.reservation.start_time)} - {formatTime(item.reservation.end_time)}
                                    </span>
                                </div>
                            </div>

                            {item.reservation.status === "pending_payment" && item.reservation.expires_at && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>
                                        Expire le {formatDate(item.reservation.expires_at)} à {formatTime(item.reservation.expires_at)}
                                    </span>
                                </div>
                            )}

                            {item.is_organizer && (
                                <div className="mt-2 text-xs text-blue-400">
                                    Vous êtes l&apos;organisateur
                                </div>
                            )}
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

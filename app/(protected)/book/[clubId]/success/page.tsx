"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Reservation {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    court: {
        name: string;
        club: {
            name: string;
            address: string;
            city: string;
        };
    };
    reservation_participants: Array<{
        is_organizer: boolean;
        profiles: {
            first_name: string;
            last_name: string;
        };
    }>;
}

export default function BookingSuccessPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const clubId = (params?.clubId as string) || "";
    const reservationId = searchParams?.get("reservation_id");

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadReservation() {
            if (!reservationId) return;

            try {
                const response = await fetch(`/api/reservations/${reservationId}`);
                const data = await response.json();
                if (data.reservation) {
                    setReservation(data.reservation);
                }
            } catch (error) {
                console.error("Error loading reservation:", error);
            } finally {
                setLoading(false);
            }
        }

        loadReservation();
    }, [reservationId]);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-white/60">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Success Header */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">
                    Réservation confirmée !
                </h1>
                <p className="text-white/60 mb-8">
                    Votre terrain est réservé. Rendez-vous sur place !
                </p>

                {reservation && (
                    <div className="w-full max-w-sm bg-white/5 rounded-2xl p-6 space-y-4 text-left">
                        {/* Club & Court */}
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                                <p className="text-white font-medium">{reservation.court.club.name}</p>
                                <p className="text-sm text-white/60">{reservation.court.name}</p>
                                <p className="text-xs text-white/40">
                                    {reservation.court.club.address}, {reservation.court.club.city}
                                </p>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                                <p className="text-white font-medium capitalize">
                                    {formatDate(reservation.start_time)}
                                </p>
                                <p className="text-sm text-white/60">
                                    {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </p>
                            </div>
                        </div>

                        {/* Players */}
                        <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                                <p className="text-white font-medium">Joueurs</p>
                                <div className="text-sm text-white/60">
                                    {reservation.reservation_participants.map((p, i) => (
                                        <span key={i}>
                                            {p.profiles.first_name} {p.profiles.last_name}
                                            {p.is_organizer && " (Org.)"}
                                            {i < reservation.reservation_participants.length - 1 && ", "}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 space-y-3">
                <Link
                    href="/home"
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
                >
                    Retour à l&apos;accueil
                    <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                    href="/matches"
                    className="w-full py-4 bg-white/10 text-white rounded-xl font-semibold text-lg flex items-center justify-center"
                >
                    Voir mes réservations
                </Link>
            </div>
        </div>
    );
}

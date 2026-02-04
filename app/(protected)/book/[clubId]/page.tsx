"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ChevronLeft, Calendar, Clock, Users, MapPin } from "lucide-react";
import Link from "next/link";

interface Court {
    id: string;
    name: string;
    is_active: boolean;
}

interface Club {
    id: string;
    name: string;
    address: string;
    city: string;
}

interface TimeSlot {
    start_time: string;
    end_time: string;
    is_available: boolean;
    reservation_id?: string;
}

export default function BookingPage() {
    const params = useParams();
    const router = useRouter();
    const clubId = params.clubId as string;
    const supabase = createClientComponentClient();

    const [club, setClub] = useState<Club | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Charger le club et ses terrains
    useEffect(() => {
        async function loadClubAndCourts() {
            setLoading(true);
            try {
                // Charger le club
                const { data: clubData } = await supabase
                    .from("clubs")
                    .select("id, name, address, city")
                    .eq("id", clubId)
                    .single();

                if (clubData) setClub(clubData);

                // Charger les terrains
                const response = await fetch(`/api/courts?club_id=${clubId}`);
                const data = await response.json();
                if (data.courts) {
                    setCourts(data.courts);
                    if (data.courts.length > 0) {
                        setSelectedCourt(data.courts[0]);
                    }
                }
            } catch (error) {
                console.error("Error loading club:", error);
            } finally {
                setLoading(false);
            }
        }

        loadClubAndCourts();
    }, [clubId, supabase]);

    // Charger les disponibilités quand le terrain ou la date change
    useEffect(() => {
        async function loadAvailability() {
            if (!selectedCourt) return;

            setLoadingSlots(true);
            try {
                const response = await fetch(
                    `/api/courts/${selectedCourt.id}/availability?date=${selectedDate}`
                );
                const data = await response.json();
                if (data.slots) {
                    setSlots(data.slots);
                }
            } catch (error) {
                console.error("Error loading availability:", error);
            } finally {
                setLoadingSlots(false);
            }
        }

        loadAvailability();
    }, [selectedCourt, selectedDate]);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleContinue = () => {
        if (!selectedSlot || !selectedCourt) return;

        // Passer à l'étape de sélection des joueurs
        const queryParams = new URLSearchParams({
            court_id: selectedCourt.id,
            court_name: selectedCourt.name,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
        });

        router.push(`/book/${clubId}/players?${queryParams.toString()}`);
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
                <div className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/clubs/${clubId}`} className="p-2 -ml-2">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Réserver un terrain</h1>
                        {club && (
                            <p className="text-sm text-white/60">{club.name}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Sélection du terrain */}
                <section>
                    <h2 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Terrain
                    </h2>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {courts.map((court) => (
                            <button
                                key={court.id}
                                onClick={() => {
                                    setSelectedCourt(court);
                                    setSelectedSlot(null);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCourt?.id === court.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-white/10 text-white/70 hover:bg-white/20"
                                    }`}
                            >
                                {court.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Sélection de la date */}
                <section>
                    <h2 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date
                    </h2>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedSlot(null);
                        }}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </section>

                {/* Créneaux horaires */}
                <section>
                    <h2 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Créneau (1h30)
                    </h2>

                    {loadingSlots ? (
                        <div className="text-white/60 text-center py-8">Chargement des disponibilités...</div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {slots.map((slot, index) => (
                                <button
                                    key={index}
                                    onClick={() => slot.is_available && setSelectedSlot(slot)}
                                    disabled={!slot.is_available}
                                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${!slot.is_available
                                            ? "bg-red-900/30 text-red-400/50 cursor-not-allowed"
                                            : selectedSlot?.start_time === slot.start_time
                                                ? "bg-blue-600 text-white ring-2 ring-blue-400"
                                                : "bg-white/10 text-white hover:bg-white/20"
                                        }`}
                                >
                                    {formatTime(slot.start_time)}
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Footer avec bouton de validation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-white/10">
                <button
                    onClick={handleContinue}
                    disabled={!selectedSlot}
                    className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors ${selectedSlot
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-white/10 text-white/40 cursor-not-allowed"
                        }`}
                >
                    <Users className="w-5 h-5" />
                    Choisir les joueurs
                </button>
            </div>
        </div>
    );
}

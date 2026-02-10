"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Calendar, Clock, MapPin, X, Check, Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TimeSlot {
    start_time: string;
    end_time: string;
    is_available: boolean;
    reservation_id?: string;
    status?: string;
}

interface Court {
    id: string;
    name: string;
    is_active: boolean;
    price_hour?: number; // Optional, defaults to club default
    slots: TimeSlot[];
}

interface BookingContentProps {
    clubId: string;
}

export default function BookingContent({ clubId }: BookingContentProps) {
    const router = useRouter();
    const supabase = createClientComponentClient();

    // -- State --
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [courtsData, setCourtsData] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);

    // UI State for Popups
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null); // ISO start_time
    const [isCourtSelectionOpen, setIsCourtSelectionOpen] = useState(false);

    // New state for 2-step selection
    const [selectedCourtForSummary, setSelectedCourtForSummary] = useState<Court | null>(null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);

    // Cache for availability: { [dateString]: Court[] }
    const [availabilityCache, setAvailabilityCache] = useState<Record<string, Court[]>>({});

    // -- Constants --
    const DEFAULT_PRICE_PER_HOUR = 32; // Default if not set
    const COMMISSION_PERCENT = 0.022; // 2.2%
    const COMMISSION_FIXED = 0.25; // 0.25€

    // -- Helpers --
    const formatDateKey = (date: Date) => date.toISOString().split("T")[0];

    // Generate next 14 days
    const dates = useMemo(() => {
        const d = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            d.push(date);
        }
        return d;
    }, []);

    // -- Fetching --
    const fetchAvailability = async (date: Date) => {
        const dateKey = formatDateKey(date);

        // Check cache
        if (availabilityCache[dateKey]) {
            if (formatDateKey(selectedDate) === dateKey) {
                setCourtsData(availabilityCache[dateKey]);
                setLoading(false);
            }
            return;
        }

        if (formatDateKey(selectedDate) === dateKey) setLoading(true);
        try {
            const response = await fetch(`/api/clubs/${clubId}/availability?date=${dateKey}`);
            const data = await response.json();

            if (data.courts) {
                if (formatDateKey(selectedDate) === dateKey) setCourtsData(data.courts);
                setAvailabilityCache(prev => ({
                    ...prev,
                    [dateKey]: data.courts
                }));
            }
        } catch (error) {
            console.error("Error fetching availability:", error);
        } finally {
            if (formatDateKey(selectedDate) === dateKey) setLoading(false);
        }
    };

    useEffect(() => {
        if (clubId) {
            fetchAvailability(selectedDate);

            // Prefetch next 2 days for smoother experience
            const nextDay = new Date(selectedDate);
            nextDay.setDate(selectedDate.getDate() + 1);
            fetchAvailability(nextDay);
        }
    }, [clubId, selectedDate]);


    // -- Aggregated Slots Logic --
    const aggregatedSlots = useMemo(() => {
        const slotsMap = new Map<string, { start: string, end: string, availableCount: number }>();

        courtsData.forEach(court => {
            court.slots?.forEach(slot => {
                const key = slot.start_time;
                if (!slotsMap.has(key)) {
                    slotsMap.set(key, {
                        start: slot.start_time,
                        end: slot.end_time,
                        availableCount: 0
                    });
                }

                if (slot.is_available) {
                    const current = slotsMap.get(key)!;
                    current.availableCount += 1;
                }
            });
        });

        // Convert to array and sort
        return Array.from(slotsMap.values()).sort((a, b) =>
            new Date(a.start).getTime() - new Date(b.start).getTime()
        );
    }, [courtsData]);


    // -- Handlers --

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setSelectedTimeSlot(null);
        setIsCourtSelectionOpen(false);
        setIsSummaryOpen(false);
        setSelectedCourtForSummary(null); // Reset selection
    };

    const handleSlotClick = (slot: { start: string, end: string, availableCount: number }) => {
        if (slot.availableCount > 0) {
            setSelectedTimeSlot(slot.start);
            setIsCourtSelectionOpen(true);
            setSelectedCourtForSummary(null); // Reset court selection when opening popup
        }
    };

    const handleConfirmedReservationClick = () => {
        if (selectedCourtForSummary) {
            setIsCourtSelectionOpen(false);
            setTimeout(() => setIsSummaryOpen(true), 200);
        }
    };

    const handleConfirmBooking = async () => {
        if (!selectedTimeSlot || !selectedCourtForSummary) return;

        const slot = selectedCourtForSummary.slots.find(s => s.start_time === selectedTimeSlot);
        if (!slot) return;

        setBooking(true);

        // Price Calculation Logic
        const courtPrice = selectedCourtForSummary.price_hour || DEFAULT_PRICE_PER_HOUR;
        // Since slots are usually 1h30 (90 mins), we calculate proportional price
        // BUT usually clubs have a fixed price per slot (e.g. 40€ / 1h30).
        // Let's assume price_hour IS the price per slot for simplicity in this MVP, 
        // OR better: Assume 1h30 slot = 1.5 * price_hour.
        // Given 'PRICE_PER_SLOT = 30' was hardcoded, let's Stick to fixed slot price for now or calculate duration.
        const start = new Date(slot.start_time);
        const end = new Date(slot.end_time);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // e.g. 1.5

        let totalPrice = courtPrice;
        if (durationHours !== 1) {
            // Adjust if logic dictates. For Padel usually it's fixed 1h30 slot. 
            // If the court price is "per hour", then totalPrice = courtPrice * durationHours.
            // Let's assume the DB stores "Price Per Slot" to avoid confusion or "Price Per Hour".
            // Implementation Decision: Use Duration Multiplier assuming price is hourly.
            totalPrice = courtPrice * durationHours;
        }

        try {
            const res = await fetch("/api/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    court_id: selectedCourtForSummary.id,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    participant_ids: [],
                    total_price: totalPrice, // Security: Server should re-verify this!
                    payment_method: "stripe"
                })
            });

            if (res.ok) {
                // Reset states to prevent popup showing when returning
                setIsSummaryOpen(false);
                setIsCourtSelectionOpen(false);
                setSelectedTimeSlot(null);
                setSelectedCourtForSummary(null);
                setBooking(false);

                // Redirection vers l'onglet "Mes réservations" pour l'ajout des joueurs
                router.push("/book?tab=my-reservations");
                router.refresh();
            } else {
                const err = await res.json();
                console.error("Booking error:", err);
                alert("Erreur lors de la réservation: " + (err.error || "Inconnue"));
                setBooking(false);
            }
        } catch (error) {
            console.error("Booking fatal error:", error);
            setBooking(false);
        }
    };

    // -- Formatters --
    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getDayName = (date: Date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
    const getDayNumber = (date: Date) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(date);
    const getMonthName = (date: Date) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date);

    // -- Pricing Display --
    const getPriceDetails = () => {
        if (!selectedCourtForSummary || !selectedTimeSlot) return null;

        const courtPriceHour = selectedCourtForSummary.price_hour || DEFAULT_PRICE_PER_HOUR;
        const slot = selectedCourtForSummary.slots.find(s => s.start_time === selectedTimeSlot);
        let duration = 1.5; // Default
        if (slot) {
            const start = new Date(slot.start_time);
            const end = new Date(slot.end_time);
            duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }

        const totalPrice = courtPriceHour * duration;
        const perPlayerPrice = totalPrice / 4;

        // Commission
        const commission = (perPlayerPrice * COMMISSION_PERCENT) + COMMISSION_FIXED;
        const totalPerPlayer = perPlayerPrice + commission;

        return {
            total: totalPrice,
            perPlayer: perPlayerPrice,
            commission,
            totalPerPlayer
        };
    };

    const priceDetails = getPriceDetails();


    return (
        <div className="pb-24 relative min-h-[60vh]">

            {/* 1. Date Picker Horizontal */}
            <div className="mb-6">
                <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2 px-1">
                    <Calendar className="w-5 h-5" />
                    Choisissez une date
                </h2>
                <div className="flex overflow-x-auto gap-3 pb-4 py-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] touch-pan-x">
                    {dates.map((date, index) => {
                        const isSelected = formatDateKey(date) === formatDateKey(selectedDate);
                        return (
                            <button
                                key={index}
                                onClick={() => handleDateSelect(date)}
                                className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl transition-all duration-300 ${isSelected
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105 z-10"
                                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                                    }`}
                            >
                                <span className="text-sm font-medium capitalize opacity-80">{getDayName(date)}</span>
                                <span className={`text-2xl font-bold my-1 ${isSelected ? "text-white" : "text-white"}`}>{getDayNumber(date)}</span>
                                <span className="text-xs font-medium opacity-60 capitalize">{getMonthName(date)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Aggregated Slots Grid */}
            <div>
                <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2 px-1">
                    <Clock className="w-5 h-5" />
                    Créneaux disponibles
                </h2>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-sm">Recherche de terrains...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                        {aggregatedSlots.map((slot, idx) => {
                            // Slot start is already an ISO string for the specific date
                            const slotDateTime = new Date(slot.start);
                            const nowDateTime = new Date();

                            // Check if the slot is in the past
                            const isPast = slotDateTime.getTime() < nowDateTime.getTime();

                            // A slot is selectable if it has availability AND is not in the past
                            const isSelectable = slot.availableCount > 0 && !isPast;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSlotClick(slot)}
                                    disabled={!isSelectable}
                                    className={`relative p-3 rounded-xl flex flex-col items-center justify-center transition-all duration-200 border ${isSelectable
                                        ? "bg-white/10 border-white/10 text-white hover:bg-white/20 hover:border-white/20 active:scale-95"
                                        : "bg-white/5 border-transparent text-white/20 cursor-not-allowed"
                                        }`}
                                >
                                    <span className="text-lg font-bold tracking-tight">{formatTime(slot.start)}</span>
                                    {!isSelectable ? (
                                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-red-500" />
                                    ) : (
                                        <span className="text-[10px] uppercase font-bold text-green-400 mt-1">
                                            {slot.availableCount} {slot.availableCount > 1 ? 'terrains' : 'terrain'}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {aggregatedSlots.length === 0 && !loading && (
                            <div className="col-span-full text-center py-8 text-white/50 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                Aucun créneau disponible pour cette date.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Court Selection Popup */}
            <AnimatePresence>
                {isCourtSelectionOpen && selectedTimeSlot && (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCourtSelectionOpen(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 pb-2 flex-shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Choisir un terrain</h3>
                                        <p className="text-blue-400 text-sm font-medium mt-1">
                                            {formatTime(selectedTimeSlot)} • {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(selectedDate)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsCourtSelectionOpen(false)}
                                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 overflow-y-auto px-6 mb-6 flex-grow scrollbar-hide">
                                {courtsData
                                    .filter(court => court.slots.some(s => s.start_time === selectedTimeSlot && s.is_available))
                                    .map(court => {
                                        const isSelected = selectedCourtForSummary?.id === court.id;
                                        return (
                                            <button
                                                key={court.id}
                                                onClick={() => setSelectedCourtForSummary(court)}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${isSelected
                                                    ? "bg-blue-600/20 border-blue-500 scale-[1.02] shadow-md shadow-blue-900/20"
                                                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-medium text-lg ${isSelected ? "text-white" : "text-white"}`}>{court.name}</span>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? "border-blue-500 bg-blue-500" : "border-white/20"
                                                    }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>
                                        );
                                    })
                                }
                            </div>

                            <div className="p-6 pt-0 flex-shrink-0">
                                <button
                                    onClick={handleConfirmedReservationClick}
                                    disabled={!selectedCourtForSummary}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedCourtForSummary
                                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transform active:scale-[0.98]"
                                        : "bg-white/10 text-white/30 cursor-not-allowed"
                                        }`}
                                >
                                    Réserver ce terrain
                                </button>
                                {!selectedCourtForSummary && (
                                    <p className="text-white/40 text-xs text-center mt-3">Veuillez sélectionner un terrain</p>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 4. Summary Popup - CENTRÉ */}
            <AnimatePresence>
                {isSummaryOpen && selectedCourtForSummary && selectedTimeSlot && priceDetails && (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !booking && setIsSummaryOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-3xl z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-900 relative flex items-center justify-center flex-shrink-0">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                                <Clock className="w-16 h-16 text-white/20" />
                                <div className="absolute bottom-4 left-6">
                                    <p className="text-blue-100/80 text-sm font-medium uppercase tracking-wider mb-1">Résumé</p>
                                    <h3 className="text-2xl font-bold text-white">Votre réservation</h3>
                                </div>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto flex-grow">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-400">Date</p>
                                            <p className="text-white font-medium capitalize">
                                                {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(selectedDate)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Clock className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-400">Créneau</p>
                                            <p className="text-white font-medium">
                                                {formatTime(selectedTimeSlot)} - {formatTime(selectedCourtForSummary.slots.find(s => s.start_time === selectedTimeSlot)?.end_time || '')} (1h30)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <MapPin className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-400">Terrain</p>
                                            <p className="text-white font-medium">{selectedCourtForSummary.name}</p>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/10 my-4" />

                                    {/* Breakdown Calculation */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Prix terrain (total)</span>
                                            <span className="text-white font-medium">{priceDetails.total.toFixed(2)}€</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Votre part (1/4)</span>
                                            <span className="text-white font-medium">{priceDetails.perPlayer.toFixed(2)}€</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                <span>Frais de service</span>
                                                <Info className="w-3 h-3 cursor-help text-gray-500" />
                                            </div>
                                            <span className="text-white font-medium">{priceDetails.commission.toFixed(2)}€</span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/10 my-2" />

                                    <div className="flex items-center justify-between">
                                        <p className="text-gray-400 font-medium">Total à payer</p>
                                        <p className="text-2xl font-black text-blue-400">{priceDetails.totalPerPlayer.toFixed(2)}€</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pb-2">
                                    <button
                                        onClick={() => setIsSummaryOpen(false)}
                                        disabled={booking}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleConfirmBooking}
                                        disabled={booking}
                                        className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/25 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {booking ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Validation...
                                            </>
                                        ) : (
                                            "Payer"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

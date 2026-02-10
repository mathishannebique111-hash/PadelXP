"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    format,
    addDays,
    startOfDay,
    endOfDay,
    isSameDay,
    addMinutes,
    isBefore,
    set
} from "date-fns";
import { fr } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Plus,
    Clock,
    Lock,
    ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

interface PlanningManagerProps {
    clubId: string;
}

interface Court {
    id: string;
    name: string;
    opening_hours?: any;
}

interface Reservation {
    id: string;
    court_id: string;
    start_time: string;
    end_time: string;
    status: string;
    title?: string | null;
    profiles?: {
        display_name: string | null;
        first_name: string | null;
        last_name: string | null;
    } | null;
}

export default function PlanningManager({ clubId }: PlanningManagerProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [courts, setCourts] = useState<Court[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [openingHours, setOpeningHours] = useState<any>(null);

    const supabase = createClient();

    const fetchPlanningData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Courts with their specific opening hours
            const { data: courtsData, error: courtsError } = await supabase
                .from("courts")
                .select("id, name, opening_hours")
                .eq("club_id", clubId)
                .order("name");

            if (courtsError) throw courtsError;
            setCourts(courtsData || []);

            // 2. Fetch Reservations for selected date
            const start = startOfDay(selectedDate).toISOString();
            const end = endOfDay(selectedDate).toISOString();

            const { data: resData, error: resError } = await supabase
                .from("reservations")
                .select(`
                    id, 
                    court_id, 
                    start_time, 
                    end_time, 
                    status,
                    title,
                    profiles!created_by (display_name, first_name, last_name)
                `)
                .eq("status", "confirmed")
                .gte("start_time", start)
                .lte("start_time", end);

            if (resError) throw resError;
            setReservations(resData as any[] || []);

        } catch (error: any) {
            console.error("Error fetching planning:", error);
            toast.error("Erreur lors du chargement du planning");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlanningData();
    }, [selectedDate, clubId]);

    const getMasterTimeline = () => {
        if (courts.length === 0) return [];

        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayKey = dayNames[selectedDate.getDay()];

        let earliestStart = 24 * 60; // in minutes
        let latestEnd = 0;
        let anyOpen = false;

        courts.forEach(court => {
            const config = court.opening_hours?.[dayKey];
            if (config?.isOpen) {
                anyOpen = true;
                const [hS, mS] = config.openTime.split(":").map(Number);
                const [hE, mE] = config.closeTime.split(":").map(Number);
                earliestStart = Math.min(earliestStart, hS * 60 + mS);
                latestEnd = Math.max(latestEnd, hE * 60 + mE);
            }
        });

        if (!anyOpen) return [];

        const slots = [];
        let currentTotal = earliestStart;
        while (currentTotal < latestEnd) {
            const h = Math.floor(currentTotal / 60);
            const m = currentTotal % 60;
            slots.push(set(startOfDay(selectedDate), { hours: h, minutes: m }));
            currentTotal += 30; // 30 min master step
        }
        return slots;
    };

    const masterTimeline = getMasterTimeline();
    const isClosed = masterTimeline.length === 0;

    // We track which cells are covered by a rowSpan to skip them
    const occupiedSlots = new Set<string>();

    const isSlotPassed = (slotStart: Date) => {
        return isBefore(slotStart, new Date());
    };

    const isPastDay = isBefore(endOfDay(selectedDate), new Date());

    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockSlot, setBlockSlot] = useState<Date | null>(null);
    const [blockDuration, setBlockDuration] = useState(90);
    const [blockTitle, setBlockTitle] = useState("");
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleBlockClick = (court: Court, slot: Date, existingRes?: Reservation) => {
        if (isSlotPassed(slot)) {
            toast.error("Impossible de modifier un créneau passé");
            return;
        }
        setSelectedCourt(court);
        setBlockSlot(slot);

        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayKey = dayNames[selectedDate.getDay()];
        const config = court.opening_hours?.[dayKey];
        const [closeH, closeM] = (config?.closeTime || "22:00").split(":").map(Number);
        const courtEnd = set(startOfDay(selectedDate), { hours: closeH, minutes: closeM });

        // Calculate max allowed duration (minutes until closing)
        const maxDur = (courtEnd.getTime() - slot.getTime()) / (1000 * 60);

        if (existingRes) {
            setEditingReservation(existingRes);
            setBlockTitle(existingRes.title || "");
            const resDuration = (new Date(existingRes.end_time).getTime() - new Date(existingRes.start_time).getTime()) / (1000 * 60);
            setBlockDuration(resDuration);
        } else {
            setEditingReservation(null);
            setBlockTitle("");
            // Default to 90 min if possible, otherwise max allowed
            setBlockDuration(Math.min(90, maxDur));
        }
        setShowDeleteConfirm(false);
        setShowBlockModal(true);
    };

    const confirmBlock = async () => {
        if (!selectedCourt || !blockSlot) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const start_time = blockSlot.toISOString();
            const end_time = addMinutes(blockSlot, blockDuration).toISOString();

            if (editingReservation) {
                const { error } = await supabase
                    .from("reservations")
                    .update({
                        title: blockTitle || null,
                        start_time,
                        end_time,
                    })
                    .eq("id", editingReservation.id);

                if (error) throw error;
                toast.success("Réservation mise à jour");
            } else {
                const { error } = await supabase
                    .from("reservations")
                    .insert({
                        court_id: selectedCourt.id,
                        created_by: user?.id,
                        start_time,
                        end_time,
                        status: "confirmed",
                        payment_method: "on_site",
                        total_price: 0,
                        title: blockTitle || null,
                    } as any);

                if (error) throw error;
                toast.success(`${selectedCourt.name} bloqué à ${format(blockSlot, "HH:mm")}`);
            }
            setShowBlockModal(false);
            fetchPlanningData();
        } catch (error: any) {
            console.error("Error saving reservation:", error);
            toast.error("Erreur lors de l'enregistrement: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteBlock = async () => {
        if (!editingReservation) return;
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from("reservations")
                .delete()
                .eq("id", editingReservation.id);

            if (error) throw error;
            toast.success("Réservation supprimée");
            setShowBlockModal(false);
            fetchPlanningData();
        } catch (error: any) {
            console.error("Error deleting reservation:", error);
            toast.error("Erreur lors de la suppression: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className={`flex flex-col sm:flex-row justify-between items-center bg-white/5 p-4 rounded-xl border gap-4 transition-colors ${isPastDay ? 'border-red-500/20 bg-red-500/5' : 'border-white/10'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 min-w-[200px] justify-center">
                        <CalendarIcon className={`w-5 h-5 ${isPastDay ? 'text-red-400' : 'text-blue-400'}`} />
                        <span className={`font-semibold capitalize ${isPastDay ? 'text-red-200' : ''}`}>
                            {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                        </span>
                    </div>
                    <button
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className={`text-xs font-medium px-2 py-1 rounded border transition-all ${isPastDay
                            ? 'text-red-400 bg-red-500/10 border-red-500/20 hover:border-red-500/40'
                            : 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40'}`}
                    >
                        Aujourd'hui
                    </button>
                </div>

                <div className="flex items-center gap-6 text-xs text-white/40">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Réservé / Bloqué</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isPastDay ? 'bg-red-500/20' : 'bg-white/10'}`} />
                        <span>Disponible</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-white/40 animate-pulse">Chargement du planning...</p>
                </div>
            ) : courts.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-white/50">Aucun terrain configuré pour ce club.</p>
                </div>
            ) : isClosed ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                    <div className="bg-red-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <Lock className="w-6 h-6 text-red-400" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-1">Club fermé</h4>
                    <p className="text-white/40">Consultez l'onglet "Horaires d'ouverture" pour modifier vos horaires.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 border-b border-r border-white/10 w-24 bg-white/5">
                                    <Clock className="w-4 h-4 mx-auto text-white/40" />
                                </th>
                                {courts.map(court => (
                                    <th key={court.id} className="p-4 border-b border-white/10 text-sm font-semibold text-white">
                                        {court.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {masterTimeline.map(time => {
                                const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                                const dayKey = dayNames[selectedDate.getDay()];
                                const timeStr = time.toISOString();

                                return (
                                    <tr key={timeStr}>
                                        <td className={`p-3 border-r border-b border-white/10 text-center text-xs font-medium bg-white/5 ${isSlotPassed(time) ? 'text-red-400/40' : 'text-white/40'}`}>
                                            {format(time, "HH:mm")}
                                        </td>
                                        {courts.map(court => {
                                            const courtKey = `${court.id}-${timeStr}`;

                                            // Check if this specific 30-min window is already covered by a previous block's rowSpan
                                            if (occupiedSlots.has(courtKey)) return null;

                                            const config = court.opening_hours?.[dayKey];
                                            if (!config?.isOpen) return <td key={court.id} className="border-b border-white/5 bg-black/20" />;

                                            const [hS, mS] = config.openTime.split(":").map(Number);
                                            const [hE, mE] = (config.closeTime || "22:00").split(":").map(Number);
                                            const courtStart = set(startOfDay(selectedDate), { hours: hS, minutes: mS });
                                            const courtEnd = set(startOfDay(selectedDate), { hours: hE, minutes: mE });

                                            if (isBefore(time, courtStart) || !isBefore(time, courtEnd)) {
                                                return <td key={court.id} className="border-b border-white/5 bg-black/20" />;
                                            }

                                            // Find a reservation STARTING EXACTLY at this 'time'
                                            const res = reservations.find(r =>
                                                r.court_id === court.id &&
                                                Math.abs(new Date(r.start_time).getTime() - time.getTime()) < 1000
                                            );

                                            if (res) {
                                                const resDuration = (new Date(res.end_time).getTime() - new Date(res.start_time).getTime()) / (1000 * 60);
                                                const rowSpan = Math.ceil(resDuration / 30);

                                                // Mark subsequent 30-min segments as occupied
                                                for (let i = 1; i < rowSpan; i++) {
                                                    occupiedSlots.add(`${court.id}-${addMinutes(time, i * 30).toISOString()}`);
                                                }

                                                return (
                                                    <td
                                                        key={courtKey}
                                                        rowSpan={rowSpan}
                                                        className="p-1 border-b border-white/5 group relative min-w-[150px] transition-colors bg-blue-500/10"
                                                    >
                                                        <button
                                                            onClick={() => handleBlockClick(court, time, res)}
                                                            className="h-full w-full bg-blue-500/20 border border-blue-500/30 rounded-lg p-2 flex flex-col justify-center gap-1 overflow-hidden hover:bg-blue-500/30 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <Lock className="w-3 h-3 text-blue-400 shrink-0" />
                                                                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider truncate">
                                                                    {res.title || (res.profiles ? (
                                                                        `${res.profiles.first_name || ''} ${res.profiles.last_name || ''}`.trim() || res.profiles.display_name || 'Réservé'
                                                                    ) : 'Bloqué (Admin)')}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] text-blue-400/80">
                                                                {format(new Date(res.start_time), "HH:mm")} - {format(new Date(res.end_time), "HH:mm")}
                                                            </span>
                                                        </button>
                                                    </td>
                                                );
                                            }

                                            // If no reservation starts here, check if we're "in the middle" of a reservation that started earlier
                                            // This is handled by the occupiedSlots.has(courtKey) check at the top.

                                            // Otherwise, render a free cell
                                            const passed = isSlotPassed(time);
                                            return (
                                                <td
                                                    key={courtKey}
                                                    className={`p-1 border-b border-white/5 group relative min-w-[150px] transition-colors ${passed ? 'bg-red-500/10' : 'hover:bg-white/5'}`}
                                                >
                                                    {passed ? (
                                                        <div className="h-10 w-full flex items-center justify-center text-red-400/20">
                                                            <Clock className="w-4 h-4 opacity-50" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleBlockClick(court, time)}
                                                            className="h-10 w-full rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white/20 hover:text-white/40 hover:bg-white/5 transition-all"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Block Modal */}
            {showBlockModal && selectedCourt && blockSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Lock className={`w-5 h-5 ${editingReservation ? 'text-blue-400' : 'text-red-400'}`} />
                                {editingReservation ? "Modifier la réservation" : "Bloquer un terrain"}
                            </h3>
                            <p className="text-white/60 text-sm">
                                {editingReservation
                                    ? `Modification du créneau sur le terrain ${selectedCourt.name}`
                                    : `Vous allez bloquer le terrain ${selectedCourt.name} pour le créneau de ${format(blockSlot, "HH:mm")}.`
                                }
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-xs font-medium text-white/40 ml-1">Titre ou Note (optionnel)</label>
                                    <input
                                        type="text"
                                        value={blockTitle}
                                        onChange={(e) => setBlockTitle(e.target.value)}
                                        placeholder="Ex: Cours de Padel, Entretien..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>
                                <div className="w-24 space-y-1.5">
                                    <label className="text-xs font-medium text-white/40 ml-1">Durée (min)</label>
                                    <select
                                        value={blockDuration}
                                        onChange={(e) => setBlockDuration(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    >
                                        {[30, 60, 90, 120].map(dur => {
                                            const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                                            const dayKey = dayNames[selectedDate.getDay()];
                                            const config = selectedCourt?.opening_hours?.[dayKey];
                                            const [closeH, closeM] = (config?.closeTime || "22:00").split(":").map(Number);
                                            const courtEnd = set(startOfDay(selectedDate), { hours: closeH, minutes: closeM });
                                            const maxDur = blockSlot ? (courtEnd.getTime() - blockSlot.getTime()) / (1000 * 60) : 0;

                                            if (dur > maxDur && dur !== blockDuration) return null;
                                            return <option key={dur} value={dur}>{dur}</option>;
                                        })}
                                        {/* Fallback for odd durations like 45, 75 etc if they occur */}
                                        {![30, 60, 90, 120].includes(blockDuration) && (
                                            <option value={blockDuration}>{blockDuration}</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Date</span>
                                    <span className="text-white font-medium capitalize">{format(selectedDate, "EEEE d MMMM", { locale: fr })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Horaire</span>
                                    <span className="text-white font-medium">{format(blockSlot, "HH:mm")} - {format(addMinutes(blockSlot, blockDuration), "HH:mm")}</span>
                                </div>
                            </div>
                        </div>

                        {showDeleteConfirm ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                                    <p className="text-red-200 text-sm font-medium">
                                        Voulez-vous vraiment supprimer cette réservation ?
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={deleteBlock}
                                        disabled={saving}
                                        className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-500/20"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer la suppression"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 pt-2">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowBlockModal(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={confirmBlock}
                                        disabled={saving}
                                        className={`flex-1 px-4 py-2.5 ${editingReservation ? 'bg-blue-500 hover:bg-blue-400' : 'bg-red-500 hover:bg-red-400'} text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg ${editingReservation ? 'shadow-blue-500/20' : 'shadow-red-500/20'}`}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        {editingReservation ? "Enregistrer" : "Bloquer"}
                                    </button>
                                </div>

                                {editingReservation && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={saving}
                                        className="w-full px-4 py-2 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium border border-transparent"
                                    >
                                        Supprimer cette réservation
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


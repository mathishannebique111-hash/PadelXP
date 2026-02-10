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
            // 1. Fetch Courts
            const { data: courtsData, error: courtsError } = await supabase
                .from("courts")
                .select("id, name")
                .eq("club_id", clubId)
                .order("name");

            if (courtsError) throw courtsError;
            setCourts(courtsData || []);

            // 2. Fetch Club Opening Hours for this club
            const { data: clubData, error: clubError } = await supabase
                .from("clubs")
                .select("opening_hours")
                .eq("id", clubId)
                .single();

            if (clubError) {
                console.error("Error fetching club opening hours:", clubError);
                setOpeningHours({}); // Prevent infinite loading even on error
            } else {
                setOpeningHours(clubData?.opening_hours || {});
            }

            // 3. Fetch Reservations for selected date
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
            if (!openingHours) setOpeningHours({}); // Safety resolve
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlanningData();
    }, [selectedDate, clubId]);

    const getSlotTimeRange = () => {
        if (!openingHours) return { slots: [], closed: false, loading: true };

        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayKey = dayNames[selectedDate.getDay()];
        const dayConfig = openingHours[dayKey];

        if (!dayConfig || !dayConfig.isOpen) {
            return { slots: [], closed: true, loading: false };
        }

        const [startH, startM] = dayConfig.openTime.split(":").map(Number);
        const [endH, endM] = (dayConfig.closeTime || "22:00").split(":").map(Number);

        let current = set(startOfDay(selectedDate), { hours: startH, minutes: startM });
        const endDay = set(startOfDay(selectedDate), { hours: endH, minutes: endM });

        const slots = [];
        while (current < endDay) {
            slots.push(new Date(current));
            current = addMinutes(current, 90);
        }

        return { slots, closed: slots.length === 0, loading: false };
    };

    const { slots: timeSlots, closed: isClosed, loading: isHoursLoading } = getSlotTimeRange();

    const getReservationAt = (courtId: string, slotStart: Date) => {
        return reservations.find(res => {
            const resStart = new Date(res.start_time);
            return res.court_id === courtId && Math.abs(resStart.getTime() - slotStart.getTime()) < 1000;
        });
    };

    const isSlotPassed = (slotStart: Date) => {
        return isBefore(slotStart, new Date());
    };

    const isPastDay = isBefore(endOfDay(selectedDate), new Date());

    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockSlot, setBlockSlot] = useState<Date | null>(null);
    const [blockTitle, setBlockTitle] = useState("");
    const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [saving, setSaving] = useState(false);

    const handleBlockClick = (court: Court, slot: Date, existingRes?: Reservation) => {
        if (isSlotPassed(slot)) {
            toast.error("Impossible de modifier un créneau passé");
            return;
        }
        setSelectedCourt(court);
        setBlockSlot(slot);
        if (existingRes) {
            setEditingReservation(existingRes);
            setBlockTitle(existingRes.title || "");
        } else {
            setEditingReservation(null);
            setBlockTitle("");
        }
        setShowBlockModal(true);
    };

    const confirmBlock = async () => {
        if (!selectedCourt || !blockSlot) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const start_time = blockSlot.toISOString();
            const end_time = addMinutes(blockSlot, 90).toISOString();

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
        if (!confirm("Voulez-vous vraiment supprimer cette réservation ?")) return;

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

            {loading || isHoursLoading ? (
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
                            {timeSlots.map(slot => (
                                <tr key={slot.toString()}>
                                    <td className={`p-3 border-r border-b border-white/10 text-center text-xs font-medium bg-white/5 ${isSlotPassed(slot) ? 'text-red-400/40' : 'text-white/40'}`}>
                                        {format(slot, "HH:mm")}
                                    </td>
                                    {courts.map(court => {
                                        const res = getReservationAt(court.id, slot);
                                        const passed = isSlotPassed(slot);
                                        return (
                                            <td
                                                key={`${court.id}-${slot}`}
                                                className={`p-1 border-b border-white/5 group relative h-16 min-w-[150px] transition-colors ${res ? 'bg-blue-500/10' : passed ? 'bg-red-500/10' : 'hover:bg-white/5'}`}
                                            >
                                                {res ? (
                                                    <button
                                                        onClick={() => handleBlockClick(court, slot, res)}
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
                                                ) : passed ? (
                                                    <div className="h-full w-full flex items-center justify-center text-red-400/20">
                                                        <Clock className="w-4 h-4 opacity-50" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleBlockClick(court, slot)}
                                                        className="h-full w-full rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white/20 hover:text-white/40 hover:bg-white/5 transition-all"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
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
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-white/40 ml-1">Titre ou Note (optionnel)</label>
                                <input
                                    type="text"
                                    value={blockTitle}
                                    onChange={(e) => setBlockTitle(e.target.value)}
                                    placeholder="Ex: Cours de Padel, Entretien..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>

                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Date</span>
                                    <span className="text-white font-medium capitalize">{format(selectedDate, "EEEE d MMMM", { locale: fr })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Horaire</span>
                                    <span className="text-white font-medium">{format(blockSlot, "HH:mm")} - {format(addMinutes(blockSlot, 90), "HH:mm")}</span>
                                </div>
                            </div>
                        </div>

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
                                    onClick={deleteBlock}
                                    disabled={saving}
                                    className="w-full px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium border border-transparent hover:border-red-500/20"
                                >
                                    Supprimer cette réservation
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


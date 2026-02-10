"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used, or replace with console/alert

type DaySchedule = {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    slotDuration: number; // New field: 60, 90, 120
};

type WeeklySchedule = {
    [key: string]: DaySchedule;
};

interface Court {
    id: string;
    name: string;
    opening_hours: WeeklySchedule | null;
}

const DAYS = [
    { key: "monday", label: "Lundi" },
    { key: "tuesday", label: "Mardi" },
    { key: "wednesday", label: "Mercredi" },
    { key: "thursday", label: "Jeudi" },
    { key: "friday", label: "Vendredi" },
    { key: "saturday", label: "Samedi" },
    { key: "sunday", label: "Dimanche" },
];

const DEFAULT_SCHEDULE: WeeklySchedule = DAYS.reduce((acc, day) => {
    acc[day.key] = { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 90 };
    return acc;
}, {} as WeeklySchedule);

export default function ScheduleManager({ clubId }: { clubId: string }) {
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedCourtId, setSelectedCourtId] = useState<string>("");
    const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!clubId) return;

        const fetchData = async () => {
            try {
                // 1. Fetch all courts for this club
                const { data: courtsData, error: courtsError } = await supabase
                    .from("courts")
                    .select("id, name, opening_hours")
                    .eq("club_id", clubId)
                    .order("name");

                if (courtsError) throw courtsError;
                setCourts(courtsData || []);

                if (courtsData && courtsData.length > 0) {
                    const firstCourt = courtsData[0];
                    setSelectedCourtId(firstCourt.id);
                    if (firstCourt.opening_hours) {
                        setSchedule({ ...DEFAULT_SCHEDULE, ...firstCourt.opening_hours });
                    } else {
                        setSchedule(DEFAULT_SCHEDULE);
                    }
                }
            } catch (error: any) {
                console.error("Error fetching schedule data:", error);
                toast.error("Erreur chargement données");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [clubId, supabase]);

    const handleCourtChange = (courtId: string) => {
        setSelectedCourtId(courtId);
        const court = courts.find(c => c.id === courtId);
        if (court?.opening_hours) {
            setSchedule({ ...DEFAULT_SCHEDULE, ...court.opening_hours });
        } else {
            setSchedule(DEFAULT_SCHEDULE);
        }
    };

    const handleFieldChange = (day: string, field: keyof DaySchedule, value: any) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    const toggleDay = (day: string) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: { ...prev[day], isOpen: !prev[day].isOpen, slotDuration: 90 },
        }));
    };

    const saveSchedule = async () => {
        if (!selectedCourtId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("courts")
                .update({ opening_hours: schedule })
                .eq("id", selectedCourtId);

            if (error) throw error;
            toast.success("Horaires du terrain enregistrés !");

            // Update local state for the court list
            setCourts(prev => prev.map(c =>
                c.id === selectedCourtId ? { ...c, opening_hours: schedule } : c
            ));
        } catch (error: any) {
            console.error("Error saving schedule:", error);
            toast.error(error.message || "Erreur lors de la mise à jour");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Court Selection Tabs - Simplified */}
            {courts.length > 1 && (
                <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                    {courts.map((court) => (
                        <button
                            key={court.id}
                            onClick={() => handleCourtChange(court.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCourtId === court.id
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {court.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid gap-4">
                {DAYS.map((day) => (
                    <div
                        key={day.key}
                        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-colors ${schedule[day.key]?.isOpen
                            ? "bg-white/5 border-white/10"
                            : "bg-white/5 border-white/5 opacity-60"
                            }`}
                    >
                        <div className="w-32 font-medium text-white shrink-0">{day.label}</div>

                        <div className="flex items-center gap-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={schedule[day.key]?.isOpen}
                                    onChange={() => toggleDay(day.key)}
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>

                            {schedule[day.key]?.isOpen ? (
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={schedule[day.key]?.openTime}
                                            onChange={(e) => handleFieldChange(day.key, "openTime", e.target.value)}
                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                        />
                                        <span className="text-white/40 text-xs">à</span>
                                        <input
                                            type="time"
                                            value={schedule[day.key]?.closeTime}
                                            onChange={(e) => handleFieldChange(day.key, "closeTime", e.target.value)}
                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                </div>
                            ) : (
                                <div className="text-white/40 text-sm italic">Fermé</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                    onClick={saveSchedule}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enregistrement...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Enregistrer les horaires
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used, or replace with console/alert

type DaySchedule = {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
};

type WeeklySchedule = {
    [key: string]: DaySchedule;
};

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
    acc[day.key] = { isOpen: true, openTime: "09:00", closeTime: "22:00" };
    return acc;
}, {} as WeeklySchedule);

export default function ScheduleManager({ clubId }: { clubId: string }) {
    const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!clubId) return;

        const fetchSchedule = async () => {
            try {
                const { data, error } = await supabase
                    .from("clubs")
                    .select("opening_hours")
                    .eq("id", clubId)
                    .single();

                if (error) throw error;

                if (data.opening_hours) {
                    // Merge with default to ensure all keys exist
                    const loadedSchedule = data.opening_hours as WeeklySchedule;
                    setSchedule((prev) => ({ ...prev, ...loadedSchedule }));
                }
            } catch (error: any) {
                console.error("Error fetching schedule:", error);
                if (typeof window !== "undefined") {
                    toast.error("Erreur chargement horaires: " + (error.message || "Erreur inconnue"));
                }
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [clubId, supabase]);

    const handleTimeChange = (day: string, field: "openTime" | "closeTime", value: string) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    const toggleDay = (day: string) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: { ...prev[day], isOpen: !prev[day].isOpen },
        }));
    };

    const saveSchedule = async () => {
        if (!clubId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("clubs")
                .update({ opening_hours: schedule })
                .eq("id", clubId);

            if (error) throw error;
            toast.success("Horaires hebdomadaires enregistrés !");
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
            <div className="grid gap-4">
                {DAYS.map((day) => (
                    <div
                        key={day.key}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${schedule[day.key]?.isOpen
                            ? "bg-white/5 border-white/10"
                            : "bg-white/5 border-white/5 opacity-60"
                            }`}
                    >
                        <div className="w-32 font-medium text-white">{day.label}</div>

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
                            <div className="flex items-center gap-2">
                                <input
                                    type="time"
                                    value={schedule[day.key]?.openTime}
                                    onChange={(e) => handleTimeChange(day.key, "openTime", e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-white/40">à</span>
                                <input
                                    type="time"
                                    value={schedule[day.key]?.closeTime}
                                    onChange={(e) => handleTimeChange(day.key, "closeTime", e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        ) : (
                            <div className="text-white/40 text-sm italic">Fermé</div>
                        )}
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

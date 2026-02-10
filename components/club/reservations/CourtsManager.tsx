"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Edit2, Shield, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/types/database_local.types";

type Court = Database["public"]["Tables"]["courts"]["Row"];

// Simple pricing rule structure
type PricingRule = {
    days: number[]; // 0-6 (0=Sunday)
    start: string; // "18:00"
    end: string; // "23:00"
    price: number;
};

export default function CourtsManager({ clubId }: { clubId: string }) {
    const [courts, setCourts] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [saving, setSaving] = useState(false);

    // Edit State
    const [priceHour, setPriceHour] = useState<number>(0);
    // Placeholder for pricing rules UI - MVP: just base price first

    // Blocking State
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockDate, setBlockDate] = useState("");
    const [blockStart, setBlockStart] = useState("09:00");
    const [blockEnd, setBlockEnd] = useState("10:00");
    const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

    // Peak Hours State (MVP - optimized for single rule)
    const [peakPrice, setPeakPrice] = useState<string>("");
    const [peakStart, setPeakStart] = useState<string>("");
    const [peakEnd, setPeakEnd] = useState<string>("");



    const supabase = createClient();

    const fetchCourts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("courts")
            .select("*")
            .eq("club_id", clubId)
            .order("name");

        if (error) {
            toast.error("Erreur chargement terrains: " + error.message);
        } else {
            setCourts(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (clubId) fetchCourts();
    }, [clubId]);

    const handleEditClick = (court: Court) => {
        setEditingCourt(court);
        setPriceHour(court.price_hour || 30); // Default 30 if null

        // Reset peak inputs
        setPeakPrice("");
        setPeakStart("");
        setPeakEnd("");

        // Populate if exists
        const rules = (court as any).pricing_rules as PricingRule[];
        if (rules && rules.length > 0) {
            const rule = rules[0];
            setPeakPrice(rule.price.toString());
            setPeakStart(rule.start);
            setPeakEnd(rule.end);
        }


    };

    const saveCourtPrice = async () => {
        if (!editingCourt) return;
        setSaving(true);

        // Convert to number strictly
        const price = Number(priceHour);

        let pricingRules = null;
        if (peakPrice && peakStart && peakEnd) {
            pricingRules = [{
                price: Number(peakPrice),
                start: peakStart,
                end: peakEnd,
                days: [0, 1, 2, 3, 4, 5, 6] // Every day for MVP
            }];
        }

        const { error } = await supabase
            .from("courts")
            .update({
                price_hour: price,
                pricing_rules: pricingRules
            } as any) // Cast as any because of local type mismatch if not updated
            .eq("id", editingCourt.id);

        if (error) {
            toast.error("Erreur sauvegarde prix");
        } else {
            toast.success("Prix mis à jour");
            setEditingCourt(null);
            fetchCourts();
        }
        setSaving(false);
    };

    const handleBlockClick = (courtId: string) => {
        setSelectedCourtId(courtId);
        setShowBlockModal(true);
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setBlockDate(tomorrow.toISOString().split('T')[0]);
    };

    const confirmBlock = async () => {
        if (!selectedCourtId || !blockDate || !blockStart || !blockEnd) return;
        setSaving(true);

        const startDateTime = `${blockDate}T${blockStart}:00`;
        const endDateTime = `${blockDate}T${blockEnd}:00`;

        // Create a "blocked" reservation
        // Using existing reservations table
        // Assuming we can create a reservation with a specific status or just 'confirmed' by admin
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from("reservations")
            .insert({
                court_id: selectedCourtId,
                created_by: user?.id,
                start_time: startDateTime,
                end_time: endDateTime,
                status: "confirmed", // or 'blocked' if we added it to enum
                payment_method: "on_site", // admin/manual blocking
                total_price: 0, // Free blocking
                // Add a note or metadata if possible to say "Blocked by Admin"
                // For now, reliance on created_by being the admin
            } as any);

        if (error) {
            toast.error("Erreur au blocage: " + error.message);
        } else {
            toast.success("Créneau bloqué avec succès");
            setShowBlockModal(false);
        }
        setSaving(false);
    };

    if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto text-white/50" />;

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courts.map((court) => (
                    <div key={court.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-white">{court.name}</h4>
                            <div className={`px-2 py-0.5 rounded textxs ${court.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                {court.is_active ? 'Actif' : 'Inactif'}
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/60">Prix de base:</span>
                                <span className="text-white font-medium">{court.price_hour || "N/A"}€ /h</span>
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => handleEditClick(court)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm py-2 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-3 h-3" /> Tarif
                                </button>
                                <button
                                    onClick={() => handleBlockClick(court.id)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm py-2 rounded-lg transition-colors"
                                >
                                    <Shield className="w-3 h-3" /> Bloquer
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal / Override */}
            {editingCourt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Modifier Tarif - {editingCourt.name}</h3>
                            <button onClick={() => setEditingCourt(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div>
                            <label className="block text-sm text-white/60 mb-1">Prix par heure (€)</label>
                            <input
                                type="number"
                                value={priceHour}
                                onChange={(e) => setPriceHour(Number(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingCourt(null)}
                                className="px-4 py-2 rounded-lg text-white/60 hover:text-white"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={saveCourtPrice}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Modal */}
            {showBlockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Bloquer un créneau</h3>
                            <button onClick={() => setShowBlockModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-white/60 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={blockDate}
                                    onChange={(e) => setBlockDate(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Début</label>
                                    <input
                                        type="time"
                                        value={blockStart}
                                        onChange={(e) => setBlockStart(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/60 mb-1">Fin</label>
                                    <input
                                        type="time"
                                        value={blockEnd}
                                        onChange={(e) => setBlockEnd(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setShowBlockModal(false)}
                                className="px-4 py-2 rounded-lg text-white/60 hover:text-white"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmBlock}
                                disabled={saving}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                Bloquer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

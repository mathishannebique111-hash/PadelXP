"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Save, Loader2, Check } from "lucide-react";
import { logger } from "@/lib/logger";
import { updateProfile } from "@/app/(protected)/settings/actions";

export default function PersonalDetailsSettings() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [originalFirstName, setOriginalFirstName] = useState("");
    const [originalLastName, setOriginalLastName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    // Charger les données actuelles
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("first_name, last_name")
                    .eq("id", user.id)
                    .maybeSingle();

                if (error) {
                    logger.error("[PersonalDetailsSettings] Error loading profile:", error);
                    return;
                }

                if (profile) {
                    setFirstName(profile.first_name || "");
                    setLastName(profile.last_name || "");
                    setOriginalFirstName(profile.first_name || "");
                    setOriginalLastName(profile.last_name || "");
                }
            } catch (err) {
                logger.error("[PersonalDetailsSettings] Error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [supabase]);

    const hasChanges = firstName !== originalFirstName || lastName !== originalLastName;

    const handleSave = async () => {
        if (!hasChanges) return;

        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();

        if (!trimmedFirstName && !trimmedLastName) {
            setError("Au moins un nom ou prénom est requis");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            await updateProfile(trimmedFirstName, trimmedLastName);

            // Mettre à jour les valeurs originales
            setOriginalFirstName(trimmedFirstName);
            setOriginalLastName(trimmedLastName);
            setSuccess(true);

            // Masquer le message de succès après 3 secondes
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            logger.error("[PersonalDetailsSettings] Error saving:", err);
            setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
                <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                    <span className="text-white/70">Chargement...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="text-blue-400" size={20} />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">Mes Informations</h2>
                    <p className="text-sm text-white/50">Vos informations personnelles</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-white/70 mb-1">Prénom</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Votre prénom"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-white/70 mb-1">Nom</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Votre nom"
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Check size={16} />
                        Informations mises à jour avec succès
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-all ${hasChanges && !saving
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                        }`}
                >
                    {saving ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Enregistrement...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Enregistrer
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

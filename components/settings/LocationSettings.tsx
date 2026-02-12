
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Save, Loader2, Check } from "lucide-react";
import { logger } from "@/lib/logger";
import { updateLocation } from "@/app/(protected)/settings/actions";

export default function LocationSettings() {
    const [postalCode, setPostalCode] = useState("");
    const [city, setCity] = useState("");
    const [originalPostalCode, setOriginalPostalCode] = useState("");
    const [originalCity, setOriginalCity] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cityLoading, setCityLoading] = useState(false);

    const supabase = createClient();

    // Charger les données actuelles
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("postal_code, city")
                    .eq("id", user.id)
                    .maybeSingle();

                if (error) {
                    logger.error("[LocationSettings] Error loading profile:", error);
                    return;
                }

                if (profile) {
                    setPostalCode(profile.postal_code || "");
                    setCity(profile.city || "");
                    setOriginalPostalCode(profile.postal_code || "");
                    setOriginalCity(profile.city || "");
                }
            } catch (err) {
                logger.error("[LocationSettings] Error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [supabase]);

    const fetchCityFromPostalCode = useCallback(async (code: string) => {
        if (code.length !== 5) {
            if (code.length === 0) setCity("");
            return;
        }

        // Ne pas re-fetcher si c'est le code original et que la ville est déjà là
        if (code === originalPostalCode && originalCity) {
            setCity(originalCity);
            return;
        }

        setCityLoading(true);
        try {
            const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) setCity(data[0].nom);
                else setCity("");
            }
        } catch {
            setCity("");
        } finally {
            setCityLoading(false);
        }
    }, [originalPostalCode, originalCity]);

    const hasChanges = postalCode !== originalPostalCode || city !== originalCity;

    const handleSave = async () => {
        if (!hasChanges) return;

        const trimmedPostalCode = postalCode.trim();
        const trimmedCity = city.trim();

        if (trimmedPostalCode.length !== 5) {
            setError("Le code postal doit contenir 5 chiffres");
            return;
        }

        if (!trimmedCity) {
            setError("Veuillez sélectionner une ville valide");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await updateLocation(trimmedPostalCode, trimmedCity);

            if (result.success) {
                setOriginalPostalCode(trimmedPostalCode);
                setOriginalCity(trimmedCity);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError("Erreur lors de la mise à jour");
            }
        } catch (err) {
            logger.error("[LocationSettings] Error saving:", err);
            setError("Erreur lors de la sauvegarde");
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
                    <MapPin className="text-blue-400" size={20} />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">Ma Localisation</h2>
                    <p className="text-sm text-white/50">Pour votre classement départemental et régional</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-white/70 mb-1">Code Postal</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            value={postalCode}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                                setPostalCode(v);
                                fetchCityFromPostalCode(v);
                            }}
                            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
                            placeholder="75000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-white/70 mb-1">Ville</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={city}
                                readOnly
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white/70 focus:outline-none cursor-default"
                                placeholder={cityLoading ? "Recherche..." : "Ville"}
                            />
                            {cityLoading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/40" size={16} />
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-xs text-white/40">
                    Ces informations définissent votre département ({postalCode ? postalCode.substring(0, 2) : "--"}) pour les classements.
                </p>

                {error && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Check size={16} />
                        Localisation mise à jour avec succès
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving || postalCode.length !== 5 || !city}
                    className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-all ${hasChanges && !saving && postalCode.length === 5 && city
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

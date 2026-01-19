"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Save, Loader2, Check, AtSign } from "lucide-react";
import { logger } from "@/lib/logger";

export default function UsernameSettings() {
    const [username, setUsername] = useState("");
    const [originalUsername, setOriginalUsername] = useState("");
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
                    .select("username")
                    .eq("id", user.id)
                    .maybeSingle();

                if (error) {
                    logger.error("[UsernameSettings] Error loading profile:", error);
                    return;
                }

                if (profile) {
                    // Supprimer le @ initial pour l'affichage dans l'input
                    const cleanUsername = profile.username ? (profile.username.startsWith('@') ? profile.username.substring(1) : profile.username) : "";
                    setUsername(cleanUsername);
                    setOriginalUsername(cleanUsername);
                }
            } catch (err) {
                logger.error("[UsernameSettings] Error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [supabase]);

    const hasChanges = username !== originalUsername;

    const handleSave = async () => {
        if (!hasChanges) return;

        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setError("Le pseudo est obligatoire");
            return;
        }

        if (trimmedUsername.length < 3) {
            setError("Le pseudo doit contenir au moins 3 caractères");
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
            setError("Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("Utilisateur non connecté");
                setSaving(false);
                return;
            }

            // Ajouter le @ automatique
            const fullUsername = `@${trimmedUsername}`;

            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    username: fullUsername
                })
                .eq("id", user.id);

            if (updateError) {
                // Code erreur PostgreSQL pour contrainte d'unicité violée
                if (updateError.code === '23505') {
                    setError("Ce pseudo est déjà pris, veuillez en choisir un autre");
                } else {
                    logger.error("[UsernameSettings] Error updating profile:", updateError);
                    setError("Erreur lors de la mise à jour");
                }
                setSaving(false);
                return;
            }

            // Mettre à jour les valeurs originales
            setOriginalUsername(trimmedUsername);
            setSuccess(true);

            // Masquer le message de succès après 3 secondes
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            logger.error("[UsernameSettings] Error saving:", err);
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
                    <AtSign className="text-blue-400" size={20} />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">Mon Pseudo</h2>
                    <p className="text-sm text-white/50">Votre identifiant unique PadelXP</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-white/70 mb-1">Pseudo</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-medium">@</span>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="pseudo"
                        />
                    </div>
                    <p className="text-xs text-white/40 mt-1.5">
                        Ce pseudo permet aux autres joueurs de vous ajouter et de voir votre profil.
                    </p>
                </div>

                {error && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Check size={16} />
                        Pseudo mis à jour avec succès
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

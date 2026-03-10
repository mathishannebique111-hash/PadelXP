"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, AlertTriangle, FileText, Shield, Cookie, Scale, Database, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function ClubSettingsContent() {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasReservations, setHasReservations] = useState<boolean | null>(null);
    const [initialLoad, setInitialLoad] = useState(true);
    const router = useRouter();

    // Charger les réglages au montage
    useState(() => {
        const loadSettings = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: adminEntry } = await supabase
                .from("club_admins")
                .select("club_id")
                .eq("user_id", user.id)
                .maybeSingle();

            if (adminEntry?.club_id) {
                const { data: club } = await supabase
                    .from("clubs")
                    .select("has_reservations_option")
                    .eq("id", adminEntry.club_id)
                    .maybeSingle();
                
                if (club) {
                    setHasReservations(!!club.has_reservations_option);
                }
            }
            setInitialLoad(false);
        };
        loadSettings();
    });

    const handleToggleReservations = async (enabled: boolean) => {
        setIsSaving(true);
        setError(null);
        try {
            const response = await fetch("/api/clubs/update-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ has_reservations_option: enabled }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Erreur lors de la mise à jour");
            }

            setHasReservations(enabled);
            router.refresh(); // Pour mettre à jour le layout (menu)
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (confirmText !== "SUPPRIMER") {
            setError("Veuillez taper SUPPRIMER pour confirmer");
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch("/api/clubs/delete-account", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Erreur lors de la suppression du compte");
            }

            // Déconnexion
            const supabase = createClient();
            await supabase.auth.signOut();

            // Redirection vers la page d'accueil
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue");
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Section Fonctionnalités */}
            <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-white/70" />
                        Fonctionnalités
                    </h2>
                    <p className="text-xs text-white/50 mt-1">Activez ou désactivez les modules de votre club</p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${hasReservations ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40'}`}>
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Système de réservations</h3>
                                <p className="text-xs text-white/50 mt-0.5">Permettre aux joueurs de réserver des terrains</p>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => handleToggleReservations(!hasReservations)}
                            disabled={isSaving || initialLoad}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                                hasReservations ? 'bg-blue-600' : 'bg-white/10'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    hasReservations ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </section>


            {/* Section Légal & Conformité */}
            <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Scale className="w-5 h-5 text-white/70" />
                        Légal & Conformité
                    </h2>
                    <p className="text-xs text-white/50 mt-1">Documents et options de conformité pour votre club</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                        href="/legal?returnTo=/dashboard/parametres"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <FileText className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                        <span className="text-sm text-white/70 group-hover:text-white">Mentions légales</span>
                        <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </Link>

                    <Link
                        href="/cgv?returnTo=/dashboard/parametres"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <FileText className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                        <span className="text-sm text-white/70 group-hover:text-white">CGV</span>
                        <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </Link>

                    <Link
                        href="/terms?returnTo=/dashboard/parametres"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <FileText className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                        <span className="text-sm text-white/70 group-hover:text-white">CGU Clubs</span>
                        <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </Link>

                    <Link
                        href="/privacy?returnTo=/dashboard/parametres"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <Shield className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                        <span className="text-sm text-white/70 group-hover:text-white">Confidentialité</span>
                        <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </Link>

                    <Link
                        href="/cookies?returnTo=/dashboard/parametres"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <Cookie className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                        <span className="text-sm text-white/70 group-hover:text-white">Politique Cookies</span>
                        <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </Link>

                    <Link
                        href="/dpa?returnTo=/dashboard/parametres"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <Shield className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                        <span className="text-sm text-white/70 group-hover:text-white">DPA / RGPD</span>
                        <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </Link>

                    <button
                        onClick={async (e) => {
                            const btn = e.currentTarget;
                            btn.disabled = true;
                            try {
                                const response = await fetch('/api/rgpd/export-data');
                                if (!response.ok) throw new Error('Erreur lors de l\'export');

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `padelxp-export-${Date.now()}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            } catch (err: any) {
                                alert(err.message || 'Une erreur est survenue lors de l\'export');
                            } finally {
                                btn.disabled = false;
                            }
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group sm:col-span-2 text-left w-full disabled:opacity-50"
                    >
                        <Database className="w-4 h-4 text-white/60 group-hover:text-white/80" />
                        <span className="text-sm text-white/70 group-hover:text-white">Télécharger mes données (PDF)</span>
                        <ExternalLink className="w-3 h-3 text-white/40 ml-auto" />
                    </button>
                </div>
            </section>

            {/* Zone de danger */}
            <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-red-500/50 bg-red-500/10 p-4 sm:p-5 md:p-6">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Zone de danger
                    </h2>
                    <p className="text-sm text-white/70 mt-1">
                        Ces actions sont irréversibles. Procédez avec prudence.
                    </p>
                </div>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 hover:border-red-400/60 transition-all font-semibold text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer définitivement mon club
                    </button>
                ) : (
                    <div className="space-y-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-white font-semibold">Êtes-vous sûr de vouloir supprimer votre club ?</p>
                                <p className="text-xs text-white/60 mt-1">
                                    Cette action est <strong>irréversible</strong>. Toutes les données du club seront définitivement supprimées :
                                </p>
                                <ul className="text-xs text-white/50 mt-2 space-y-1 list-disc list-inside">
                                    <li>Profils des membres et leur historique</li>
                                    <li>Tous les matchs enregistrés</li>
                                    <li>Les challenges et tournois</li>
                                    <li>L'abonnement sera résilié</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-white/60 block mb-2">
                                Pour confirmer, tapez <strong className="text-red-300">SUPPRIMER</strong> ci-dessous :
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="SUPPRIMER"
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-red-500/50"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-400">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setConfirmText("");
                                    setError(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white/70 hover:bg-white/15 hover:text-white transition-all font-semibold text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || confirmText !== "SUPPRIMER"}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 border border-red-500 text-white hover:bg-red-500 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Suppression...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Supprimer
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

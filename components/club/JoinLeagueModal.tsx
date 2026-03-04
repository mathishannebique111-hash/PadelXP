"use client";

import { useState } from "react";
import { X, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface JoinLeagueModalProps {
    onClose: () => void;
    onJoined: () => void;
}

export default function JoinLeagueModal({ onClose, onJoined }: JoinLeagueModalProps) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!code.trim() || code.trim().length !== 6) {
            toast.error("Le code doit faire 6 caractères");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/leagues/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ invite_code: code.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Erreur");
                return;
            }
            toast.success(`Vous avez rejoint la ligue "${data.league_name}" !`);
            onJoined();
        } catch (e) {
            toast.error("Erreur lors de la connexion");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0f2c] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-white/40 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)' }}>
                        <KeyRound size={20} style={{ color: 'rgb(var(--theme-secondary-accent))' }} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Rejoindre une ligue</h3>
                        <p className="text-xs text-white/40">Entrez le code d'invitation</p>
                    </div>
                </div>

                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="ABC123"
                    className="w-full h-14 rounded-xl bg-white/10 border border-white/20 px-4 text-center text-white text-2xl font-black tracking-[0.5em] placeholder:text-white/20 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 transition-all"
                    style={{ focusRingColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.5)' } as any}
                    maxLength={6}
                    autoFocus={false}
                />

                <button
                    onClick={handleJoin}
                    disabled={loading || code.trim().length !== 6}
                    className="w-full mt-4 py-3.5 rounded-xl font-black text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                    style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: 'var(--theme-player-page, #071554)' }}
                >
                    {loading ? "Connexion..." : "Rejoindre la ligue"}
                </button>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminAccessPage() {
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();
    const ADMIN_EMAIL = "contactpadelxp@gmail.com";

    // Check account existence on mount
    useEffect(() => {
        checkAdminStatus();
    }, []);

    const checkAdminStatus = async () => {
        try {
            const res = await fetch("/api/admin/check", { method: "POST" });
            const data = await res.json();
            setExists(data.exists);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Erreur de création");

            setSuccess("Compte Admin restauré avec succès ! Initialisation de la connexion...");

            // Auto-login after creation
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: ADMIN_EMAIL,
                password: password,
            });

            if (loginError) throw loginError;

            router.push("/admin/messages");
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: ADMIN_EMAIL,
                password: password,
            });

            if (error) throw error;

            router.push("/admin/messages");
        } catch (err: any) {
            setError("Mot de passe incorrect");
            setLoading(false);
        }
    };

    if (loading && !exists && !success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                Chargement...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
            <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-[#BFFF00]">
                    {exists ? "Portail Admin Secrète" : "Restauration Admin"}
                </h1>

                <div className="mb-6 p-3 bg-blue-900/40 border border-blue-500/30 rounded-lg text-sm text-blue-200">
                    Email cible : <span className="font-mono font-bold text-white">{ADMIN_EMAIL}</span>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-900/40 border border-red-500/30 rounded-lg text-sm text-red-200">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-3 bg-green-900/40 border border-green-500/30 rounded-lg text-sm text-green-200 animate-pulse">
                        {success}
                    </div>
                )}

                <form onSubmit={exists ? handleLogin : handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">
                            {exists ? "Entrez votre mot de passe" : "Définissez un nouveau mot de passe"}
                        </label>
                        <input
                            type="password"
                            required
                            autoFocus
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                            placeholder={exists ? "••••••••" : "Nouveau mot de passe (min 6 car.)"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-[#BFFF00] text-black font-bold hover:bg-[#a6e600] transition-colors disabled:opacity-50"
                    >
                        {loading ? "Traitement..." : exists ? "Connexion Admin" : "Créer le compte Admin"}
                    </button>
                </form>
            </div>
        </div>
    );
}

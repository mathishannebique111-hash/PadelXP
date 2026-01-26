"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Send, Building2, MapPin, User, Phone, Mail } from "lucide-react";

interface ClubsContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ClubsContactModal({ isOpen, onClose }: ClubsContactModalProps) {
    const [formData, setFormData] = useState({
        clubName: "",
        city: "",
        contactName: "",
        phone: "",
        email: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/contact/clubs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Une erreur est survenue");
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData({ clubName: "", city: "", contactName: "", phone: "", email: "" });
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Entête avec dégradé */}
                            <div className="relative p-6 pb-8 bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-b border-white/5">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <h2 className="text-2xl font-bold text-white mb-2">Rejoindre PadelXP</h2>
                                <p className="text-white/60 text-sm">
                                    Remplissez ce formulaire pour être contacté par notre équipe.
                                </p>
                            </div>

                            {/* Contenu du formulaire */}
                            <div className="p-6 md:p-8 overflow-y-auto">
                                {success ? (
                                    <div className="flex flex-col items-center justify-center text-center py-8">
                                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                                            <Send className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Message envoyé !</h3>
                                        <p className="text-white/60">
                                            Merci pour votre intérêt. Notre équipe vous recontactera sous 24h ouvrées.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {error && (
                                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                                                {error}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5 ml-1">
                                                    Votre Structure
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="relative">
                                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="Nom du club"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 focus:border-[#0066FF]/50 transition-all text-sm"
                                                            value={formData.clubName}
                                                            onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="Ville"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 focus:border-[#0066FF]/50 transition-all text-sm"
                                                            value={formData.city}
                                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5 ml-1 mt-2">
                                                    Vos Coordonnées
                                                </label>
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="Nom et prénom complet"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 focus:border-[#0066FF]/50 transition-all text-sm"
                                                            value={formData.contactName}
                                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                                        <input
                                                            type="tel"
                                                            required
                                                            placeholder="Numéro de téléphone"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 focus:border-[#0066FF]/50 transition-all text-sm"
                                                            value={formData.phone}
                                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                                        <input
                                                            type="email"
                                                            required
                                                            placeholder="Email professionnel"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 focus:border-[#0066FF]/50 transition-all text-sm"
                                                            value={formData.email}
                                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-bold text-sm shadow-[0_0_20px_rgba(0,102,255,0.3)] hover:shadow-[0_0_30px_rgba(0,102,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Envoi en cours...
                                                    </>
                                                ) : (
                                                    "Envoyer la demande"
                                                )}
                                            </button>
                                            <p className="text-center text-xs text-white/40 mt-3">
                                                En envoyant ce formulaire, vous acceptez d'être recontacté par PadelXP.
                                            </p>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

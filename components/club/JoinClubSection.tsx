"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClubSelector from "@/components/auth/ClubSelector";
import { Trophy, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function JoinClubSection() {
    const router = useRouter();
    const [selectedClub, setSelectedClub] = useState<any>(null);
    const [invitationCode, setInvitationCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!selectedClub || !invitationCode) {
            toast.error("Veuillez sélectionner un club et entrer le code d'invitation.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/player/join-club", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    club_slug: selectedClub.slug,
                    code: invitationCode,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Une erreur est survenue lors de la jonction.");
            }

            toast.success("Bienvenue dans votre nouveau club !");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-padel-green" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Rejoindre votre club</h2>
                        <p className="text-sm text-white/50">Accédez aux classements et challenges de votre complexe.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <ClubSelector
                        selectedClub={selectedClub}
                        onSelect={(club) => setSelectedClub(club)}
                        className="w-full"
                    />

                    {selectedClub && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <div>
                                <label className="block text-[10px] text-white/70 mb-1.5 font-medium ml-1">
                                    Code d'invitation
                                </label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Saisissez le code du club..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-padel-green transition-colors"
                                        value={invitationCode}
                                        onChange={(e) => setInvitationCode(e.target.value)}
                                    />
                                </div>
                                <p className="mt-2 text-[10px] text-white/30 italic ml-1">
                                    Demandez ce code à l'accueil de votre club ou à vos partenaires.
                                </p>
                            </div>

                            <button
                                onClick={handleJoin}
                                disabled={loading || !invitationCode}
                                className="w-full mt-4 flex items-center justify-center gap-2 bg-padel-green hover:bg-padel-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all group"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Confirmer et rejoindre
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

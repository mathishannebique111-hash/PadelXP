"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Calendar, Star, Crown, Lock, Sparkles, ArrowRight } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getProfileVisitors } from "@/app/actions/profile-views";
import PageTitle from "@/components/PageTitle";
import { useRouter } from "next/navigation";

export default function VisitorsList() {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function fetchVisitors() {
            const result = await getProfileVisitors();
            if (result.success && result.visitors) {
                setVisitors(result.visitors);
                setIsPremiumUser(result.isPremium || false);
            }
            setIsLoading(false);
        }
        fetchVisitors();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-500/20 rounded-full animate-spin" />
                <p className="text-gray-400 font-medium">Chargement de vos visiteurs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageTitle title="Qui a vu mon profil ?" />

            <div className="mt-4 md:mt-8 relative">
                {visitors.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={32} className="text-gray-500" />
                        </div>
                        <h3 className="text-white font-bold mb-1">Aucune visite pour le moment</h3>
                        <p className="text-gray-500 text-sm">Partagez votre profil avec d'autres joueurs !</p>
                    </div>
                ) : (
                    <div className={`relative rounded-3xl overflow-hidden ${!isPremiumUser ? 'min-h-[450px] md:min-h-[400px]' : ''}`}>
                        {/* Overlay si non premium */}
                        {!isPremiumUser && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[8px] p-6 text-center border border-white/10 rounded-3xl">
                                <div className="mb-4 p-3 md:p-4 rounded-full bg-amber-500/20 border border-amber-500/40">
                                    <Lock className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-tight">Accès Premium</h3>
                                <p className="text-slate-300 mb-6 md:mb-8 max-w-[260px] md:max-w-xs text-xs md:text-sm font-medium leading-relaxed">
                                    Découvrez qui s'intéresse à votre profil et boostez vos chances de trouver des partenaires.
                                </p>
                                <button
                                    onClick={() => router.push(`/premium?returnPath=${window.location.pathname}`)}
                                    className="group relative flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-xl md:rounded-2xl text-black font-black text-xs md:text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 transition-all uppercase tracking-wide"
                                >
                                    <Sparkles size={16} className="animate-pulse" />
                                    <span>DEVENIR PREMIUM</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        <div className={`grid gap-3 ${!isPremiumUser ? 'pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            {visitors.map((visitor, idx) => {
                                const profile = visitor.viewer_profile;
                                const playerName = profile.first_name && profile.last_name
                                    ? `${profile.first_name} ${profile.last_name}`
                                    : profile.display_name || "Joueur";

                                const initials = profile.first_name && profile.last_name
                                    ? `${profile.first_name[0]}${profile.last_name[0]}`
                                    : profile.display_name?.[0]?.toUpperCase() || "J";

                                const visitDate = new Date(visitor.viewed_at);
                                const relativeDate = formatDistanceToNow(visitDate, { addSuffix: true, locale: fr });

                                return (
                                    <motion.div
                                        key={visitor.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <div
                                            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl transition-all"
                                        >
                                            {/* Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${profile.is_premium ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-white/10'}`}>
                                                    {profile.avatar_url ? (
                                                        <Image
                                                            src={profile.avatar_url}
                                                            alt={playerName}
                                                            width={56}
                                                            height={56}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${profile.is_premium ? 'from-amber-400 to-amber-600' : 'from-blue-500 to-indigo-600'}`}>
                                                            {initials}
                                                        </div>
                                                    )}
                                                </div>
                                                {profile.is_premium && (
                                                    <div className="absolute -top-1 -right-1 bg-amber-500 text-black p-1 rounded-full shadow-lg">
                                                        <Crown size={10} fill="currentColor" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Infos */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className="text-white font-bold truncate">{playerName}</h4>
                                                    {profile.is_premium && (
                                                        <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-500/20">
                                                            PRO
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-[11px]">
                                                    {profile.niveau_padel && (
                                                        <div className="flex items-center gap-1 text-gray-400">
                                                            <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                                            <span>Niveau {profile.niveau_padel.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 text-blue-300/60">
                                                        <Calendar size={10} />
                                                        <span>{relativeDate}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

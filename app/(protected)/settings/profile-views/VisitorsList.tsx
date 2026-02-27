"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Calendar, Star, ChevronRight, Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getProfileVisitors } from "@/app/actions/profile-views";
import PageTitle from "@/components/PageTitle";

export default function VisitorsList() {
    const [visitors, setVisitors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchVisitors() {
            const result = await getProfileVisitors();
            if (result.success && result.visitors) {
                setVisitors(result.visitors);
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
            <PageTitle title="Qui a vu mon profil" />

            <div className="mt-8 space-y-4">
                {visitors.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={32} className="text-gray-500" />
                        </div>
                        <h3 className="text-white font-bold mb-1">Aucune visite pour le moment</h3>
                        <p className="text-gray-500 text-sm">Partagez votre profil avec d'autres joueurs !</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
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
                                    <Link
                                        href={`/player/${profile.username?.replace('@', '') || profile.id}`}
                                        className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
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

                                        <ChevronRight size={18} className="text-white/20 group-hover:text-white/40 transition-colors" />
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

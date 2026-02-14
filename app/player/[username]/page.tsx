import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Star, Shield, ArrowLeftRight, Hand, Zap, Calendar, MapPin } from "lucide-react";

// Client admin pour bypass RLS (lecture profil public)
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

interface Props {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
    const resolvedParams = await params;
    const username = decodeURIComponent(resolvedParams.username);

    return {
        title: `Profil de ${username} - PadelXP`,
        description: `Découvrez le profil Padel et les statistiques de ${username} sur PadelXP.`,
    };
}

export default async function PublicProfilePage({ params }: Props) {
    const resolvedParams = await params;
    let username = decodeURIComponent(resolvedParams.username);

    // Ajouter le @ si manquant pour la recherche DB (convention: username commence par @ en DB)
    if (!username.startsWith('@')) {
        username = '@' + username;
    }

    // 1. Démarrer les requêtes en parallèle (Session + Profil)
    const supabase = await createClient();

    const [sessionResult, profileResult] = await Promise.all([
        supabase.auth.getSession(),
        supabaseAdmin
            .from('profiles')
            .select(`
                id, 
                display_name, 
                first_name, 
                last_name, 
                username, 
                avatar_url, 
                niveau_padel, 
                global_points, 
                club_id,
                city,
                level,
                preferred_side,
                hand,
                best_shot,
                frequency,
                clubs(name)
            `)
            .eq('username', username)
            .maybeSingle()
    ]);

    const { data: { user: currentUser } } = sessionResult;
    const { data: profile, error } = profileResult;

    if (error || !profile) {
        console.error("Error fetching profile:", error);
        return notFound();
    }

    // Si c'est mon propre profil, rediriger vers /home?tab=profil
    if (currentUser && profile.id === currentUser.id) {
        redirect('/home?tab=profil');
    }

    const points = profile.global_points || 0;

    function getTierConfig(p: number) {
        if (p >= 1000) return {
            tier: "Champion",
            colors: "from-purple-600 to-fuchsia-500",
            border: "border-purple-500/30",
            text: "text-purple-400",
            glow: "shadow-purple-500/20"
        };
        if (p >= 600) return {
            tier: "Diamant",
            colors: "from-cyan-500 to-blue-500",
            border: "border-cyan-500/30",
            text: "text-cyan-400",
            glow: "shadow-cyan-500/20"
        };
        if (p >= 300) return {
            tier: "Or",
            colors: "from-amber-400 to-yellow-500",
            border: "border-yellow-500/30",
            text: "text-yellow-400",
            glow: "shadow-yellow-500/20"
        };
        if (p >= 100) return {
            tier: "Argent",
            colors: "from-zinc-300 to-zinc-500",
            border: "border-zinc-400/30",
            text: "text-zinc-300",
            glow: "shadow-zinc-400/20"
        };
        return {
            tier: "Bronze",
            colors: "from-orange-400 to-orange-600",
            border: "border-orange-500/30",
            text: "text-orange-400",
            glow: "shadow-orange-500/20"
        };
    }

    const tierConfig = getTierConfig(points);

    const translate = {
        side: { left: "Gauche", right: "Droite", indifferent: "Polyvalent" },
        hand: { left: "Gaucher", right: "Droitier" },
        shot: { smash: "Smash", vibora: "Vibora", lob: "Lob", defense: "Bajada" },
        freq: { monthly: "1-2x / mois", weekly: "1x / semaine", "2-3weekly": "2-3x / sem.", "3+weekly": "+3x / sem." }
    };

    return (
        <div className="min-h-screen bg-[#0A0F1E] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(0,102,255,0.15),transparent_60%)] pointer-events-none" />
            <div className={`absolute -top-[20%] -left-[20%] w-[60%] h-[60%] bg-${tierConfig.colors.split(' ')[1]} opacity-[0.03] blur-[120px] rounded-full pointer-events-none`} />

            <div className="relative z-10 w-full max-w-sm">
                {/* Logo PadelXP en haut */}
                <div className="flex justify-center mb-8">
                    <Image src="/images/Logo.png" alt="PadelXP" width={100} height={32} className="opacity-80" />
                </div>

                {/* THE CARD */}
                <div className={`bg-white/[0.03] backdrop-blur-2xl border ${tierConfig.border} rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl ${tierConfig.glow} relative overflow-hidden group`}>

                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                    {/* Tier Badge Float */}
                    <div className={`absolute top-6 right-8 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${tierConfig.border} bg-white/5 ${tierConfig.text}`}>
                        {tierConfig.tier}
                    </div>

                    {/* Avatar with Glow */}
                    <div className="relative mb-6">
                        <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${tierConfig.colors} p-1 shadow-2xl`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-[#0F172A] relative flex items-center justify-center backdrop-blur-sm">
                                {profile.avatar_url ? (
                                    <Image
                                        src={profile.avatar_url}
                                        alt={profile.display_name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="text-4xl font-black text-white">
                                        {(profile.first_name?.[0] || profile.display_name?.[0] || '?').toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                        {profile.club_id && (
                            <div className="absolute -bottom-1 right-2 bg-[#0F172A] rounded-full p-2 border border-white/10 shadow-lg" title={(profile.clubs as any)?.[0]?.name || "Club"}>
                                <Shield size={18} className="text-padel-green" />
                            </div>
                        )}
                    </div>

                    {/* Player Identity */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-white tracking-tight mb-1">{profile.display_name}</h1>
                        <p className="text-white/40 font-medium text-sm flex items-center justify-center gap-2">
                            {profile.username}
                            {profile.city && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="flex items-center gap-1 opacity-80 uppercase tracking-tighter text-[10px]">
                                        <MapPin size={10} /> {profile.city}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>

                    {/* PRECISE LEVEL - BIG HIGHLIGHT */}
                    <div className="w-full mb-8 relative">
                        <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
                        <div className="relative bg-white/5 rounded-3xl p-5 border border-white/10">
                            <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/40 mb-2">Padel Level</div>
                            <div className="text-5xl font-black text-white flex items-center justify-center gap-2">
                                {profile.niveau_padel ? profile.niveau_padel.toFixed(2) : '3.00'}
                                <Star size={24} className="text-padel-green fill-padel-green animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Characteristics Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full mb-8">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                            <ArrowLeftRight size={16} className="text-blue-400 mb-2" />
                            <div className="text-[9px] uppercase font-bold text-white/30 mb-0.5">Position</div>
                            <div className="text-xs font-bold text-white/80">{(translate.side as any)[profile.preferred_side] || '-'}</div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                            <Hand size={16} className="text-orange-400 mb-2" />
                            <div className="text-[9px] uppercase font-bold text-white/30 mb-0.5">Main</div>
                            <div className="text-xs font-bold text-white/80">{(translate.hand as any)[profile.hand] || '-'}</div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                            <Zap size={16} className="text-yellow-400 mb-2" />
                            <div className="text-[9px] uppercase font-bold text-white/30 mb-0.5">Signature</div>
                            <div className="text-xs font-bold text-white/80">{(translate.shot as any)[profile.best_shot] || '-'}</div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                            <Calendar size={16} className="text-padel-green mb-2" />
                            <div className="text-[9px] uppercase font-bold text-white/30 mb-0.5">Fréquence</div>
                            <div className="text-xs font-bold text-white/80">{(translate.freq as any)[profile.frequency] || '-'}</div>
                        </div>
                    </div>

                    {/* Actions - Interactive for app users */}
                    <div className="w-full">
                        <Link
                            href={`/match/new?opponentId=${profile.id}`}
                            className="w-full py-4 px-6 bg-padel-green hover:bg-padel-green/90 text-black font-extrabold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-padel-green/20 text-lg uppercase tracking-tight"
                        >
                            <Trophy size={22} fill="black" />
                            Défier ce joueur
                        </Link>
                    </div>
                </div>

                {/* Footnote */}
                <p className="text-center text-white/20 text-[10px] mt-8 uppercase tracking-[0.2em] font-medium">
                    © 2026 PadelXP • L'élite du Padel
                </p>
            </div>
        </div>
    );
}

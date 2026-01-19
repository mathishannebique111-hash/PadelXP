import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Medal, Star, ArrowRight, UserPlus, Shield } from "lucide-react";
import PageTitle from "@/components/PageTitle";

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

    // Récupérer le user courant (pour le bouton retour / logique d'invitation)
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getSession();

    // Récupérer le profil public
    const { data: profile, error } = await supabaseAdmin
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
      matches_played, 
      matches_won,
      club_id,
      clubs(name)
    `)
        .eq('username', username)
        .maybeSingle();

    if (error || !profile) {
        console.error("Error fetching profile:", error);
        return notFound();
    }

    // Si c'est mon propre profil, rediriger vers /home?tab=profil
    if (currentUser && profile.id === currentUser.id) {
        redirect('/home?tab=profil');
    }

    const winRate = profile.matches_played > 0
        ? Math.round((profile.matches_won / profile.matches_played) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            {/* Background avec overlay */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />

            <div className="relative z-10 max-w-md mx-auto px-4 py-8">
                {/* En-tête simplifié */}
                <div className="flex justify-between items-center mb-8">
                    <Link href="/" className="text-white/70 hover:text-white transition-colors">
                        PadelXP
                    </Link>
                    {currentUser ? (
                        <Link href="/home" className="text-sm bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors">
                            Mon Espace
                        </Link>
                    ) : (
                        <Link href="/login" className="text-sm bg-padel-green text-black font-medium px-3 py-1.5 rounded-full hover:bg-padel-green/90 transition-colors">
                            Connexion
                        </Link>
                    )}
                </div>

                {/* Carte Profil */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
                    {/* Effet halo */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 p-1 shadow-lg ring-4 ring-white/5">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 relative flex items-center justify-center">
                                {profile.avatar_url ? (
                                    <Image
                                        src={profile.avatar_url}
                                        alt={profile.display_name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {(profile.first_name?.[0] || profile.display_name?.[0] || '?').toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                        {profile.club_id && (
                            <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-700 shadow-sm" title={profile.clubs?.name || "Club"}>
                                <Shield size={16} className="text-padel-green" />
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-1">{profile.display_name}</h1>
                    <p className="text-blue-300 font-medium mb-4">{profile.username}</p>

                    {(profile.clubs?.name) && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 mb-6">
                            <Shield size={12} className="text-padel-green" />
                            <span>{profile.clubs.name}</span>
                        </div>
                    )}

                    {/* Stats Rapides */}
                    <div className="grid grid-cols-3 gap-3 w-full mb-8">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                            <div className="text-xs text-gray-400 mb-1">Niveau</div>
                            <div className="text-xl font-bold text-white flex items-center gap-1">
                                {profile.niveau_padel ? profile.niveau_padel.toFixed(1) : '-'}
                                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                            <div className="text-xs text-gray-400 mb-1">Points</div>
                            <div className="text-xl font-bold text-padel-green">
                                {profile.global_points || 0}
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                            <div className="text-xs text-gray-400 mb-1">Victoires</div>
                            <div className="text-xl font-bold text-blue-400">
                                {winRate}%
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full space-y-3">
                        {currentUser ? (
                            <Link
                                href={`/match/new?opponentId=${profile.id}`}
                                className="w-full py-3.5 px-6 bg-padel-green hover:bg-padel-green/90 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-900/20"
                            >
                                <Trophy size={18} />
                                Défier ce joueur
                            </Link>
                        ) : (
                            <Link
                                href={`/login?redirect=/match/new?opponentId=${profile.id}`}
                                className="w-full py-3.5 px-6 bg-padel-green hover:bg-padel-green/90 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-900/20"
                            >
                                <Trophy size={18} />
                                Se connecter pour jouer
                            </Link>
                        )}

                        {!currentUser && (
                            <p className="text-xs text-gray-500 mt-2">
                                Rejoins PadelXP pour jouer avec {profile.first_name || profile.display_name} !
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ConfirmationClient from "./ConfirmationClient";
import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";

// Initialiser le client admin pour contourner RLS (le guest n'est pas authentifié)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Force dynamic rendering required for searchParams usage
export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function GuestConfirmationPage({ searchParams }: PageProps) {
    const guestId = typeof searchParams.id === 'string' ? searchParams.id : null;
    const matchId = typeof searchParams.matchId === 'string' ? searchParams.matchId : null;

    if (!guestId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
                    <p className="text-gray-600">L'identifiant du joueur est manquant.</p>
                </div>
            </div>
        );
    }

    // Fetch guest info
    const { data: guest, error: guestError } = await supabase
        .from("guest_players")
        .select("first_name, last_name")
        .eq("id", guestId)
        .single();

    if (guestError || !guest) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Joueur introuvable</h1>
                    <p className="text-gray-600">Ce profil invité n'existe plus ou le lien est incorrect.</p>
                </div>
            </div>
        );
    }

    // Si pas de matchId, on ne peut pas deviner quel match confirmer
    // (Ou alors on prend le dernier pending... mais c'est risqué. Mieux vaut demander matchId)
    if (!matchId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Lien incomplet</h1>
                    <p className="text-gray-600">L'identifiant du match est manquant dans le lien. Veuillez utiliser le lien reçu dans le dernier email envoyé.</p>
                </div>
            </div>
        );
    }

    // Fetch match info
    const { data: match, error: matchError } = await supabase
        .from("matches")
        .select(`
      id, 
      played_at, 
      status, 
      score_team1, 
      score_team2,
      score_details,
      winner_team_id,
      team1_id,
      location_club_id, 
      is_registered_club
    `)
        .eq("id", matchId)
        .single();

    if (matchError || !match) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Match introuvable</h1>
                    <p className="text-gray-600">Ce match n'existe pas ou a été supprimé.</p>
                </div>
            </div>
        );
    }

    // Fetch club name separately to avoid foreign key issues (PGRST200)
    let clubName = "Club inconnu";
    if (match.location_club_id) {
        if (match.is_registered_club) {
            const { data: club } = await supabase
                .from('clubs')
                .select('name')
                .eq('id', match.location_club_id)
                .maybeSingle();
            if (club) clubName = club.name;
        } else {
            const { data: unregClub } = await supabase
                .from('unregistered_clubs')
                .select('name')
                .eq('id', match.location_club_id)
                .maybeSingle();
            if (unregClub) clubName = unregClub.name;
        }
    }
    // Fetch participants for names
    const { data: participants } = await supabase
        .from("match_participants")
        .select("user_id, player_type, guest_player_id, team")
        .eq("match_id", matchId);

    // Fetch details for all participants
    let team1Names: string[] = [];
    let team2Names: string[] = [];
    let userIds = participants?.filter(p => p.player_type === 'user').map(p => p.user_id) || [];
    let guestIds = participants?.filter(p => p.player_type === 'guest').map(p => p.guest_player_id) || [];

    const { data: userProfiles } = await supabase.from("profiles").select("id, display_name, first_name, last_name").in("id", userIds);
    const { data: guestProfiles } = await supabase.from("guest_players").select("id, first_name, last_name").in("id", guestIds);

    participants?.forEach(p => {
        let name = "Joueur";
        if (p.player_type === 'user') {
            const profile = userProfiles?.find(u => u.id === p.user_id);
            if (profile) name = profile.display_name || `${profile.first_name} ${profile.last_name}`.trim();
        } else {
            const g = guestProfiles?.find(gp => gp.id === p.guest_player_id);
            if (g) name = `${g.first_name} ${g.last_name}`.trim();
        }

        if (p.team === 1) team1Names.push(name);
        else team2Names.push(name);
    });

    // Check if guest already responded
    const { data: confirmation } = await supabase
        .from("match_confirmations")
        .select("confirmed")
        .eq("match_id", matchId)
        .eq("guest_player_id", guestId)
        .maybeSingle();

    const dateStr = new Date(match.played_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    return (
        <div className="min-h-screen bg-[#172554] py-2 flex flex-col items-center justify-start sm:justify-center font-sans">
            <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 160px, rgba(0,0,0,0.8) 70%, #000000 100%)' }} />

            <div className="max-w-md w-full px-2 z-10 relative">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <Image
                            src="/images/padel-xp-logo-header.png"
                            alt="PadelXP"
                            width={220}
                            height={80}
                            className="h-20 w-auto object-contain"
                        />
                    </div>
                    <p className="text-blue-100/90 text-sm font-medium">
                        Bonjour <strong>{guest.first_name}</strong>
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 shadow-xl rounded-xl overflow-hidden mb-4">
                    <div className="bg-blue-600/20 px-4 py-3 border-b border-white/5">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-padel-neongreen" /> {capitalizedDate}
                        </h3>
                        {/* Club info is fetched in clubName */}
                        <p className="text-blue-100/70 text-xs mt-0.5 flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-padel-neongreen" /> {clubName}
                        </p>
                    </div>

                    <div className="p-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-center flex-1">
                                <div className="text-[10px] font-bold text-blue-200/60 uppercase tracking-wide mb-1">Équipe 1</div>
                                <div className="font-semibold text-white text-xs leading-relaxed">
                                    {team1Names.map((n, i) => <div key={i}>{n}</div>)}
                                </div>
                                {match.winner_team_id === match.team1_id && (
                                    <div className="inline-block mt-2 px-1.5 py-0.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[9px] font-bold rounded">VAINQUEUR</div>
                                )}
                            </div>

                            <div className="mx-2 text-base font-bold text-white/20 italic">VS</div>

                            <div className="text-center flex-1">
                                <div className="text-[10px] font-bold text-blue-200/60 uppercase tracking-wide mb-1">Équipe 2</div>
                                <div className="font-semibold text-white text-xs leading-relaxed">
                                    {team2Names.map((n, i) => <div key={i}>{n}</div>)}
                                </div>
                                {match.winner_team_id !== match.team1_id && (
                                    <div className="inline-block mt-2 px-1.5 py-0.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[9px] font-bold rounded">VAINQUEUR</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-black/20 rounded-lg p-3 text-center mb-6 border border-white/5">
                            <div className="text-[9px] text-blue-200/50 uppercase tracking-wider mb-1">Score final</div>
                            <div className="text-lg font-bold text-white leading-none tracking-tight">
                                {match.score_details || `${match.score_team1} - ${match.score_team2}`}
                            </div>
                        </div>

                        <ConfirmationClient
                            guestId={guestId}
                            matchId={matchId}
                            matchStatus={match.status}
                            initialConfirmed={confirmation ? confirmation.confirmed : null}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

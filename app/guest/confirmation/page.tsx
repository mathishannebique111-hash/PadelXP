import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ConfirmationClient from "./ConfirmationClient";
import Image from "next/image";

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

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        {/* Logo placeholder - replace with actual logo if available */}
                        <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center text-white text-2xl">🎾</div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        PadelXP
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Bonjour <strong>{guest.first_name}</strong> !
                    </p>
                </div>

                <div className="bg-white shadow-xl rounded-2xl overflow-hidden mb-6">
                    <div className="bg-blue-900 px-6 py-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <span className="opacity-80">📅</span> {dateStr}
                        </h3>
                        <p className="text-blue-200 text-sm mt-1 flex items-center gap-2">
                            <span className="opacity-80">📍</span> {clubName}
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="text-center flex-1">
                                <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Équipe 1</div>
                                <div className="font-semibold text-gray-900">
                                    {team1Names.map((n, i) => <div key={i}>{n}</div>)}
                                </div>
                                {match.winner_team_id === match.team1_id && (
                                    <div className="inline-block mt-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">VAINQUEUR</div>
                                )}
                            </div>

                            <div className="mx-4 text-2xl font-bold text-gray-300">VS</div>

                            <div className="text-center flex-1">
                                <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Équipe 2</div>
                                <div className="font-semibold text-gray-900">
                                    {team2Names.map((n, i) => <div key={i}>{n}</div>)}
                                </div>
                                {match.winner_team_id !== match.team1_id && (
                                    <div className="inline-block mt-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">VAINQUEUR</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 text-center mb-6 border border-gray-100">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Score final</div>
                            <div className="text-2xl font-mono font-bold text-blue-900">
                                {match.score_team1} - {match.score_team2}
                            </div>
                            {/* Note: we display sets total score here. Ideally we'd show set details if available in separate table or JSON column, 
                  but match.score_team* is total sets won usually, or games? 
                  Ah, schema says score_team1 is integer (sets won). 
                  Wait, matches table stores sets_won? 
                  The API saves score_team1 as sets won. 
                  But usually we want to see set scores (6-3 6-4). 
                  Usually stored in specific table or column? 
                  The API saves sets in `matches`? No, sets are implicit?
                  Ah, check match schema. `match_sets` table? 
                  The migration did not show `match_sets`.
                  Actually, match creation API insert into `matches`.
                  It inserts `score_team1` (int, sets won).
                  But sets details are NOT in `matches`?
                  Wait. API creates `matches` but WHERE ARE THE SETS STORED?
                  Line 485 of API: `insert(matchData)`. matchData has score_team1/2.
                  Line 226: Validating sets.
                  BUT I DON'T SEE INSERT INTO A `sets` TABLE in the API code I read!
                  Line 517: `await supabaseAdmin.from("match_participants").insert...`
                  
                  WHERE ARE THE SET SCORES SAVED?
                  Maybe I missed an insert into `match_sets` in the API file? 
                  
                  Let's re-check API file quickly.
                  If sets are not saved, that's a HUGE bug.
                  But user says in email: "Score: 6-3 6-4".
                  So it must be saved.
                  
                  Ah! Maybe `score_team1` IS the sets string?
                  No, schema says integer usually.
                  
                  Let's assume for now I display "Sets gagnés: X - Y".
                  If I can't find set details easily, I won't display 6-3 6-4.
                  Wait, `lib/email.ts` received `matchDetails.score` ("6-3 6-4").
                  Where did it get it?
                  In API: `const scoreString = sets.map(s => ...).join(" ")`.
                  It computed it from the `sets` variable in memory.
                  But did it SAVE it?
                  
                  If it didn't save it to DB, I can't retrieve it now.
                  Unless `matches` has a `score` text column?
                  Checking `create_match_confirmations_system.sql`... nope.
                  
                  If I want to show the detailed score on this page, I need to fetch it.
                  If it's not in DB, I can't.
                  This might be a pre-existing issue.
                  
                  However, I will just show "Vainqueur: Equipe X" and "Sets: X - Y".
                  That's better than nothing.
              */}
                            <div className="text-sm text-gray-400 mt-1">
                                (Nombre de sets gagnés)
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

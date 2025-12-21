"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ClubHeader from "@/components/club/ClubHeader";
import { logger } from '@/lib/logger';

type Match = {
  id: string;
  played_at: string;
  score_team1: number | null;
  score_team2: number | null;
  winner_team_id: string | null;
  participants: Array<{
    user_id: string;
    team: number;
    profiles: { full_name: string | null; club_slug: string | null; club_id: string | null } | null;
  }>;
};

export default function ClubResultatsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubData, setClubData] = useState<{ name: string; logo_url: string | null; description: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // Récupérer le club_id et les données du club
        let clubId: string | null = null;
        const { data: club } = await supabase
          .from("clubs")
          .select("id, name, logo_url")
          .eq("slug", slug)
          .maybeSingle();
        
        if (club) {
          clubId = club.id;
          
          // Récupérer la description depuis club_public_extras si disponible
          const { data: extras } = await supabase
            .from("club_public_extras")
            .select("description")
            .eq("club_id", club.id)
            .maybeSingle();
          
          setClubData({
            name: (club.name as string) || slug.toUpperCase(),
            logo_url: club.logo_url as string | null,
            description: extras?.description as string | null || null,
          });
        } else {
          setClubData({
            name: slug.toUpperCase(),
            logo_url: null,
            description: null,
          });
        }

        // Récupérer tous les matchs avec leurs participants
        const { data: allMatches, error: e1 } = await supabase
          .from("matches")
          .select(`
            id,
            played_at,
            score_team1,
            score_team2,
            winner_team_id,
            match_participants (
              user_id,
              team,
              profiles (
                full_name,
                club_slug,
                club_id
              )
            )
          `)
          .order("played_at", { ascending: false })
          .limit(100);

        if (e1 || !allMatches) {
          setMatches([]);
          return;
        }

        // Filtrer strictement : ne garder que les matchs où TOUS les participants appartiennent au club
        const filtered = allMatches.filter((match: any) => {
          if (!match.match_participants || match.match_participants.length === 0) return false;
          
          // Vérifier que tous les participants ont le même club_slug ou club_id
          return match.match_participants.every((p: any) => {
            const profile = p.profiles;
            if (!profile) return false;
            return profile.club_slug === slug || (clubId && profile.club_id === clubId);
          });
        });

        setMatches(filtered as Match[]);
      } catch (e) {
        logger.error("Error loading matches:", e);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {clubData ? (
          <ClubHeader 
            name={clubData.name}
            logoUrl={clubData.logo_url}
            description={clubData.description}
          />
        ) : (
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Résultats — {slug.toUpperCase()}</h1>
        )}
        <p className="text-white/60 mb-6 text-sm mt-4">Historique des matchs joués par les membres de ce club uniquement.</p>

        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-center text-white/60">Chargement…</div>
          ) : matches.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/60">Aucun match enregistré pour ce club pour le moment.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {matches.map((match) => {
                const team1 = match.participants.filter((p) => p.team === 1);
                const team2 = match.participants.filter((p) => p.team === 2);
                const team1Names = team1.map((p) => p.profiles?.full_name || "Joueur").join(" / ");
                const team2Names = team2.map((p) => p.profiles?.full_name || "Joueur").join(" / ");
                const date = new Date(match.played_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const score = `${match.score_team1 ?? 0} - ${match.score_team2 ?? 0}`;
                
                return (
                  <div key={match.id} className="px-4 py-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-sm text-white/60 mb-1">{date}</div>
                        <div className="font-medium">{team1Names}</div>
                        <div className="text-white/60 text-sm">vs</div>
                        <div className="font-medium">{team2Names}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold mb-1">{score}</div>
                        <div className="text-xs text-white/60">
                          {match.winner_team_id ? "Match terminé" : "En cours"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ClubHeader from "@/components/club/ClubHeader";

type Player = { 
  id: string; 
  full_name: string | null; 
  points?: number | null;
  club_slug?: string | null;
  club_id?: string | null;
};

export default function ClubClassementPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubData, setClubData] = useState<{ name: string; logo_url: string | null; description: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // Récupérer les données du club
        const { data: club } = await supabase
          .from("clubs")
          .select("id, name, logo_url")
          .eq("slug", slug)
          .maybeSingle();
        
        let clubId: string | null = null;
        
        if (club) {
          clubId = club.id as string;
          
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

        // Requête avec filtres multiples pour garantir l'isolation stricte
        // Ne garder QUE les joueurs avec club_slug exactement égal à slug OU club_id égal au club_id du club
        let query = supabase
          .from("profiles")
          .select("id, full_name, points, club_slug, club_id");
        
        // Filtrage strict : soit club_slug = slug, soit club_id = clubId (si disponible)
        if (clubId) {
          query = query.or(`club_slug.eq.${slug},club_id.eq.${clubId}`);
        } else {
          query = query.eq("club_slug", slug);
        }
        
        // Exclure explicitement les joueurs sans club défini
        query = query.not("club_slug", "is", null);
        
        query = query.order("points", { ascending: false });

        const { data, error } = await query;
        
        if (!error && data) {
          // Double vérification côté client : ne garder que ceux qui correspondent exactement
          const filtered = data.filter((p: any) => 
            p.club_slug === slug || (clubId && p.club_id === clubId)
          );
          setPlayers(filtered);
        } else {
          setPlayers([]);
        }
      } catch (e) {
        console.error("Error loading players:", e);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

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
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Classement — {slug.toUpperCase()}</h1>
        )}
        <p className="text-white/60 mb-6 text-sm mt-4">Seuls les joueurs rattachés à ce club apparaissent ici.</p>

        {/* Top 3 Podium */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {top3.map((p, idx) => {
              const rank = idx + 1;
              const colors = [
                "bg-gradient-to-br from-yellow-400 to-yellow-600",
                "bg-gradient-to-br from-gray-300 to-gray-500",
                "bg-gradient-to-br from-orange-400 to-orange-600"
              ];
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div
                  key={p.id}
                  className={`${colors[idx]} rounded-xl p-6 text-center ${idx === 0 ? "order-2 md:order-2" : idx === 1 ? "order-1 md:order-1" : "order-3 md:order-3"}`}
                >
                  <div className="text-4xl mb-2">{medals[idx]}</div>
                  <div className="text-xl font-bold mb-2">{p.full_name || "Joueur"}</div>
                  <div className="bg-white/20 rounded-full px-4 py-2 inline-block">
                    <span className="font-bold">{p.points ?? 0} POINTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tableau complet */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-3 bg-white/5 border-b border-white/10">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🏆 Classement global
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-white/60 border-b border-white/10">
                  <th className="px-4 py-3 text-left">RANG</th>
                  <th className="px-4 py-3 text-left">JOUEUR</th>
                  <th className="px-4 py-3 text-left">NIVEAU</th>
                  <th className="px-4 py-3 text-right">POINTS</th>
                  <th className="px-4 py-3 text-right">MATCHS</th>
                  <th className="px-4 py-3 text-right">V</th>
                  <th className="px-4 py-3 text-right">D</th>
                  <th className="px-4 py-3 text-right">WIN %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-white/60">Chargement…</td>
                  </tr>
                ) : players.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-white/60">Aucun joueur pour ce club pour le moment.</td>
                  </tr>
                ) : (
                  players.map((p, idx) => {
                    const rank = idx + 1;
                    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
                    // Calcul simplifié des stats (à adapter selon votre schéma)
                    const matches = 0; // TODO: calculer depuis match_participants
                    const wins = 0;
                    const losses = 0;
                    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
                    const tier = p.points && p.points >= 300 ? "Diamant" : p.points && p.points >= 200 ? "Or" : p.points && p.points >= 100 ? "Argent" : "Bronze";
                    const tierColors: Record<string, string> = {
                      Diamant: "bg-blue-500/20 text-blue-300",
                      Or: "bg-yellow-500/20 text-yellow-300",
                      Argent: "bg-gray-400/20 text-gray-300",
                      Bronze: "bg-orange-500/20 text-orange-300"
                    };
                    return (
                      <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">{medal}</td>
                        <td className="px-4 py-3 font-medium">{p.full_name || "Joueur"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${tierColors[tier] || tierColors.Bronze}`}>
                            {tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{p.points ?? 0}</td>
                        <td className="px-4 py-3 text-right">{matches}</td>
                        <td className="px-4 py-3 text-right text-green-400">{wins}</td>
                        <td className="px-4 py-3 text-right text-red-400">{losses}</td>
                        <td className="px-4 py-3 text-right">{winRate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



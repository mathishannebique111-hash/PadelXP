"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALL_BADGES } from "@/lib/badges";
import ClubHeader from "@/components/club/ClubHeader";

type Badge = typeof ALL_BADGES[number];

export default function ClubBadgesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [userId, setUserId] = useState<string | null>(null);
  const [clubOk, setClubOk] = useState<boolean>(true);
  const [earned, setEarned] = useState<Badge[]>([]);
  const [clubData, setClubData] = useState<{ name: string; logo_url: string | null; description: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = await createClient();
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id || null;
      setUserId(uid);
      if (!uid) return;

      // Vérifier que l'utilisateur est bien rattaché au club courant
      const { data: profile } = await supabase
        .from("profiles")
        .select("club_slug, club_id")
        .eq("id", uid)
        .single();
      if (!profile) { setClubOk(false); return; }

      // Récupérer les données du club
      const { data: club } = await supabase
        .from("clubs")
        .select("id, name, logo_url, slug")
        .eq("slug", slug)
        .maybeSingle();
      
      if (club) {
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

      if (profile.club_slug !== slug) {
        // tenter via club_id
        const { data: clubCheck } = await supabase.from("clubs").select("slug").eq("id", profile.club_id).maybeSingle();
        if (clubCheck?.slug !== slug) { setClubOk(false); return; }
      }

      // TODO: calculer réellement les badges depuis l'historique filtré par club
      // Pour MVP: afficher la grille des badges, en mettant en avant ceux potentiellement obtenus (placeholder vide)
      setEarned([]);
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
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Badges — {slug.toUpperCase()}</h1>
        )}
        {!clubOk && <p className="text-red-400 text-sm mb-4 mt-4">Vous n'êtes pas rattaché à ce club.</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {ALL_BADGES.map((b) => {
            const has = !!earned.find(x => x.id === b.id);
            return (
              <div key={b.id} className={`rounded-xl border p-4 ${has ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="text-xl mb-2">{b.icon}</div>
                <div className="font-semibold mb-1">{b.name}</div>
                <div className="text-xs text-white/60">{b.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}





"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ClubMember = { id: string; display_name: string | null; club_slug: string | null; club_id: string | null };

export default function ClubRecordMatchPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const router = useRouter();
  const supabase = await createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [opponentId, setOpponentId] = useState<string>("");
  const [score1, setScore1] = useState<string>("6");
  const [score2, setScore2] = useState<string>("4");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const me = auth.user?.id || null;
        if (!me) {
          setError("Session requise");
          setLoading(false);
          return;
        }
        setUserId(me);

        // club_id depuis slug
        const { data: club } = await supabase.from("clubs").select("id").eq("slug", slug).single();
        const cId = club?.id || null;
        setClubId(cId);

        // Charger uniquement les membres du club avec filtrage strict
        if (cId) {
          // Requête avec filtres multiples pour garantir l'isolation
          let query = supabase
            .from("profiles")
            .select("id, display_name, club_slug, club_id");
          
          // Filtrer strictement : soit club_id = cId, soit club_slug = slug
          query = query.or(`club_id.eq.${cId},club_slug.eq.${slug}`);
          
          // Exclure explicitement les joueurs sans club défini
          query = query.not("club_slug", "is", null);
          
          const { data, error: membersError } = await query;
          
          if (membersError) {
            console.error("[ClubRecordMatch] Error loading members:", membersError);
            setMembers([]);
          } else if (data) {
            // Double vérification côté client : ne garder que ceux qui correspondent exactement
            const filtered = data.filter((m: any) => {
              const hasClubId = m.club_id === cId;
              const hasClubSlug = m.club_slug === slug;
              return hasClubId || hasClubSlug;
            });
            console.log("[ClubRecordMatch] Loaded members:", filtered.length, "for club", slug);
            setMembers(filtered as ClubMember[]);
          } else {
            setMembers([]);
          }
        } else {
          console.warn("[ClubRecordMatch] No club_id found for slug:", slug);
          setMembers([]);
        }
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const myName = useMemo(() => members.find(m => m.id === userId)?.display_name || "Moi", [members, userId]);
  const canSubmit = !!userId && !!opponentId && opponentId !== userId && score1 !== "" && score2 !== "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!canSubmit) return;
    try {
      // Construire un match simple 1v1, team1 = user, team2 = opponent
      const payload = {
        players: [
          { player_type: "user", user_id: userId, guest_player_id: null },
          { player_type: "user", user_id: opponentId, guest_player_id: null },
        ],
        winner: parseInt(score1) > parseInt(score2) ? "1" : "2",
        sets: [
          { setNumber: 1, team1Score: String(score1), team2Score: String(score2) }
        ],
      };
      const res = await fetch("/api/matches/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Impossible d'enregistrer le match");
      }
      setOkMsg("Match enregistré !");
      setTimeout(() => router.push(`/club/${slug}/resultats`), 800);
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Enregistrer un match — {slug.toUpperCase()}</h1>
        <p className="text-white/60 mb-6 text-sm">Vous ne pouvez choisir qu'un adversaire membre de ce club.</p>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
          {loading && <div className="text-white/70 text-sm">Chargement…</div>}
          {error && <div className="text-red-400 text-sm">{error}</div>}
          {okMsg && <div className="text-emerald-400 text-sm">{okMsg}</div>}

          <div>
            <label className="block text-sm text-white/70 mb-1">Vous</label>
            <input disabled value={myName} className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white" />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Adversaire (même club)</label>
            <select
              required
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white"
            >
              <option value="">Sélectionnez un adversaire</option>
              {members
                .filter(m => m.id !== userId)
                .map(m => (
                  <option key={m.id} value={m.id}>{m.display_name || "Joueur"}</option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Jeu(s) gagnés (vous)</label>
              <input value={score1} onChange={(e)=>setScore1(e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Jeu(s) gagnés (adversaire)</label>
              <input value={score2} onChange={(e)=>setScore2(e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white" />
            </div>
          </div>

          <button disabled={!canSubmit || loading} className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60" style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}>Enregistrer</button>
        </form>
      </div>
    </div>
  );
}



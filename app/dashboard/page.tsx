import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { redirect } from "next/navigation";
import InvitationCodeCard from "./InvitationCodeCard";

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard");
  }

  const { clubId } = await getUserClubInfo();

  const { data: club } = await supabase
    .from("clubs")
    .select("code_invitation, slug")
    .eq("id", clubId)
    .maybeSingle();

  // Derniers matchs du club (5 derniers)
  let recentMatches: Array<{ id: string; created_at: string; score_team1: number | null; score_team2: number | null; team1_id: string; team2_id: string; winner_team_id: string | null }> = [];
  if (clubId) {
    // Récupérer les participations users de ce club via profils
    const { data: clubUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("club_id", clubId);

    const userIds = (clubUsers || []).map(u => u.id);

    if (userIds.length > 0) {
      const { data: participants } = await supabase
        .from("match_participants")
        .select("match_id")
        .eq("player_type", "user")
        .in("user_id", userIds);

      const matchIds = [...new Set((participants || []).map(p => p.match_id))];

      if (matchIds.length > 0) {
        const { data: matches } = await supabase
          .from("matches")
          .select("id, created_at, score_team1, score_team2, team1_id, team2_id, winner_team_id")
          .in("id", matchIds)
          .order("created_at", { ascending: false })
          .limit(5);
        recentMatches = matches || [];
      }
    }
  }

  // Module retiré

  // Challenges du mois...
  let monthlyChallenges: Array<{ id: string; title: string; start_date: string; end_date: string | null }> = [];
  if (clubId) {
    try {
      const { data } = await supabase
        .from("challenges")
        .select("id, title, start_date, end_date, club_id")
        .eq("club_id", clubId)
        .gte("start_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .order("start_date", { ascending: true })
        .limit(3);
      monthlyChallenges = (data as any) || [];
    } catch {}
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Tableau de bord</h1>
          <p className="text-white/60 text-sm">Bienvenue dans votre espace club / complexe</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/classement" className="px-4 py-2 rounded bg-white/10 border border-white/10">Voir le classement</a>
          <a href="/dashboard/page-club" className="px-4 py-2 rounded bg-white/10 border border-white/10">Configurer la page club</a>
        </div>
      </header>

      {/* Code d'invitation */}
      <section className="grid md:grid-cols-2 gap-6">
        <InvitationCodeCard
          code={club?.code_invitation ?? null}
          slug={club?.slug ?? null}
        />
        {/* À venir */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold mb-4">À venir</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-2">Challenges du mois</h3>
              {monthlyChallenges.length === 0 ? (
                <div className="text-sm text-white/60">Aucun challenge créé ce mois-ci. <a href="/dashboard/challenges" className="underline">Créer un challenge</a></div>
              ) : (
                <ul className="text-sm space-y-2">
                  {monthlyChallenges.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                      <span>{c.title}</span>
                      <span className="text-white/60">{new Date(c.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Activité récente */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold mb-4">Activité récente</h2>
        {recentMatches.length === 0 ? (
          <div className="text-sm text-white/60">Aucun match récent dans votre club.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {recentMatches.map((m) => {
              const score = `${m.score_team1 ?? 0}-${m.score_team2 ?? 0}`;
              const date = new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              const winner = m.winner_team_id ? (m.winner_team_id === m.team1_id ? "Équipe 1" : "Équipe 2") : "—";
              return (
                <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{date}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">{winner}</span>
                  </div>
                  <div className="mt-2 text-lg font-bold">Score: {score}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}



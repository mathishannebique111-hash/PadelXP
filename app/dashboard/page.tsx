import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { redirect } from "next/navigation";
import InvitationCodeCard from "./InvitationCodeCard";
import PageTitle from "./PageTitle";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "club-challenges";

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

type ChallengeRecord = {
  id: string;
  club_id: string;
  title: string;
  start_date: string;
  end_date: string;
  objective: string;
  reward_type: "points" | "badge";
  reward_label: string;
  created_at: string;
};

function computeStatus(challenge: ChallengeRecord): "upcoming" | "active" | "completed" {
  const now = new Date();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}

async function loadChallenges(clubId: string): Promise<ChallengeRecord[]> {
  if (!supabaseAdmin) return [];
  const storage = supabaseAdmin.storage.from(BUCKET_NAME);
  const path = `${clubId}.json`;
  const { data, error } = await storage.download(path);
  if (error || !data) {
    if (error && error.message && !error.message.toLowerCase().includes("not found")) {
      console.warn("[dashboard/home] loadChallenges error", error);
    }
    return [];
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as ChallengeRecord[];
    }
  } catch (err) {
    console.warn("[dashboard/home] invalid JSON", err);
  }
  return [];
}

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard");
  }

  const { clubId } = await getUserClubInfo();

  // Si l'utilisateur n'a pas de clubId, il n'a pas accès au dashboard
  if (!clubId) {
    redirect("/clubs/login?error=no_access");
  }

  const { data: club } = await supabase
    .from("clubs")
    .select("code_invitation, slug, trial_start")
    .eq("id", clubId)
    .maybeSingle();

  // Calculer le nombre de jours restants de l'essai
  function calculateDaysRemaining(trialStart: string | null): number | null {
    if (!trialStart) return null;
    
    const startDate = new Date(trialStart);
    const now = new Date();
    
    // Définir l'heure à minuit pour compter les jours complets
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculer les jours passés depuis l'inscription
    const diffTime = nowMidnight.getTime() - startMidnight.getTime();
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculer les jours restants : 30 jours d'essai - jours passés
    const daysRemaining = 30 - daysPassed;
    
    return Math.max(0, daysRemaining);
  }

  const daysRemaining = calculateDaysRemaining(club?.trial_start ?? null);
  const showTrialWarning = daysRemaining !== null && daysRemaining <= 10 && daysRemaining > 0;

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

  // Challenges à venir (en cours ou futurs) - Chargés depuis Supabase Storage
  let upcomingChallenges: Array<{ id: string; title: string; start_date: string; end_date: string; objective: string; status: "upcoming" | "active" | "completed" }> = [];
  if (clubId) {
    try {
      const allChallenges = await loadChallenges(clubId);
      
      // Calculer la date d'il y a 1 jour
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      // Filtrer pour supprimer les challenges terminés depuis plus d'un jour
      const filteredChallenges = allChallenges.filter((record) => {
        const endDate = new Date(record.end_date);
        const status = computeStatus(record);
        
        // Garder les challenges actifs, à venir, et terminés depuis moins d'un jour
        if (status === "completed") {
          return endDate >= oneDayAgo;
        }
        return true;
      });
      
      // Si des challenges ont été supprimés, sauvegarder la liste mise à jour
      if (filteredChallenges.length < allChallenges.length && supabaseAdmin) {
        try {
          const storage = supabaseAdmin.storage.from(BUCKET_NAME);
          const path = `${clubId}.json`;
          const payload = JSON.stringify(filteredChallenges, null, 2);
          await storage.upload(path, payload, { upsert: true, contentType: "application/json" });
          console.log(`[dashboard/home] Supprimé ${allChallenges.length - filteredChallenges.length} challenge(s) terminé(s) depuis plus d'un jour`);
        } catch (error) {
          console.error("[dashboard/home] Erreur lors de la sauvegarde après nettoyage", error);
        }
      }
      
      // Filtrer pour ne garder que les challenges actifs ou à venir pour l'affichage
      upcomingChallenges = filteredChallenges
        .map((record) => ({
          id: record.id,
          title: record.title,
          start_date: record.start_date,
          end_date: record.end_date,
          objective: record.objective,
          status: computeStatus(record),
        }))
        .filter((c) => c.status === "active" || c.status === "upcoming")
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 5); // Limiter à 5 challenges
    } catch (err) {
      console.error("[dashboard/home] Error loading challenges", err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Message d'alerte pour l'essai */}
      {showTrialWarning && (
        <div className="rounded-xl border border-orange-500/50 bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-300 mb-1">
                Essai gratuit : {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-orange-200/80">
                Il ne reste que {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} avant la fin de votre essai gratuit. 
                Vous pouvez activer votre abonnement dès maintenant pour qu'il démarre automatiquement à partir du mois prochain.
              </p>
              <a 
                href="/dashboard/facturation" 
                className="inline-block mt-3 px-4 py-2 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-200 hover:bg-orange-500/30 transition-colors text-sm font-semibold"
              >
                Activer l'abonnement →
              </a>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <PageTitle title="Tableau de bord" subtitle="Bienvenue dans votre espace club / complexe" />
        <div className="flex gap-2">
          <a
            href="/dashboard/classement"
            className="group relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-sm text-white overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/30"
            style={{ background: "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)", boxShadow: "0 6px 18px rgba(0,102,255,0.28)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <span className="relative">🏆</span>
            <span className="relative">Voir le classement</span>
          </a>
          <a
            href="/dashboard/page-club"
            className="group relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-sm text-white overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)", boxShadow: "0 6px 18px rgba(124,58,237,0.28)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <span className="relative">⚙️</span>
            <span className="relative">Configurer la page club</span>
          </a>
        </div>
      </header>

      {/* Code d'invitation */}
      <section className="grid md:grid-cols-2 gap-6">
        <InvitationCodeCard
          code={club?.code_invitation ?? null}
          slug={club?.slug ?? null}
        />
        {/* À venir */}
        <div className="rounded-xl border-2 border-white/25 ring-1 ring-white/10 bg-white/5 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.32)]">
          <h2 className="font-semibold mb-4">Challenges en cours et à venir</h2>
          <div className="space-y-4">
            {upcomingChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="mb-6 text-center">
                  <div className="text-4xl mb-3 opacity-50">🎯</div>
                  <p className="text-sm text-white/60">Aucun challenge à venir</p>
                </div>
                <a 
                  href="/dashboard/challenges" 
                  className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white overflow-hidden transition-all hover:scale-105 hover:shadow-lg ring-1 ring-white/20 border border-white/10"
                  style={{ background: "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)", boxShadow: "0 6px 22px rgba(0, 102, 255, 0.35)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative text-lg">➕</span>
                  <span className="relative">Créer un challenge</span>
                  <span className="relative text-base ml-1">›</span>
                </a>
              </div>
            ) : (
              <ul className="text-sm space-y-2">
                {upcomingChallenges.map((c) => {
                  const startDate = new Date(c.start_date);
                  const endDate = new Date(c.end_date);
                  const isActive = c.status === "active";
                  const isFuture = c.status === "upcoming";
                  
                  return (
                    <li key={c.id} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white truncate">{c.title}</span>
                            {isActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
                                En cours
                              </span>
                            )}
                            {isFuture && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                À venir
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/50 truncate">{c.objective}</div>
                        </div>
                        <div className="flex flex-col items-end text-xs text-white/60 whitespace-nowrap">
                          <span>{startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                          <span className="text-[10px]">→ {endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Activité récente */}
      <section className="rounded-xl border-2 border-white/25 ring-1 ring-white/10 bg-white/5 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.32)]">
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



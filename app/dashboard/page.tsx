import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, Users, Calendar, Plus } from "lucide-react";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import PageTitle from "./PageTitle";
import PasswordChangeCard from "./PasswordChangeCard";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import { logger } from "@/lib/logger";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import ClubQRCodeCard from "@/components/club/ClubQRCodeCard";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "club-challenges";

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null;

type LeagueRecord = {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  player_count?: number;
  max_players: number;
  status: string;
};

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
      logger.warn("[dashboard/home] loadChallenges error", error);
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
    logger.warn("[dashboard/home] invalid JSON", err);
  }
  return [];
}

// Forcer le rechargement dynamique pour éviter le cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardHome() {
  const supabase = await createClient();
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
    .select("name, code_invitation, slug, subdomain, trial_start, trial_start_date, trial_end_date, trial_current_end_date, auto_extension_unlocked, total_players_count, total_matches_count, dashboard_login_count, subscription_status, selected_plan, subscription_started_at, stripe_subscription_id, offer_type")
    .eq("id", clubId)
    .maybeSingle();

  // Charger les ligues du club
  let upcomingLeagues: LeagueRecord[] = [];
  if (clubId) {
    const { data: leaguesData } = await supabase
      .from("leagues")
      .select("id, name, starts_at, ends_at, max_players, status")
      .eq("club_id", clubId)
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    if (leaguesData) {
      upcomingLeagues = await Promise.all(
        leaguesData.map(async (league: any) => {
          const { count } = await supabase
            .from("league_players")
            .select("id", { count: "exact", head: true })
            .eq("league_id", league.id);
          
          return {
            ...league,
            player_count: count || 0
          };
        })
      );
    }
  }


  // Derniers matchs du club (5 derniers)
  let recentMatches: Array<{ id: string; created_at: string; score_team1: number | null; score_team2: number | null; team1_id: string; team2_id: string; winner_team_id: string | null }> = [];
  if (clubId) {
    // Récupérer les participations users de ce club via profils
    const { data: clubUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("club_id", clubId);

    const userIds = (clubUsers || []).map((u: { id: string }) => u.id);

    if (userIds.length > 0) {
      const { data: participants } = await supabase
        .from("match_participants")
        .select("match_id")
        .eq("player_type", "user")
        .in("user_id", userIds);

      const matchIds = [...new Set((participants || []).map((p: { match_id: string }) => p.match_id))];

      if (matchIds.length > 0) {
        const { data: matches } = await supabase
          .from("matches")
          .select("id, created_at, score_team1, score_team2, team1_id, team2_id, winner_team_id")
          .in("id", matchIds)
          .order("created_at", { ascending: false })
          .limit(5);
        
        if (matches) {
          recentMatches = matches;
        }
      }
    }
  }

  // Charger les challenges via JSON Storage
  const allChallenges = await loadChallenges(clubId);
  const upcomingChallenges = allChallenges
    .filter(record => computeStatus(record) !== "completed")
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <header>
        <PageTitle title="Tableau de bord" subtitle="Bienvenue dans votre espace club / complexe" />
      </header>

      {/* QR Code de l'Application Club */}
      {(club?.subdomain || club?.slug) && (
        <section className="w-full">
          <ClubQRCodeCard clubName={club?.name || "Votre Club"} subdomain={club.subdomain || club.slug} />
        </section>
      )}

      {/* Ligues et Challenges */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {/* Ligues à venir */}
        <div className="w-full max-w-2xl rounded-2xl border border-blue-500/40 bg-gradient-to-br from-[#03204a] via-[#01142d] to-[#000916] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] flex flex-col h-full">
          <div className="flex flex-col gap-5 flex-1">
            <div className="min-h-[4.5rem]">
              <h2 className="text-xl font-semibold text-white">Ligues à venir</h2>
              <p className="mt-1 text-sm text-white/70">
                {upcomingLeagues.length === 0
                  ? "Créez une ligue pour animer votre club et engager vos joueurs."
                  : "Suivez les ligues actives et les inscriptions en cours."}
              </p>
            </div>
            
            <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-[#02346d]/60 via-[#012a58]/60 to-[#01403f]/60 px-6 py-5 shadow-[0_8px_30px_rgba(0,102,255,0.25)] flex-1">
              {upcomingLeagues.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-4">
                  <div className="mb-4 text-center">
                    <div className="mb-2 flex items-center justify-center opacity-50">
                      <Trophy className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/60">Aucune ligue prévue</p>
                  </div>
                  <a
                    href="/dashboard/ligues"
                    className="mt-2 w-full rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 text-center flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", boxShadow: "0 12px 24px rgba(59,130,246,0.35)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    <Plus size={16} />
                    Créer une ligue
                  </a>
                </div>
              ) : (
                <ul className="text-xs sm:text-sm space-y-3">
                  {upcomingLeagues.map((league) => (
                    <li key={league.id} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate text-sm mb-1">{league.name}</h3>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-[10px] text-white/50">
                              <Users size={12} className="text-blue-400" />
                              <span>{league.player_count} / {league.max_players}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-white/50">
                              <Calendar size={12} className="text-blue-400" />
                              <span>{league.starts_at ? new Date(league.starts_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'À définir'}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${
                          league.status === 'active' 
                            ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {league.status === 'active' ? 'En cours' : 'À venir'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {upcomingLeagues.length > 0 && (
              <a 
                href="/dashboard/ligues"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 justify-end font-medium"
              >
                Gérer toutes les ligues →
              </a>
            )}
          </div>
        </div>

        {/* Challenges en cours et à venir */}
        <div className="w-full max-w-2xl rounded-2xl border border-[#00CC99]/40 bg-gradient-to-br from-[#03204a] via-[#01142d] to-[#000916] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] flex flex-col h-full">
          <div className="flex flex-col gap-5 flex-1">
            <div className="min-h-[4.5rem]">
              <h2 className="text-xl font-semibold text-white">Challenges en cours et à venir</h2>
              <p className="mt-1 text-sm text-white/70">
                {upcomingChallenges.length === 0
                  ? "Créez un challenge pour motiver vos joueurs et animer votre club."
                  : "Suivez les challenges actifs et à venir de votre club."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-[#02346d]/60 via-[#012a58]/60 to-[#01403f]/60 px-6 py-5 shadow-[0_8px_30px_rgba(0,102,255,0.25)] flex-1">
              {upcomingChallenges.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-4">
                  <div className="mb-4 text-center">
                    <div className="mb-2 flex items-center justify-center opacity-50">
                      <BadgeIconDisplay icon="🎯" size={32} className="flex-shrink-0" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/60">Aucun challenge à venir</p>
                  </div>
                  <a
                    href="/dashboard/challenges"
                    className="mt-4 w-full rounded-lg border px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 text-center"
                    style={{ background: "linear-gradient(135deg, #0066FF 0%, #00CC99 100%)", boxShadow: "0 12px 24px rgba(0,102,255,0.35)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    Créer un challenge
                  </a>
                </div>
              ) : (
                <ul className="text-xs sm:text-sm space-y-2">
                  {upcomingChallenges.map((c) => {
                    const startDate = new Date(c.start_date);
                    const endDate = new Date(c.end_date);
                    const status = computeStatus(c);

                    return (
                      <li key={c.id} className="rounded-lg bg-white/5 border border-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2">
                        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                              <span className="font-medium text-white truncate text-xs sm:text-sm">{c.title}</span>
                              {status === "active" && (
                                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-green-500/20 text-green-300 border border-green-500/30 flex-shrink-0">
                                  En cours
                                </span>
                              )}
                              {status === "upcoming" && (
                                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
                                  À venir
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-white/50 truncate">{c.objective}</div>
                          </div>
                          <div className="flex flex-col items-end text-[10px] sm:text-xs text-white/60 whitespace-nowrap flex-shrink-0">
                            <span>{startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                            <span className="text-[9px] sm:text-[10px]">→ {endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-white/60">
              Gérez vos challenges depuis la page dédiée pour créer des événements motivants pour vos joueurs.
            </p>
          </div>
        </div>
      </section>

      {/* Modifier le mot de passe */}
      <section>
        <PasswordChangeCard />
      </section>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { redirect } from "next/navigation";
import InvitationCodeCard from "./InvitationCodeCard";
import PageTitle from "./PageTitle";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";

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
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Message d'alerte pour l'essai */}
      {showTrialWarning && (
        <div className="rounded-lg sm:rounded-xl border border-orange-500/50 bg-orange-500/10 p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="text-xl sm:text-2xl flex-shrink-0">⚠️</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-orange-300 mb-1 text-sm sm:text-base">
                Essai gratuit : {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
              </h3>
              <p className="text-xs sm:text-sm text-orange-200/80">
                Il ne reste que {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} avant la fin de votre essai gratuit. 
                Vous pouvez activer votre abonnement dès maintenant pour qu'il démarre automatiquement à partir du mois prochain.
              </p>
              <a 
                href="/dashboard/facturation" 
                className="inline-block mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-200 hover:bg-orange-500/30 transition-colors text-xs sm:text-sm font-semibold"
              >
                Activer l'abonnement →
              </a>
            </div>
          </div>
        </div>
      )}

      <header>
        <PageTitle title="Tableau de bord" subtitle="Bienvenue dans votre espace club / complexe" />
      </header>

      {/* Code d'invitation */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        <InvitationCodeCard
          code={club?.code_invitation ?? null}
          slug={club?.slug ?? null}
        />
        {/* À venir */}
        <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-8 flex flex-col h-full">
          <div>
            <h2 className="font-semibold text-xl text-white">Challenges en cours et à venir</h2>
          </div>
          <div className="flex-1 flex flex-col mt-5">
            <div className="flex-1 space-y-3 sm:space-y-4">
              {upcomingChallenges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                  <div className="mb-4 sm:mb-6 text-center">
                    <div className="mb-2 sm:mb-3 flex items-center justify-center opacity-50">
                      <BadgeIconDisplay icon="🎯" size={32} className="flex-shrink-0" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/60">Aucun challenge à venir</p>
                  </div>
                </div>
              ) : (
                <ul className="text-xs sm:text-sm space-y-2">
                  {upcomingChallenges.map((c) => {
                    const startDate = new Date(c.start_date);
                    const endDate = new Date(c.end_date);
                    const isActive = c.status === "active";
                    const isFuture = c.status === "upcoming";
                    
                    return (
                      <li key={c.id} className="rounded-lg bg-white/5 border border-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2">
                        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                              <span className="font-medium text-white truncate text-xs sm:text-sm">{c.title}</span>
                              {isActive && (
                                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-green-500/20 text-green-300 border border-green-500/30 flex-shrink-0">
                                  En cours
                                </span>
                              )}
                              {isFuture && (
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
            {upcomingChallenges.length === 0 && (
              <div className="mt-auto pt-4">
                <a 
                  href="/dashboard/challenges" 
                  className="group relative inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm text-white overflow-hidden transition-all hover:scale-105 hover:shadow-lg ring-1 ring-white/20 border border-white/10 w-full justify-center"
                  style={{ background: "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)", boxShadow: "0 6px 22px rgba(0, 102, 255, 0.35)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative text-base sm:text-lg">➕</span>
                  <span className="relative">Créer un challenge</span>
                  <span className="relative text-sm sm:text-base ml-1">›</span>
                </a>
              </div>
            )}
            ) : (
              <ul className="text-xs sm:text-sm space-y-2">
                {upcomingChallenges.map((c) => {
                  const startDate = new Date(c.start_date);
                  const endDate = new Date(c.end_date);
                  const isActive = c.status === "active";
                  const isFuture = c.status === "upcoming";
                  
                  return (
                    <li key={c.id} className="rounded-lg bg-white/5 border border-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2">
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                            <span className="font-medium text-white truncate text-xs sm:text-sm">{c.title}</span>
                            {isActive && (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-green-500/20 text-green-300 border border-green-500/30 flex-shrink-0">
                                En cours
                              </span>
                            )}
                            {isFuture && (
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
        </div>
      </section>

      {/* Statut Essai / Abonnement */}
      <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <h2 className="font-semibold text-base sm:text-lg">Statut Essai / Abonnement</h2>
          <a
            href="/dashboard/facturation"
            className="text-xs sm:text-sm text-white/60 hover:text-white/80 underline transition-colors"
          >
            Voir les détails →
          </a>
        </div>
        
        {daysRemaining !== null && daysRemaining > 0 ? (
          // Essai actif
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/images/cadeau accueil club.png"
                  alt="Cadeau"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <span className="font-semibold text-base sm:text-lg text-white">Essai gratuit — 30 jours</span>
                  <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold border ${
                    showTrialWarning
                      ? "border-orange-400/50 bg-orange-500/20 text-orange-300"
                      : "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} restant{daysRemaining > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/70">
                  {showTrialWarning
                    ? `Votre essai se termine dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}. Choisissez une offre pour continuer.`
                    : `Profitez d'encore ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} avant la fin de votre essai gratuit.`}
                </p>
                {showTrialWarning && (
                  <div className="mt-2 sm:mt-3">
                    <a
                      href="/dashboard/facturation"
                      className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 border border-orange-400/50 shadow-[0_6px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_24px_rgba(249,115,22,0.4)] hover:scale-105 active:scale-100 transition-all duration-300"
                    >
                      <span>📋 Choisir une offre</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : daysRemaining !== null && daysRemaining === 0 ? (
          // Essai expiré
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="text-2xl sm:text-3xl flex-shrink-0">⏰</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-rose-200/90 mb-3 sm:mb-4">
                Votre période d'essai est terminée. Sélectionnez une offre pour continuer à utiliser la plateforme.
              </p>
              <a
                href="/dashboard/facturation"
                className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400/50 shadow-[0_6px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-100 transition-all duration-300"
              >
                <span>📋 Choisir une offre</span>
              </a>
            </div>
          </div>
        ) : (
          // Pas d'essai
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="text-2xl sm:text-3xl flex-shrink-0">💳</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-white/70">
                Profitez de 30 jours d'essai gratuit pour découvrir toutes les fonctionnalités.
              </p>
              <div className="mt-3 sm:mt-4">
                <a
                  href="/dashboard/facturation"
                  className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 border border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-100 transition-all duration-300"
                >
                  <span>Voir les offres</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}



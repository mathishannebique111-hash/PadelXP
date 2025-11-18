import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserClubInfo, getClubDashboardData } from "@/lib/utils/club-utils";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import PageTitle from "../PageTitle";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default async function MembersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/membres");
  }

  const { clubId, clubSlug } = await getUserClubInfo();

  if (!clubId) {
    return (
      <div className="space-y-4">
        <PageTitle title="Membres" />
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Aucun club n’est relié à ce compte. Ajoutez un club pour visualiser vos membres.
        </div>
      </div>
    );
  }

  const { members } = await getClubDashboardData(clubId, clubSlug);

  // Récupérer tous les administrateurs (admin et owner) qui n'ont pas joué de matchs
  let allAdminIds = new Set<string>();
  let adminIdsWithMatches = new Set<string>();

  if (supabaseAdmin) {
    const { data: adminRows } = await supabaseAdmin
      .from("club_admins")
      .select("user_id")
      .eq("club_id", clubId);
    
    allAdminIds = new Set(
      (adminRows || [])
        .map((admin) => admin.user_id)
        .filter((id): id is string => typeof id === "string")
    );

    // Vérifier quels admins ont participé à des matchs (donc sont vraiment des joueurs)
    if (allAdminIds.size > 0) {
      const memberIds = members.map((m) => m.id).filter(Boolean);
      const { data: adminMatchParticipants } = await supabaseAdmin
        .from("match_participants")
        .select("user_id")
        .in("user_id", Array.from(allAdminIds))
        .eq("player_type", "user");
      
      adminIdsWithMatches = new Set(
        (adminMatchParticipants || []).map((p) => p.user_id as string).filter(Boolean)
      );
    }
  } else {
    const { data: adminRows } = await supabase
      .from("club_admins")
      .select("user_id")
      .eq("club_id", clubId);
    
    allAdminIds = new Set(
      (adminRows || [])
        .map((admin) => admin.user_id)
        .filter((id): id is string => typeof id === "string")
    );

    // Vérifier quels admins ont participé à des matchs (donc sont vraiment des joueurs)
    if (allAdminIds.size > 0) {
      const memberIds = members.map((m) => m.id).filter(Boolean);
      const { data: adminMatchParticipants } = await supabase
        .from("match_participants")
        .select("user_id")
        .in("user_id", Array.from(allAdminIds))
        .eq("player_type", "user");
      
      adminIdsWithMatches = new Set(
        (adminMatchParticipants || []).map((p) => p.user_id as string).filter(Boolean)
      );
    }
  }

  // Filtrer : exclure les admins qui n'ont jamais joué de matchs (administrateurs uniquement)
  const filteredMembers = members.filter((member) => {
    if (allAdminIds.has(member.id)) {
      // Si c'est un admin, ne l'inclure que s'il a joué au moins un match
      return adminIdsWithMatches.has(member.id);
    }
    // Si ce n'est pas un admin, l'inclure (c'est un joueur normal)
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <PageTitle title="Membres" />
        <span
          className="group relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white overflow-hidden ring-1 ring-white/20 border border-white/10 self-start sm:self-auto"
          style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.25) 0%, rgba(76,29,149,0.25) 100%)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-800" />
          <span aria-hidden>👥</span>
          <span className="relative">
          {filteredMembers.length} joueur{filteredMembers.length > 1 ? "s" : ""}
          </span>
        </span>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl border-2 border-white/25 ring-1 ring-white/10 bg-white/5 shadow-[0_10px_28px_rgba(0,0,0,0.32)] scrollbar-hide">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-white/10 text-left text-[10px] sm:text-xs uppercase tracking-wide text-white/60">
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3">Joueur</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 hidden md:table-cell">Email</th>
              <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center">Matchs</th>
              <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center hidden sm:table-cell">V</th>
              <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center hidden sm:table-cell">D</th>
              <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center">Points</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-right hidden md:table-cell">Dernier match</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-white/60">
                  Aucun joueur inscrit pour le moment.
                </td>
              </tr>
            )}
            {filteredMembers.map((member) => {
              const name =
                member.display_name ||
                `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() ||
                "Joueur";
              return (
                <tr key={member.id} className="border-t border-white/10 text-xs sm:text-sm text-white/80">
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-white truncate">{name}</span>
                      <span className="text-[10px] sm:text-xs text-white/50">
                        Inscrit le {formatDate(member.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 hidden md:table-cell truncate max-w-[200px]">{member.email || "—"}</td>
                  <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center font-semibold tabular-nums">{member.matches}</td>
                  <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center hidden sm:table-cell text-emerald-300 tabular-nums">
                    {member.wins}
                  </td>
                  <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center hidden sm:table-cell text-red-300 tabular-nums">
                    {member.losses}
                  </td>
                  <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 md:py-3 text-center font-semibold text-[#BFFF00] tabular-nums">
                    {member.points}
                  </td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-right hidden md:table-cell text-xs">
                    {formatDate(member.last_match_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}




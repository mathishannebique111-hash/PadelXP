import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserClubInfo, getClubDashboardData } from "@/lib/utils/club-utils";

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

  if (!clubId || !clubSlug) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Membres</h1>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Aucun club n’est relié à ce compte. Ajoutez un club pour visualiser vos membres.
        </div>
      </div>
    );
  }

  const { members } = await getClubDashboardData(clubId, clubSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">Membres</h1>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/70">
          {members.length} joueur{members.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full">
          <thead>
            <tr className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <th className="px-4 py-3">Joueur</th>
              <th className="px-4 py-3 hidden md:table-cell">Email</th>
              <th className="px-2 py-3 text-center">Matchs</th>
              <th className="px-2 py-3 text-center hidden sm:table-cell">V</th>
              <th className="px-2 py-3 text-center hidden sm:table-cell">D</th>
              <th className="px-2 py-3 text-center">Points</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Dernier match</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-white/60">
                  Aucun joueur inscrit pour le moment.
                </td>
              </tr>
            )}
            {members.map((member) => {
              const name =
                member.display_name ||
                `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() ||
                "Joueur";
              return (
                <tr key={member.id} className="border-t border-white/10 text-sm text-white/80">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{name}</span>
                      <span className="text-xs text-white/50">
                        Inscrit le {formatDate(member.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{member.email || "—"}</td>
                  <td className="px-2 py-3 text-center font-semibold tabular-nums">{member.matches}</td>
                  <td className="px-2 py-3 text-center hidden sm:table-cell text-emerald-300 tabular-nums">
                    {member.wins}
                  </td>
                  <td className="px-2 py-3 text-center hidden sm:table-cell text-red-300 tabular-nums">
                    {member.losses}
                  </td>
                  <td className="px-2 py-3 text-center font-semibold text-[#BFFF00] tabular-nums">
                    {member.points}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
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




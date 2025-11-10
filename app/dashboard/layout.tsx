import { createClient } from "@/lib/supabase/server";
import ClientLogout from "./ClientLogout";
import { redirect } from "next/navigation";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard");
  }

  const userMetadata = (user.user_metadata || {}) as Record<string, any>;

  const clubInfo = await getUserClubInfo();
  let clubId = clubInfo.clubId;
  let clubSlug = clubInfo.clubSlug;
  let clubName: string | null =
    (userMetadata?.club_name as string | null) ?? clubInfo.clubName ?? null;
  let clubLogo: string | null =
    (userMetadata?.club_logo_url as string | null) ?? clubInfo.clubLogoUrl ?? null;
  let adminClubData: { name?: string | null; logo_url?: string | null; slug?: string | null } | null = null;

  if (!clubId || !clubName || !clubLogo) {
    const { data: adminEntry } = await supabase
      .from("club_admins")
      .select("club_id, clubs(name, logo_url, slug)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminEntry?.club_id) {
      clubId = clubId ?? (adminEntry.club_id as string);
      adminClubData = (adminEntry as any)?.clubs ?? adminClubData;
      if (!clubSlug && adminClubData?.slug) {
        clubSlug = adminClubData.slug;
      }
    }
  }

  if (!clubId) {
    redirect("/clubs/login?next=/dashboard");
  }

  if ((!clubName || !clubLogo) && adminClubData) {
    if (!clubName && adminClubData.name) {
      clubName = adminClubData.name;
    }
    if (!clubLogo && adminClubData.logo_url) {
      clubLogo = adminClubData.logo_url;
    }
  }

  if ((!clubName || !clubLogo) && supabaseAdmin) {
    const { data: clubRow } = await supabaseAdmin
      .from("clubs")
      .select("name, logo_url")
      .eq("id", clubId)
      .maybeSingle();
    if (clubRow) {
      clubName = clubName ?? (clubRow.name as string | null) ?? null;
      clubLogo = clubLogo ?? (clubRow.logo_url as string | null) ?? null;
    }
  } else if (!clubName || !clubLogo) {
    const { data: profileWithClub } = await supabase
      .from("profiles")
      .select("clubs(name, logo_url)")
      .eq("id", user.id)
      .maybeSingle();
    const nestedClub = (profileWithClub as any)?.clubs as { name?: string | null; logo_url?: string | null } | null;
    if (nestedClub) {
      clubName = clubName ?? nestedClub.name ?? null;
      clubLogo = clubLogo ?? nestedClub.logo_url ?? null;
    }

    if ((!clubName || !clubLogo) && clubId) {
      const { data: clubAdminRow } = await supabase
        .from("club_admins")
        .select("clubs(name, logo_url)")
        .eq("user_id", user.id)
        .maybeSingle();
      const adminClub = (clubAdminRow as any)?.clubs as { name?: string | null; logo_url?: string | null } | null;
      if (adminClub) {
        clubName = clubName ?? adminClub.name ?? null;
        clubLogo = clubLogo ?? adminClub.logo_url ?? null;
      }
    }
  }

  if (!clubName && clubSlug) {
    clubName = clubSlug.replace(/-/g, " ").toUpperCase();
  }

  if (!clubLogo && userMetadata?.club_logo_url) {
    clubLogo = userMetadata.club_logo_url as string;
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-white/5 flex flex-col">
        <nav className="p-6 space-y-2 text-sm flex-1">
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard">Accueil</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/membres">Membres</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/classement">Classement</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/historique">Historique des matchs</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/feed">Feed du club</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/page-club">Page publique du club</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/challenges">Challenges</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/medias">Médias</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/parametres">Paramètres</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/roles">Rôles et accès</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/facturation">Facturation & essai</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/import-export">Import / Export</a>
          <a className="block px-3 py-2 rounded hover:bg-white/10" href="/dashboard/aide">Aide & Support</a>
          <div className="pt-2">
            <ClientLogout />
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-8 flex items-center gap-4">
          {clubLogo ? (
            <img
              src={clubLogo}
              alt={clubName || "Logo du club"}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : null}
          <h2 className="text-3xl font-bold text-white">{clubName || "Club"}</h2>
        </div>
        {children}
      </main>
    </div>
  );
}



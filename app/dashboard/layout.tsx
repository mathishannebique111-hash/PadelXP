import { createClient } from "@/lib/supabase/server";
import ClientLogout from "./ClientLogout";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard");
  }

  const userMetadata = (user.user_metadata || {}) as Record<string, any>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("club_id, club_slug")
    .eq("id", user.id)
    .maybeSingle();

  const clubId = profile?.club_id || (userMetadata?.club_id ?? null);
  const clubSlug = profile?.club_slug || (userMetadata?.club_slug ?? null);

  let clubName: string | null = userMetadata?.club_name || null;
  let clubLogo: string | null = userMetadata?.club_logo_url || null;

  if (clubId) {
    const { data: club } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", clubId)
      .maybeSingle();
    clubName = club?.name || clubName || null;
  }

  if (!clubName && clubSlug) {
    const { data: clubBySlug } = await supabase
      .from("clubs")
      .select("name")
      .eq("slug", clubSlug)
      .maybeSingle();
    clubName = clubBySlug?.name || clubSlug.replace(/-/g, " ").toUpperCase();
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
        </nav>
        <div className="p-6 border-t border-white/10">
          <ClientLogout />
        </div>
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



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

  // Étape 1: Récupérer le club_id depuis club_admins en priorité pour les admins
  let clubId: string | null = null;
  let clubSlug: string | null = null;
  let clubName: string | null = null;
  let clubLogo: string | null = null;

  // Vérifier d'abord si l'utilisateur est un admin de club
  if (supabaseAdmin) {
    const { data: adminEntry, error: adminEntryError } = await supabaseAdmin
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminEntryError) {
      console.warn("[dashboard/layout] club_admins lookup error", adminEntryError);
    }

    if (adminEntry?.club_id) {
      clubId = adminEntry.club_id as string;
    }
  }

  // Fallback: getUserClubInfo si rien n'a été trouvé
  if (!clubId) {
    const clubInfo = await getUserClubInfo();
    clubId = clubInfo.clubId;
    clubSlug = clubSlug ?? clubInfo.clubSlug;
    clubName = clubName ?? clubInfo.clubName;
    clubLogo = clubLogo ?? clubInfo.clubLogoUrl;
  }

  // Si toujours pas de clubId, rediriger
  if (!clubId) {
    redirect("/clubs/login?next=/dashboard");
  }

  // Fallback final: récupérer depuis la table clubs directement
  if (supabaseAdmin && clubId) {
    const { data: clubRow, error: clubRowError } = await supabaseAdmin
      .from("clubs")
      .select("name, logo_url, slug")
      .eq("id", clubId)
      .maybeSingle();

    if (clubRowError) {
      console.warn("[dashboard/layout] clubs lookup error", clubRowError);
    }

    if (clubRow) {
      clubName = clubName ?? (clubRow.name as string | null);
      clubLogo = clubLogo ?? (clubRow.logo_url as string | null);
      clubSlug = clubSlug ?? (clubRow.slug as string | null);
    }
  }

  // Fallback: utiliser les métadonnées du propriétaire du club
  if (supabaseAdmin && (!clubName || !clubLogo) && clubId) {
    const { data: owners, error: ownersError } = await supabaseAdmin
      .from("club_admins")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("role", "owner");

    if (ownersError) {
      console.warn("[dashboard/layout] club owners lookup error", ownersError);
    }

    const ownerId = owners?.[0]?.user_id as string | undefined;
    if (ownerId) {
      try {
        const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(ownerId);
        const ownerMeta = (ownerUser?.user?.user_metadata || {}) as Record<string, any>;
        clubName = clubName ?? (typeof ownerMeta.club_name === "string" ? ownerMeta.club_name : null);
        clubLogo = clubLogo ?? (typeof ownerMeta.club_logo_url === "string" ? ownerMeta.club_logo_url : null);
        clubSlug = clubSlug ?? (typeof ownerMeta.club_slug === "string" ? ownerMeta.club_slug : null);
      } catch (ownerMetaError) {
        console.warn("[dashboard/layout] Unable to fetch owner metadata", ownerMetaError);
      }
    }
  }

  // Fallback supplémentaire : récupérer depuis les métadonnées Supabase Auth
  if ((!clubName || !clubLogo) && supabaseAdmin) {
    try {
      const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
      const meta = (adminUser?.user?.user_metadata || {}) as Record<string, any>;
      clubName = clubName ?? (typeof meta.club_name === "string" ? meta.club_name : null);
      clubLogo = clubLogo ?? (typeof meta.club_logo_url === "string" ? meta.club_logo_url : null);
      clubSlug = clubSlug ?? (typeof meta.club_slug === "string" ? meta.club_slug : null);
    } catch (metaError) {
      console.warn("[dashboard/layout] Unable to fetch auth metadata", metaError);
    }
  }

  // Si le logo est un chemin de stockage, le convertir en URL publique
  if (clubLogo && !clubLogo.startsWith("http") && supabaseAdmin) {
    try {
      const { data } = supabaseAdmin.storage.from("club-logos").getPublicUrl(clubLogo);
      if (data?.publicUrl) {
        clubLogo = data.publicUrl;
      }
    } catch (storageError) {
      console.warn("[dashboard/layout] Unable to resolve logo public URL", {
        logo: clubLogo,
        error: storageError,
      });
    }
  }

  // Dernier fallback: utiliser le slug comme nom
  if (!clubName && clubSlug) {
    clubName = clubSlug.replace(/-/g, " ").toUpperCase();
  }

  // Fallback ultime: nom générique
  if (!clubName) {
    clubName = "Club";
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="w-48 shrink-0 border-r border-white/10 bg-white/5 flex flex-col">
        <nav className="p-4 space-y-4 text-sm flex-1">
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard">
            <span className="flex items-center gap-2 font-semibold">
              <span>🏠</span>
              <span>Accueil</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/membres">
            <span className="flex items-center gap-2 font-semibold">
              <span>👥</span>
              <span>Membres</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/classement">
            <span className="flex items-center gap-2 font-semibold">
              <span>🏆</span>
              <span>Classement</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/historique">
            <span className="flex items-center gap-2 font-semibold">
              <span>📊</span>
              <span>Historique des matchs</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/page-club">
            <span className="flex items-center gap-2 font-semibold">
              <span>🌐</span>
              <span>Page publique du club</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/challenges">
            <span className="flex items-center gap-2 font-semibold">
              <span>⚔️</span>
              <span>Challenges</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/medias">
            <span className="flex items-center gap-2 font-semibold">
              <span>📸</span>
              <span>Médias</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/roles">
            <span className="flex items-center gap-2 font-semibold">
              <span>👑</span>
              <span>Rôles et accès</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/facturation">
            <span className="flex items-center gap-2 font-semibold">
              <span>💳</span>
              <span>Facturation & essai</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/import-export">
            <span className="flex items-center gap-2 font-semibold">
              <span>📥</span>
              <span>Import / Export</span>
            </span>
          </a>
          <a className="block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300" href="/dashboard/aide">
            <span className="flex items-center gap-2 font-semibold">
              <span>❓</span>
              <span>Aide & Support</span>
            </span>
          </a>
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



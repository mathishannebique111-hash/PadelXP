import { createClient } from "@/lib/supabase/server";
import ClientLogout from "./ClientLogout";
import MobileMenu from "./MobileMenu";
import { redirect } from "next/navigation";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Suspense } from "react";

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
    <div className="min-h-screen bg-black text-white">
      {/* Menu hamburger et volet latéral (visible sur tous les écrans) */}
      <Suspense fallback={null}>
        <MobileMenu />
      </Suspense>

      <main className="p-8">
        {/* Logo et nom du club centré */}
        <div className="flex items-center justify-center gap-3 mb-12" style={{ paddingTop: '0px', marginTop: '-16px' }}>
          {clubLogo ? (
            <img
              src={clubLogo}
              alt={clubName || "Logo du club"}
              className="h-16 w-16 rounded-full object-cover flex-shrink-0"
            />
          ) : null}
          <h2 className="text-3xl font-bold text-white whitespace-nowrap">{clubName || "Club"}</h2>
        </div>
        {children}
      </main>
    </div>
  );
}



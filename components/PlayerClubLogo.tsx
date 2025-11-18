import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";

// Créer un client admin pour bypass RLS
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function PlayerClubLogo() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Récupérer le club_id de l'utilisateur
  let clubId: string | null = null;
  let logoUrl: string | null = null;

  // Essayer d'abord avec le client standard
  const { data: profile } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.club_id) {
    clubId = profile.club_id;
  }

  // Si pas de club_id, essayer avec le client admin
  if (!clubId && supabaseAdmin) {
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfile?.club_id) {
      clubId = adminProfile.club_id;
    }
  }

  // Si toujours pas de club_id, vérifier si l'utilisateur est un admin de club
  if (!clubId && supabaseAdmin) {
    const { data: clubAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clubAdmin?.club_id) {
      clubId = clubAdmin.club_id;
    }
  }

  // Récupérer le logo du club
  if (clubId && supabaseAdmin) {
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("logo_url")
      .eq("id", clubId)
      .maybeSingle();

    if (club?.logo_url && typeof club.logo_url === 'string' && club.logo_url.trim() !== '') {
      logoUrl = club.logo_url;
    }
  }

  // Si pas de logo depuis la table clubs, essayer depuis les métadonnées
  if (!logoUrl) {
    try {
      const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
      const metadata = adminUser?.user?.user_metadata;
      
      if (metadata?.club_logo_url && typeof metadata.club_logo_url === 'string' && metadata.club_logo_url.trim() !== '') {
        logoUrl = metadata.club_logo_url;
      }
    } catch (error) {
      console.warn("[PlayerClubLogo] Error fetching user metadata:", error);
    }
  }

  // Si toujours pas de logo et qu'on a un clubId, essayer avec les admins du club
  if (!logoUrl && clubId && supabaseAdmin) {
    try {
      const { data: clubAdmins } = await supabaseAdmin
        .from("club_admins")
        .select("user_id")
        .eq("club_id", clubId)
        .limit(5);

      if (clubAdmins && clubAdmins.length > 0) {
        for (const admin of clubAdmins) {
          try {
            const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            if (adminUser?.user?.user_metadata?.club_logo_url) {
              const adminLogoUrl = adminUser.user.user_metadata.club_logo_url as string;
              if (typeof adminLogoUrl === 'string' && adminLogoUrl.trim() !== '') {
                logoUrl = adminLogoUrl;
                break;
              }
            }
          } catch (userError) {
            // Continue to next admin
          }
        }
      }
    } catch (error) {
      console.warn("[PlayerClubLogo] Error fetching admin metadata:", error);
    }
  }

  // Convertir le logo en URL publique si nécessaire
  const publicLogoUrl = logoUrl ? getClubLogoPublicUrl(logoUrl) : null;

  if (!publicLogoUrl) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-[100] p-2 md:p-4">
      <img
        src={publicLogoUrl}
        alt="Logo du club"
        className="h-12 w-12 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-full object-cover"
      />
    </div>
  );
}


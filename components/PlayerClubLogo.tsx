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
  if (!logoUrl && supabaseAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(user.id);
      
      if (adminError) {
        console.warn("[PlayerClubLogo] Error fetching user metadata:", adminError.message || adminError);
      } else {
        const metadata = adminUser?.user?.user_metadata;
        
        if (metadata?.club_logo_url && typeof metadata.club_logo_url === 'string' && metadata.club_logo_url.trim() !== '') {
          logoUrl = metadata.club_logo_url;
        }
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs de fetch - ce n'est pas critique pour le fonctionnement
      if (error instanceof Error && error.message.includes('fetch failed')) {
        // Erreur réseau ou configuration - on ignore gracieusement
      } else {
        console.warn("[PlayerClubLogo] Error fetching user metadata:", error);
      }
    }
  }

  // Si toujours pas de logo et qu'on a un clubId, essayer avec les admins du club
  if (!logoUrl && clubId && supabaseAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: clubAdmins } = await supabaseAdmin
        .from("club_admins")
        .select("user_id")
        .eq("club_id", clubId)
        .limit(5);

      if (clubAdmins && clubAdmins.length > 0) {
        for (const admin of clubAdmins) {
          try {
            const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            
            if (adminError) {
              // Continue to next admin sans logger (erreur non critique)
              continue;
            }
            
            if (adminUser?.user?.user_metadata?.club_logo_url) {
              const adminLogoUrl = adminUser.user.user_metadata.club_logo_url as string;
              if (typeof adminLogoUrl === 'string' && adminLogoUrl.trim() !== '') {
                logoUrl = adminLogoUrl;
                break;
              }
            }
          } catch (userError) {
            // Continue to next admin - ignore les erreurs de fetch
            continue;
          }
        }
      }
    } catch (error) {
      // Ignorer gracieusement les erreurs - ce n'est pas critique
      if (!(error instanceof Error && error.message.includes('fetch failed'))) {
        console.warn("[PlayerClubLogo] Error fetching admin metadata:", error);
      }
    }
  }

  // Convertir le logo en URL publique si nécessaire
  const publicLogoUrl = logoUrl ? getClubLogoPublicUrl(logoUrl) : null;

  if (!publicLogoUrl) {
    return null;
  }

  return (
    <>
      {/* Mobile: logo absolu dans le flux de la page */}
      <div 
        className="absolute top-6 right-4 md:hidden z-[200] pointer-events-none" 
        style={{ 
          position: 'absolute',
        } as React.CSSProperties}
      >
        <div 
          className="pointer-events-auto flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
        >
          <img
            src={publicLogoUrl}
            alt="Logo du club"
            className="h-12 w-12 rounded-full object-cover"
            style={{ 
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Desktop: logo fixe */}
      <div 
        className="hidden md:fixed md:top-0 md:right-0 md:z-[200] md:p-4 md:pointer-events-none" 
        style={{ 
          position: 'fixed',
          top: '0',
          right: '0',
          zIndex: 200,
          willChange: 'auto',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitTransform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          pointerEvents: 'none',
          isolation: 'isolate',
        } as React.CSSProperties}
      >
        <div 
          className="pointer-events-auto flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
        >
          <img
            src={publicLogoUrl}
            alt="Logo du club"
            className="h-20 w-20 lg:h-24 lg:w-24 rounded-full object-cover"
            style={{ 
              display: 'block',
              willChange: 'auto',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
            }}
          />
        </div>
      </div>
    </>
  );
}


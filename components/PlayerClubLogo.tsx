import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import PlayerClubLogoDisplay from "./PlayerClubLogoDisplay";
import { logger } from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export default async function PlayerClubLogo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return (
      <PlayerClubLogoDisplay publicLogoUrl={null} name={null} />
    );
  }

  // Utiliser EXACTEMENT la même logique que la page "mon club" (app/(protected)/club/page.tsx)
  // pour récupérer le logo avec TOUS les fallbacks
  
  const metadata = (user.user_metadata || {}) as Record<string, any>;
  
  // Étape 1: Récupérer les infos du club avec getUserClubInfo
  let { clubId: initialClubId, clubSlug: initialClubSlug, clubName: initialClubName, clubLogoUrl: initialClubLogoUrl } = await getUserClubInfo();
  
  // Étape 2: Essayer de récupérer depuis la table profiles avec admin client
  let clubId = initialClubId;
  let clubSlug = initialClubSlug;
  
  if ((!clubId || !clubSlug) && supabaseAdmin) {
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("club_id, club_slug")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfile) {
      clubId = clubId ?? (adminProfile.club_id as string | null);
      clubSlug = clubSlug ?? (adminProfile.club_slug as string | null);
    }
  }

  // Étape 3: Si toujours pas de club, essayer avec le client standard
  if (!clubId || !clubSlug) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("club_id, club_slug")
      .eq("id", user.id)
      .maybeSingle();

    if (profileRow) {
      clubId = clubId ?? (profileRow.club_id as string | null);
      clubSlug = clubSlug ?? (profileRow.club_slug as string | null);
    }
  }

  // Étape 4: Si toujours pas de club, vérifier si l'utilisateur est un admin de club
  if ((!clubId || !clubSlug) && supabaseAdmin) {
    const { data: clubAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clubAdmin?.club_id) {
      clubId = clubAdmin.club_id as string;

      // Récupérer le slug et les infos depuis la table clubs
      const { data: clubData } = await supabaseAdmin
        .from("clubs")
        .select("slug, name, logo_url")
        .eq("id", clubAdmin.club_id)
        .maybeSingle();

      if (clubData) {
        clubSlug = clubSlug ?? (clubData.slug as string | null);
      }
    }
  }

  if (!clubId && clubSlug && supabaseAdmin) {
    const { data: slugLookup } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("slug", clubSlug)
      .maybeSingle();
    if (slugLookup?.id) {
      clubId = slugLookup.id as string;
    }
  }

  if (!clubId && clubSlug) {
    const { data: slugLookup } = await supabase
      .from("clubs")
      .select("id")
      .eq("slug", clubSlug)
      .maybeSingle();
    if (slugLookup?.id) {
      clubId = slugLookup.id as string;
    }
  }

  const finalClubId = clubId;

  // Récupérer le logo EXACTEMENT comme dans la page "mon club"
  let name: string | null = initialClubName || null;
  let logoUrl: string | null = null;

  // Priorité absolue : récupérer depuis clubs avec admin client (EXACTEMENT comme dans la page "mon club")
  if (finalClubId && supabaseAdmin) {
    const { data: clubData, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("name, logo_url")
      .eq("id", finalClubId)
      .maybeSingle();
    
    if (clubData && !clubError) {
      name = (clubData.name as string) || name;
      const rawLogoUrl = clubData.logo_url;
      if (rawLogoUrl && typeof rawLogoUrl === 'string' && rawLogoUrl.trim() !== '') {
        logoUrl = rawLogoUrl;
      }
    }
  }

  // Si pas encore récupéré complètement, essayer avec le slug (admin)
  if (!logoUrl && clubSlug && supabaseAdmin) {
    const { data: clubData, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("name, logo_url")
      .eq("slug", clubSlug)
      .maybeSingle();

    if (clubData && !clubError) {
      if (!name) name = (clubData.name as string) || null;
      const rawLogoUrl = clubData.logo_url;
      if (!logoUrl && rawLogoUrl && typeof rawLogoUrl === 'string' && rawLogoUrl.trim() !== '') {
        logoUrl = rawLogoUrl;
      }
    }
  }

  // Priorité sur clubLogoUrl si disponible (depuis getUserClubInfo qui vérifie aussi les métadonnées)
  if (!logoUrl && initialClubLogoUrl && typeof initialClubLogoUrl === 'string' && initialClubLogoUrl.trim() !== '') {
    logoUrl = initialClubLogoUrl;
  }
  
  // Si toujours pas de logo, essayer de le récupérer depuis les métadonnées utilisateur
  if (!logoUrl && metadata?.club_logo_url && typeof metadata.club_logo_url === 'string' && metadata.club_logo_url.trim() !== '') {
    logoUrl = metadata.club_logo_url as string;
  }

  // Dernier essai : récupérer directement depuis la table clubs avec une requête simple
  if (!logoUrl && finalClubId && supabaseAdmin) {
    const { data: directLogoData, error: directLogoError } = await supabaseAdmin
      .from("clubs")
      .select("logo_url")
      .eq("id", finalClubId)
      .maybeSingle();
    
    if (directLogoData?.logo_url && typeof directLogoData.logo_url === 'string' && directLogoData.logo_url.trim() !== '') {
      logoUrl = directLogoData.logo_url;
    }
  }

  // Fallback spécial : récupérer depuis les métadonnées des admins du club
  if (!logoUrl && finalClubId && supabaseAdmin) {
    try {
      const { data: clubAdmins, error: adminsError } = await supabaseAdmin
        .from("club_admins")
        .select("user_id")
        .eq("club_id", finalClubId)
        .limit(5);
      
      if (clubAdmins && clubAdmins.length > 0 && !adminsError) {
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
            // Ignorer les erreurs
          }
        }
      }
    } catch (error) {
      // Ignorer les erreurs
    }
  }

  logger.info('[PlayerClubLogo] Logo récupéré (même logique que page mon club):', {
    finalClubId,
    clubSlug,
    name,
    logoUrl: logoUrl ? `${logoUrl.substring(0, 50)}...` : null,
    hasLogo: !!logoUrl,
  });

  // Convertir le logo en URL publique si nécessaire (comme dans getUserClubInfo)
  const publicLogoUrl = logoUrl ? getClubLogoPublicUrl(logoUrl) : null;
  
  // Taille standardisée pour tous les logos : 6rem (96px)
  // Le CSS global force cette taille pour assurer la cohérence entre tous les clubs
  const logoSize = '6rem'; // 96px
  
  // Passer les données au composant Client pour l'affichage
  return <PlayerClubLogoDisplay publicLogoUrl={publicLogoUrl} name={name} logoSize={logoSize} />;
}

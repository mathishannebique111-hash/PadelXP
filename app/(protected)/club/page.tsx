import { redirect } from "next/navigation";
import NavigationBar from "@/components/NavigationBar";
import LogoutButton from "@/components/LogoutButton";
import ClubProfileClient from "@/components/club/ClubProfileClient";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getClubPublicExtras, getUserClubInfo } from "@/lib/utils/club-utils";

type ClubRecord = {
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  number_of_courts: number | null;
  court_type: string | null;
  logo_url: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadClubIdentity({
  clubId,
  clubSlug,
  supabase,
}: {
  clubId: string | null;
  clubSlug: string | null;
  supabase: ReturnType<typeof createClient>;
}): Promise<{ name: string | null; logo_url: string | null } | null> {
  if (supabaseAdmin && (clubId || clubSlug)) {
    const adminQuery = supabaseAdmin
      .from("clubs")
      .select("id, name, logo_url")
      .limit(1);
    if (clubId) {
      adminQuery.eq("id", clubId);
    } else if (clubSlug) {
      adminQuery.eq("slug", clubSlug);
    }
    const { data } = await adminQuery.maybeSingle();
    if (data) {
      const name = (data.name as string | null) ?? null;
      const logo = (data.logo_url as string | null) ?? null;
      if (name || logo) {
        return { name, logo_url: logo };
      }
    }
  }

  if (supabaseAdmin && (clubId || clubSlug)) {
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = data?.users?.find((user) => {
        const meta = (user.user_metadata || {}) as Record<string, any>;
        return (clubId && meta.club_id === clubId) || (clubSlug && meta.club_slug === clubSlug);
      });
      if (match) {
        const meta = (match.user_metadata || {}) as Record<string, any>;
        const name = typeof meta.club_name === "string" ? meta.club_name : null;
        const logo = typeof meta.club_logo_url === "string" ? meta.club_logo_url : null;
        if (name || logo) {
          return { name, logo_url: logo };
        }
      }
    } catch (error) {
      console.warn("[player/club] Unable to fetch club metadata from auth", error);
    }
  }

  if (clubId || clubSlug) {
    const fallbackQuery = supabase
      .from("clubs")
      .select("id, name, logo_url")
      .limit(1);
    if (clubId) {
      fallbackQuery.eq("id", clubId);
    } else if (clubSlug) {
      fallbackQuery.eq("slug", clubSlug);
    }
    const { data } = await fallbackQuery.maybeSingle();
    if (data) {
      const name = (data.name as string | null) ?? null;
      const logo = (data.logo_url as string | null) ?? null;
      if (name || logo) {
        return { name, logo_url: logo };
      }
    }
  }

  return null;
}

async function fetchClubRecord({
  clubId,
  clubSlug,
  supabase,
  metadata,
}: {
  clubId: string | null;
  clubSlug: string | null;
  supabase: ReturnType<typeof createClient>;
  metadata: Record<string, any>;
}): Promise<{ club: ClubRecord | null; resolvedClubId: string | null }> {
  let resolvedId = clubId;
  let club: ClubRecord | null = null;

  if (!resolvedId && clubSlug && supabaseAdmin) {
    const { data: clubBySlug, error: slugError } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("slug", clubSlug)
      .maybeSingle();
    if (!slugError && clubBySlug?.id) {
      resolvedId = clubBySlug.id as string;
    }
  }

  if (resolvedId && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("clubs")
      .select("name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
      .eq("id", resolvedId)
      .maybeSingle();

    if (!error && data) {
      club = data as ClubRecord;
    }
  }

  if (!club && resolvedId) {
    const { data, error } = await supabase
      .from("clubs")
      .select("name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
      .eq("id", resolvedId)
      .maybeSingle();

    if (!error && data) {
      club = data as ClubRecord;
    }
  }

  if (!club && clubSlug && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("clubs")
      .select("id, name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
      .eq("slug", clubSlug)
      .maybeSingle();
    if (!error && data) {
      resolvedId = (data as { id: string }).id;
      club = {
        name: data.name,
        address: data.address,
        postal_code: data.postal_code,
        city: data.city,
        phone: data.phone,
        website: data.website,
        number_of_courts: data.number_of_courts,
        court_type: data.court_type,
        logo_url: data.logo_url,
      } as ClubRecord;
    }
  }

  if (club) {
    club.logo_url = club.logo_url ?? (metadata?.club_logo_url as string | null) ?? null;
  }

  return { club, resolvedClubId: resolvedId ?? null };
}

export default async function PlayerClubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const metadata = (user.user_metadata || {}) as Record<string, any>;

  let { clubId, clubSlug, clubName, clubLogoUrl } = await getUserClubInfo();
  
  console.log("[PlayerClubPage] Initial club info from getUserClubInfo:", {
    clubId,
    clubSlug,
    clubName,
    clubLogoUrl: clubLogoUrl ? `${clubLogoUrl.substring(0, 50)}...` : null,
    clubLogoUrlType: typeof clubLogoUrl,
    clubLogoUrlLength: clubLogoUrl?.length || 0,
    userId: user.id,
    metadataClubLogoUrl: metadata?.club_logo_url ? `${(metadata.club_logo_url as string).substring(0, 50)}...` : null,
  });

  // Essayer de récupérer depuis la table profiles avec admin client si disponible
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

  // Si toujours pas de club, essayer avec le client standard
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

  // Si toujours pas de club, vérifier si l'utilisateur est un admin de club
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
        clubName = clubName ?? (clubData.name as string | null);
        clubLogoUrl = clubLogoUrl ?? (clubData.logo_url as string | null);
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

  if (!clubId && !clubSlug) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto w-full max-w-5xl px-6 py-10 text-white">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Mon club
              <span className="text-3xl">🏢</span>
            </h1>
          </div>
          <NavigationBar currentPage="club" />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Vous n'êtes rattaché à aucun club pour le moment.
          </div>
        </div>
      </div>
    );
  }

  // Déterminer le clubId final
  let finalClubId: string | null = clubId;
  
  console.log("[PlayerClubPage] Étape initiale:", {
    clubId,
    clubSlug,
    finalClubId,
    hasSupabaseAdmin: !!supabaseAdmin,
  });
  
  // Si on n'a pas de clubId mais qu'on a un slug, le récupérer
  if (!finalClubId && clubSlug) {
    if (supabaseAdmin) {
      const { data: slugLookup, error: slugError } = await supabaseAdmin
        .from("clubs")
        .select("id")
        .eq("slug", clubSlug)
        .maybeSingle();
      
      console.log("[PlayerClubPage] Lookup slug->id (admin):", {
        clubSlug,
        slugLookup,
        error: slugError,
      });
      
      if (slugLookup?.id) {
        finalClubId = slugLookup.id as string;
      }
    }
    
    if (!finalClubId) {
      const { data: slugLookup, error: slugError } = await supabase
        .from("clubs")
        .select("id")
        .eq("slug", clubSlug)
        .maybeSingle();
      
      console.log("[PlayerClubPage] Lookup slug->id (standard):", {
        clubSlug,
        slugLookup,
        error: slugError,
      });
      
      if (slugLookup?.id) {
        finalClubId = slugLookup.id as string;
      }
    }
  }

  console.log("[PlayerClubPage] Après détermination finalClubId:", {
    finalClubId,
    clubSlug,
  });

  // Récupérer TOUJOURS directement depuis la table clubs
  let name: string = "Club";
  let logoUrl: string | null = null;
  let clubRecord: ClubRecord | null = null;

  // Priorité absolue : récupérer depuis clubs avec admin client (bypass RLS) via club_id
  if (finalClubId && supabaseAdmin) {
    console.log("[PlayerClubPage] Tentative récupération par club_id (admin)...");
    const { data: clubData, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("name, logo_url, address, postal_code, city, phone, website, number_of_courts, court_type")
      .eq("id", finalClubId)
      .maybeSingle();
    
    console.log("[PlayerClubPage] Récupération par club_id (admin):", {
      finalClubId,
      clubData: clubData ? { name: clubData.name, logo_url: clubData.logo_url } : null,
      hasData: !!clubData,
      hasError: !!clubError,
    });
    
    if (clubError) {
      console.error("[PlayerClubPage] ❌ Erreur lors de la récupération par club_id (admin):", {
        message: clubError.message,
        code: clubError.code,
        details: clubError.details,
        hint: clubError.hint,
        fullError: JSON.stringify(clubError, null, 2),
      });
    }
    
    if (clubData && !clubError) {
      name = (clubData.name as string) || name;
      // Gérer logo_url correctement : peut être null, false, ou une string
      const rawLogoUrl = clubData.logo_url;
      console.log("[PlayerClubPage] Raw logo_url from database:", {
        rawLogoUrl,
        type: typeof rawLogoUrl,
        isString: typeof rawLogoUrl === 'string',
        isNull: rawLogoUrl === null,
        isUndefined: rawLogoUrl === undefined,
        isEmpty: rawLogoUrl === '',
        value: rawLogoUrl,
      });
      
      if (rawLogoUrl && typeof rawLogoUrl === 'string' && rawLogoUrl.trim() !== '') {
        logoUrl = rawLogoUrl;
        console.log("[PlayerClubPage] ✅ Logo URL assigné:", logoUrl.substring(0, 80));
      } else {
        console.log("[PlayerClubPage] ⚠️ Logo URL non valide, valeur actuelle logoUrl:", logoUrl);
        if (!logoUrl) {
          logoUrl = null;
        }
      }
      clubRecord = clubData as ClubRecord;
      console.log("[PlayerClubPage] ✅ Données récupérées par club_id (admin):", { 
        name, 
        logoUrl: logoUrl ? `${logoUrl.substring(0, 50)}...` : null,
        rawLogoUrl,
        rawLogoUrlType: typeof rawLogoUrl,
        finalLogoUrl: logoUrl,
      });
    } else if (!clubData && !clubError) {
      console.warn("[PlayerClubPage] ⚠️ Aucune donnée retournée (ni erreur ni données) pour club_id:", finalClubId);
    }
  }

  // Si pas encore récupéré complètement, essayer avec le slug (admin)
  if (!clubRecord && clubSlug && supabaseAdmin) {
    console.log("[PlayerClubPage] Tentative récupération par slug (admin)...");
    const { data: clubData, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("name, logo_url, address, postal_code, city, phone, website, number_of_courts, court_type")
      .eq("slug", clubSlug)
      .maybeSingle();

    console.log("[PlayerClubPage] Récupération par slug (admin):", {
      clubSlug,
      clubData: clubData ? { name: clubData.name, logo_url: clubData.logo_url } : null,
      hasData: !!clubData,
      hasError: !!clubError,
    });
    
    if (clubError) {
      console.error("[PlayerClubPage] ❌ Erreur lors de la récupération par slug (admin):", {
        message: clubError.message,
        code: clubError.code,
        details: clubError.details,
        hint: clubError.hint,
        fullError: JSON.stringify(clubError, null, 2),
      });
    }
    
    if (clubData && !clubError) {
      if (name === "Club") name = (clubData.name as string) || name;
      // Gérer logo_url correctement : peut être null, false, ou une string
      const rawLogoUrl = clubData.logo_url;
      if (!logoUrl && rawLogoUrl && typeof rawLogoUrl === 'string' && rawLogoUrl.trim() !== '') {
        logoUrl = rawLogoUrl;
      } else if (!logoUrl) {
        logoUrl = null;
      }
      if (!clubRecord) clubRecord = clubData as ClubRecord;
      console.log("[PlayerClubPage] ✅ Données récupérées par slug (admin):", { 
        name, 
        logoUrl: logoUrl ? `${logoUrl.substring(0, 50)}...` : null,
        rawLogoUrl,
        rawLogoUrlType: typeof rawLogoUrl,
      });
    } else if (!clubData && !clubError) {
      console.warn("[PlayerClubPage] ⚠️ Aucune donnée retournée (ni erreur ni données) pour slug:", clubSlug);
    }
  }

  // Fallback avec client standard si nécessaire via club_id
  if (!clubRecord && finalClubId) {
    console.log("[PlayerClubPage] Tentative récupération par club_id (standard)...");
    const { data: clubData, error: clubError } = await supabase
      .from("clubs")
      .select("name, logo_url, address, postal_code, city, phone, website, number_of_courts, court_type")
      .eq("id", finalClubId)
      .maybeSingle();
    
    console.log("[PlayerClubPage] Fallback standard par club_id:", {
      finalClubId,
      clubData: clubData ? { name: clubData.name, logo_url: clubData.logo_url } : null,
      hasData: !!clubData,
      hasError: !!clubError,
    });
    
    if (clubError) {
      console.error("[PlayerClubPage] ❌ Erreur lors de la récupération par club_id (standard):", {
        message: clubError.message,
        code: clubError.code,
        details: clubError.details,
        hint: clubError.hint,
        fullError: JSON.stringify(clubError, null, 2),
      });
    }
    
    if (clubData && !clubError) {
      if (name === "Club") name = (clubData.name as string) || name;
      // Gérer logo_url correctement : peut être null, false, ou une string
      const rawLogoUrl = clubData.logo_url;
      if (!logoUrl && rawLogoUrl && typeof rawLogoUrl === 'string' && rawLogoUrl.trim() !== '') {
        logoUrl = rawLogoUrl;
      } else if (!logoUrl) {
        logoUrl = null;
      }
      if (!clubRecord) clubRecord = clubData as ClubRecord;
      console.log("[PlayerClubPage] ✅ Données récupérées par club_id (standard):", { 
        name, 
        logoUrl: logoUrl ? `${logoUrl.substring(0, 50)}...` : null,
        rawLogoUrl,
        rawLogoUrlType: typeof rawLogoUrl,
      });
    } else if (!clubData && !clubError) {
      console.warn("[PlayerClubPage] ⚠️ Aucune donnée retournée (ni erreur ni données) pour club_id:", finalClubId);
    }
  }

  // Fallback avec client standard via slug
  if (!clubRecord && clubSlug) {
    console.log("[PlayerClubPage] Tentative récupération par slug (standard)...");
    const { data: clubData, error: clubError } = await supabase
      .from("clubs")
      .select("name, logo_url, address, postal_code, city, phone, website, number_of_courts, court_type")
      .eq("slug", clubSlug)
      .maybeSingle();
    
    console.log("[PlayerClubPage] Fallback standard par slug:", {
      clubSlug,
      clubData: clubData ? { name: clubData.name, logo_url: clubData.logo_url } : null,
      hasData: !!clubData,
      hasError: !!clubError,
    });
    
    if (clubError) {
      console.error("[PlayerClubPage] ❌ Erreur lors de la récupération par slug (standard):", {
        message: clubError.message,
        code: clubError.code,
        details: clubError.details,
        hint: clubError.hint,
        fullError: JSON.stringify(clubError, null, 2),
      });
    }
    
    if (clubData && !clubError) {
      if (name === "Club") name = (clubData.name as string) || name;
      // Gérer logo_url correctement : peut être null, false, ou une string
      const rawLogoUrl = clubData.logo_url;
      if (!logoUrl && rawLogoUrl && typeof rawLogoUrl === 'string' && rawLogoUrl.trim() !== '') {
        logoUrl = rawLogoUrl;
      } else if (!logoUrl) {
        logoUrl = null;
      }
      if (!clubRecord) clubRecord = clubData as ClubRecord;
      console.log("[PlayerClubPage] ✅ Données récupérées par slug (standard):", { 
        name, 
        logoUrl: logoUrl ? `${logoUrl.substring(0, 50)}...` : null,
        rawLogoUrl,
        rawLogoUrlType: typeof rawLogoUrl,
      });
    } else if (!clubData && !clubError) {
      console.warn("[PlayerClubPage] ⚠️ Aucune donnée retournée (ni erreur ni données) pour slug:", clubSlug);
    }
  }

  // Fallback sur données déjà récupérées
  if ((!name || name === "Club") && clubName) {
    name = clubName;
  }
  
  // Priorité sur clubLogoUrl si disponible (depuis getUserClubInfo qui vérifie aussi les métadonnées)
  if (!logoUrl && clubLogoUrl) {
    console.log("[PlayerClubPage] Utilisation du logo depuis clubLogoUrl (métadonnées/utilisateur):", clubLogoUrl.substring(0, 80));
    logoUrl = clubLogoUrl;
  }
  
  // Si toujours pas de logo, essayer de le récupérer depuis les métadonnées utilisateur
  if (!logoUrl && metadata?.club_logo_url && typeof metadata.club_logo_url === 'string' && metadata.club_logo_url.trim() !== '') {
    console.log("[PlayerClubPage] Utilisation du logo depuis métadonnées user:", metadata.club_logo_url.substring(0, 80));
    logoUrl = metadata.club_logo_url as string;
  }

  // Utiliser les données de clubRecord si on les a
  const club = clubRecord;

  const effectiveClubId = finalClubId;
  
  // Dernier essai : récupérer directement depuis la table clubs avec une requête simple
  if (!logoUrl && effectiveClubId && supabaseAdmin) {
    console.log("[PlayerClubPage] Dernier essai : récupération directe de logo_url...");
    const { data: directLogoData, error: directLogoError } = await supabaseAdmin
      .from("clubs")
      .select("logo_url")
      .eq("id", effectiveClubId)
      .maybeSingle();
    
    console.log("[PlayerClubPage] Récupération directe logo_url:", {
      directLogoData,
      error: directLogoError,
      logo_url: directLogoData?.logo_url,
      type: typeof directLogoData?.logo_url,
    });
    
    if (directLogoData?.logo_url && typeof directLogoData.logo_url === 'string' && directLogoData.logo_url.trim() !== '') {
      logoUrl = directLogoData.logo_url;
      console.log("[PlayerClubPage] ✅ Logo récupéré via requête directe:", logoUrl.substring(0, 80));
    }
  }

  // Fallback spécial pour les clubs existants : récupérer depuis les métadonnées des admins du club
  if (!logoUrl && effectiveClubId && supabaseAdmin) {
    console.log("[PlayerClubPage] Fallback spécial TCAM : récupération depuis les admins du club...");
    try {
      // Récupérer les admins du club
      const { data: clubAdmins, error: adminsError } = await supabaseAdmin
        .from("club_admins")
        .select("user_id")
        .eq("club_id", effectiveClubId)
        .limit(5);
      
      console.log("[PlayerClubPage] Admins du club trouvés:", {
        count: clubAdmins?.length || 0,
        error: adminsError,
      });
      
      if (clubAdmins && clubAdmins.length > 0 && !adminsError) {
        // Récupérer les métadonnées des admins pour trouver le logo
        for (const admin of clubAdmins) {
          try {
            const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            if (adminUser?.user?.user_metadata?.club_logo_url) {
              const adminLogoUrl = adminUser.user.user_metadata.club_logo_url as string;
              if (typeof adminLogoUrl === 'string' && adminLogoUrl.trim() !== '') {
                logoUrl = adminLogoUrl;
                console.log("[PlayerClubPage] ✅ Logo récupéré depuis métadonnées admin du club:", logoUrl.substring(0, 80));
                break; // On arrête dès qu'on trouve un logo valide
              }
            }
          } catch (userError) {
            console.warn("[PlayerClubPage] Erreur lors de la récupération des métadonnées admin:", userError);
          }
        }
      }
    } catch (error) {
      console.warn("[PlayerClubPage] Erreur lors du fallback admin:", error);
    }
  }

  console.log("[PlayerClubPage] Données finales avant rendu:", {
    name,
    logoUrl: logoUrl ? `${logoUrl.substring(0, 50)}...` : null,
    logoUrlLength: logoUrl?.length || 0,
    finalClubId,
    clubSlug,
    hasClubRecord: !!clubRecord,
    logoUrlType: typeof logoUrl,
    logoUrlIsEmpty: !logoUrl || logoUrl.trim() === "",
    clubNameFromMetadata: clubName,
    clubLogoUrlFromMetadata: clubLogoUrl ? `${clubLogoUrl.substring(0, 50)}...` : null,
    metadataLogoUrl: metadata?.club_logo_url ? `${(metadata.club_logo_url as string).substring(0, 50)}...` : null,
  });

  const extras = effectiveClubId ? await getClubPublicExtras(effectiveClubId) : {
    address: null,
    postal_code: null,
    city: null,
    phone: null,
    website: null,
    number_of_courts: null,
    court_type: null,
    description: null,
    opening_hours: null,
  };

  const addressValue = club?.address ?? extras.address ?? null;
  const postalValue = club?.postal_code ?? extras.postal_code ?? null;
  const cityValue = club?.city ?? extras.city ?? null;

  const addressLineParts: string[] = [];
  if (addressValue) addressLineParts.push(addressValue);
  if (postalValue) addressLineParts.push(postalValue);
  if (cityValue) addressLineParts.push(cityValue);
  const addressLine = addressLineParts.length ? addressLineParts.join(" · ") : null;

  const phone = club?.phone ?? extras.phone ?? null;
  const website = club?.website ?? extras.website ?? null;
  const numberOfCourts = club?.number_of_courts ?? extras.number_of_courts ?? null;
  const courtType = club?.court_type ?? extras.court_type ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900">
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-10 text-white">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Mon club
              <span className="text-3xl">🏢</span>
          </h1>
          <LogoutButton />
        </div>
        <NavigationBar currentPage="club" />

        <ClubProfileClient
          name={name}
          logoUrl={logoUrl}
          description={extras.description ?? null}
          addressLine={addressLine}
          phone={phone}
          website={website}
          numberOfCourts={numberOfCourts}
          courtType={courtType}
          openingHours={extras.opening_hours ?? null}
        />
      </div>
    </div>
  );
}

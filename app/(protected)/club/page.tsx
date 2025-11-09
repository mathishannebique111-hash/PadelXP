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
      <div className="mx-auto w-full max-w-5xl px-6 py-10 text-white">
        <div className="mb-6 flex items-center justify_between">
          <h1 className="text-3xl font-bold">Mon club</h1>
          <LogoutButton />
        </div>
        <NavigationBar currentPage="club" />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          Vous n'êtes rattaché à aucun club pour le moment.
        </div>
      </div>
    );
  }

  const { club, resolvedClubId } = await fetchClubRecord({
    clubId,
    clubSlug,
    supabase,
    metadata,
  });

  const effectiveClubId = resolvedClubId ?? clubId;

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

  if (!club && !extras.description && !extras.address && !extras.phone) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10 text-white">
        <div className="mb-6 flex items-center justify_between">
          <h1 className="text-3xl font-bold">Mon club</h1>
          <LogoutButton />
        </div>
        <NavigationBar currentPage="club" />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          Impossible de retrouver votre club. Contactez le support.
        </div>
      </div>
    );
  }

  let name = club?.name ?? null;
  let logoUrl = club?.logo_url ?? null;

  if (!name || !logoUrl) {
    const identity = await loadClubIdentity({
      clubId: effectiveClubId,
      clubSlug,
      supabase,
    });
    if (identity) {
      name = name ?? identity.name ?? null;
      logoUrl = logoUrl ?? identity.logo_url ?? null;
    }
  }

  if ((!name || !logoUrl) && effectiveClubId) {
    const identity = await supabase
      .from("clubs")
      .select("name, logo_url")
      .eq("id", effectiveClubId)
      .maybeSingle();
    if (identity.data) {
      name = name ?? (identity.data.name as string | null);
      logoUrl = logoUrl ?? (identity.data.logo_url as string | null);
    }
  }

  if ((!name || !logoUrl) && clubSlug) {
    const identity = await supabase
      .from("clubs")
      .select("name, logo_url")
      .eq("slug", clubSlug)
      .maybeSingle();
    if (identity.data) {
      name = name ?? (identity.data.name as string | null);
      logoUrl = logoUrl ?? (identity.data.logo_url as string | null);
    }
  }

  name = name ?? clubName ?? (metadata?.club_name as string | null) ?? "Club";
  logoUrl = logoUrl ?? clubLogoUrl ?? (metadata?.club_logo_url as string | null) ?? null;

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
    <div className="mx-auto w-full max-w-5xl px-6 py-10 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mon club</h1>
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
  );
}

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import PageTitle from "@/components/PageTitle";
import ClubProfileClient from "@/components/club/ClubProfileClient";
import { getUserClubInfo, getClubPublicExtras } from "@/lib/utils/club-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// Créer un client admin pour bypass RLS dans les requêtes critiques
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

export default async function ClubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:pt-12 pb-4 sm:pb-6 md:pb-8">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            <p className="font-semibold mb-1">⚠️ Session requise</p>
            <p>Veuillez vous connecter pour accéder à votre club.</p>
            <a className="text-blue-400 underline mt-2 inline-block" href="/login">Se connecter</a>
          </div>
        </div>
      </div>
    );
  }

  // Récupérer les informations du club (logique robuste alignée sur PlayerClubLogo)
  const { clubId: initialClubId, clubSlug: initialClubSlug, clubName: initialClubName, clubLogoUrl: initialClubLogoUrl } = await getUserClubInfo();

  let clubId = initialClubId;
  let clubSlug = initialClubSlug;
  let finalClubName = initialClubName;
  let finalClubLogoUrl = initialClubLogoUrl;

  // Fallbacks supplémentaires (comme dans PlayerClubLogo)
  if (!clubId && supabaseAdmin) {
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("club_id, club_slug")
      .eq("id", user.id)
      .maybeSingle();
    if (adminProfile) {
      clubId = adminProfile.club_id;
      clubSlug = adminProfile.club_slug;
    }
  }

  // Récupérer les données détaillées du club
  let clubData: {
    name: string;
    logoUrl: string | null;
    description: string | null;
    addressLine: string | null;
    phone: string | null;
    website: string | null;
    numberOfCourts: number | null;
    courtType: string | null;
    openingHours: any;
  } | null = null;

  if (clubId || clubSlug) {
    try {
      const resolvedClubId = clubId || (clubSlug ? (await supabase.from("clubs").select("id").eq("slug", clubSlug).maybeSingle()).data?.id : null);

      if (resolvedClubId && supabaseAdmin) {
        const { data: clubRecord } = await supabaseAdmin
          .from("clubs")
          .select("*")
          .eq("id", resolvedClubId)
          .maybeSingle();

        if (clubRecord) {
          finalClubName = clubRecord.name || finalClubName;
          const rawLogoUrl = clubRecord.logo_url;
          if (rawLogoUrl) {
            finalClubLogoUrl = getClubLogoPublicUrl(rawLogoUrl);
          }
        }
      }

      // Extras (heures, description, etc.)
      const extras = clubId ? await getClubPublicExtras(clubId) : null;

      // Fallback final pour le logo (métadonnées admins comme dans PlayerClubLogo)
      if (!finalClubLogoUrl && resolvedClubId && supabaseAdmin) {
        const { data: clubAdmins } = await supabaseAdmin
          .from("club_admins")
          .select("user_id")
          .eq("club_id", resolvedClubId)
          .limit(3);

        if (clubAdmins) {
          for (const admin of clubAdmins) {
            const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            if (adminUser?.user?.user_metadata?.club_logo_url) {
              finalClubLogoUrl = getClubLogoPublicUrl(adminUser.user.user_metadata.club_logo_url);
              break;
            }
          }
        }
      }

      if (finalClubName) {
        const addressLineParts: string[] = [];
        if (clubId) {
          const clubRecord = (await supabaseAdmin?.from("clubs").select("address, postal_code, city, phone, website, number_of_courts, court_type").eq("id", clubId).maybeSingle())?.data;

          const addressValue = clubRecord?.address ?? extras?.address ?? null;
          const postalValue = clubRecord?.postal_code ?? extras?.postal_code ?? null;
          const cityValue = clubRecord?.city ?? extras?.city ?? null;

          if (addressValue) addressLineParts.push(addressValue);
          if (postalValue) addressLineParts.push(postalValue);
          if (cityValue) addressLineParts.push(cityValue);

          clubData = {
            name: finalClubName,
            logoUrl: finalClubLogoUrl,
            description: extras?.description ?? null,
            addressLine: addressLineParts.length ? addressLineParts.join(" · ") : null,
            phone: clubRecord?.phone ?? extras?.phone ?? null,
            website: clubRecord?.website ?? extras?.website ?? null,
            numberOfCourts: clubRecord?.number_of_courts ?? extras?.number_of_courts ?? null,
            courtType: clubRecord?.court_type ?? extras?.court_type ?? null,
            openingHours: extras?.opening_hours ?? null,
          };
        }
      }
    } catch (error) {
      logger.error("[Club] Erreur lors de la récupération des données:", error);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#172554]">
      {/* Background avec overlay - Transparent en haut pour fusionner avec le fond du layout */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />

      {/* Halos vert et bleu animés */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-4 md:pt-8 pb-4 sm:pb-6 md:pb-8">
        <PageTitle title="Mon club" subtitle="Informations sur votre club" />

        {!clubId && (
          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-sm text-yellow-200">
            <p className="font-semibold mb-1">⚠️ Club non défini</p>
            <p>Vous devez être rattaché à un club pour accéder à cette page. Contactez votre club pour obtenir un code d'invitation.</p>
          </div>
        )}

        {clubData ? (
          <div className="mt-6 space-y-6">
            <ClubProfileClient
              name={clubData.name}
              logoUrl={clubData.logoUrl}
              description={clubData.description}
              addressLine={clubData.addressLine}
              phone={clubData.phone}
              website={clubData.website}
              numberOfCourts={clubData.numberOfCourts}
              courtType={clubData.courtType}
              openingHours={clubData.openingHours}
            />
          </div>
        ) : clubId ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p>Erreur lors du chargement des informations du club.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

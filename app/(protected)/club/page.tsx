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

  // Récupérer les informations du club de l'utilisateur
  const { clubId: userClubId, clubName, clubLogoUrl } = await getUserClubInfo();
  const hasNoClub = !userClubId;

  // Récupérer les données du club
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

  if (userClubId) {
    try {
      // Récupérer les données du club
      let finalClubId = userClubId;
      let clubNameForPage = clubName || "Club";
      let clubLogoUrlForPage = clubLogoUrl;

      // Récupérer les extras du club
      const extras = await getClubPublicExtras(finalClubId);
      
      // Récupérer les données du club depuis la table clubs
      let clubRecord: any = null;
      if (supabaseAdmin) {
        const { data: clubDataFromDB } = await supabaseAdmin
          .from("clubs")
          .select("name, logo_url, address, postal_code, city, phone, website, number_of_courts, court_type")
          .eq("id", finalClubId)
          .maybeSingle();
        
        if (clubDataFromDB) {
          clubRecord = clubDataFromDB;
          clubNameForPage = (clubDataFromDB.name as string) || clubNameForPage;
          const rawLogoUrl = clubDataFromDB.logo_url as string | null;
          if (rawLogoUrl && typeof rawLogoUrl === 'string' && rawLogoUrl.trim() !== '') {
            clubLogoUrlForPage = getClubLogoPublicUrl(rawLogoUrl);
          }
        }
      }
      
      // Si le logo n'a pas encore été converti en URL publique, le convertir maintenant
      if (clubLogoUrlForPage && !clubLogoUrlForPage.startsWith('http://') && !clubLogoUrlForPage.startsWith('https://')) {
        clubLogoUrlForPage = getClubLogoPublicUrl(clubLogoUrlForPage);
      }

      const addressValue = clubRecord?.address ?? extras.address ?? null;
      const postalValue = clubRecord?.postal_code ?? extras.postal_code ?? null;
      const cityValue = clubRecord?.city ?? extras.city ?? null;

      const addressLineParts: string[] = [];
      if (addressValue) addressLineParts.push(addressValue);
      if (postalValue) addressLineParts.push(postalValue);
      if (cityValue) addressLineParts.push(cityValue);
      const addressLine = addressLineParts.length ? addressLineParts.join(" · ") : null;

      clubData = {
        name: clubNameForPage,
        logoUrl: clubLogoUrlForPage,
        description: extras.description ?? null,
        addressLine,
        phone: clubRecord?.phone ?? extras.phone ?? null,
        website: clubRecord?.website ?? extras.website ?? null,
        numberOfCourts: clubRecord?.number_of_courts ?? extras.number_of_courts ?? null,
        courtType: clubRecord?.court_type ?? extras.court_type ?? null,
        openingHours: extras.opening_hours ?? null,
      };
    } catch (error) {
      logger.error("[Club] Erreur lors de la récupération des données du club:", error);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:pt-12 pb-4 sm:pb-6 md:pb-8">
        <PageTitle title="Mon club" subtitle="Informations sur votre club" />

        {hasNoClub && (
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
        ) : !hasNoClub ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p>Erreur lors du chargement des informations du club.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

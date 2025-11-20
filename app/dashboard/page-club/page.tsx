import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClubPublicPageWrapper from "@/components/club/ClubPublicPageWrapper";
import { getClubPublicExtras, getUserClubInfo } from "@/lib/utils/club-utils";
import PageTitle from "../PageTitle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PageClubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/page-club");
  }

  // Récupérer les infos du club de la même manière que dans layout.tsx
  const clubInfo = await getUserClubInfo();
  const clubId = clubInfo.clubId;
  const clubLogo = clubInfo.clubLogoUrl; // Logo déjà converti en URL publique via getUserClubInfo

  if (!clubId) {
    redirect("/clubs/login?next=/dashboard/page-club");
  }

  // Récupérer les autres données du club
  const { data: clubRecord } = clubId
    ? await supabase
        .from("clubs")
        .select("name, address, postal_code, city, phone, website, number_of_courts, court_type")
        .eq("id", clubId)
        .maybeSingle()
    : { data: null };

  const extras = clubId
    ? await getClubPublicExtras(clubId)
    : {
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
  const addressLine = [clubRecord?.address ?? extras.address, clubRecord?.postal_code ?? extras.postal_code, clubRecord?.city ?? extras.city]
    .filter(Boolean)
    .join(" · ") || null;

  const initialPreviewData = clubRecord
    ? {
        name: clubRecord.name ?? clubInfo.clubName ?? "Club",
        logoUrl: clubLogo, // Logo déjà converti en URL publique via getUserClubInfo (même que celui en haut de page)
        description: extras.description ?? null,
        addressLine,
        phone: clubRecord.phone ?? extras.phone ?? null,
        website: clubRecord.website ?? extras.website ?? null,
        numberOfCourts: clubRecord.number_of_courts ?? extras.number_of_courts ?? null,
        courtType: clubRecord.court_type ?? extras.court_type ?? null,
        openingHours: extras.opening_hours ?? null,
      }
    : {
        name: clubInfo.clubName ?? "Club",
        logoUrl: clubLogo, // Logo déjà converti en URL publique via getUserClubInfo (même que celui en haut de page)
        description: null,
        addressLine: null,
        phone: null,
        website: null,
        numberOfCourts: null,
        courtType: null,
        openingHours: null,
      };

  return (
    <div className="space-y-6">
      <PageTitle title="Page publique du club" subtitle="Complétez les informations pour enrichir la page consultée par vos joueurs et visiteurs." />
      <ClubPublicPageWrapper initialData={initialPreviewData} clubId={clubId} />
    </div>
  );
}





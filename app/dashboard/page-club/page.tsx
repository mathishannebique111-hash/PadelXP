import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClubPublicPageWrapper from "@/components/club/ClubPublicPageWrapper";
import { getClubPublicExtras } from "@/lib/utils/club-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PageClubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/page-club");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", user.id)
    .maybeSingle();

  const clubId: string | null = profile?.club_id ?? (user.user_metadata?.club_id as string | null) ?? null;

  const { data: clubRecord } = clubId
    ? await supabase
        .from("clubs")
        .select("name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
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
        name: clubRecord.name,
        logoUrl: clubRecord.logo_url,
        description: extras.description ?? null,
        addressLine,
        phone: clubRecord.phone ?? extras.phone ?? null,
        website: clubRecord.website ?? extras.website ?? null,
        numberOfCourts: clubRecord.number_of_courts ?? extras.number_of_courts ?? null,
        courtType: clubRecord.court_type ?? extras.court_type ?? null,
        openingHours: extras.opening_hours ?? null,
      }
    : {
        name: "",
        logoUrl: null,
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
      <div>
        <h1 className="text-2xl font-extrabold">Page publique du club</h1>
        <p className="text-sm text-white/60">
          Complétez les informations ci-dessous pour enrichir la page consultée par vos joueurs et visiteurs.
        </p>
      </div>
      <ClubPublicPageWrapper initialData={initialPreviewData} clubId={clubId} />
    </div>
  );
}





import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import AffichePrint from "./AffichePrint";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export default async function AffichePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!supabaseAdmin) return notFound();

  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("id, name, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!club) return notFound();

  const clubName = (club.name as string) || slug.toUpperCase();
  const clubLogoUrl = getClubLogoPublicUrl(club.logo_url as string | null);

  return (
    <AffichePrint clubName={clubName} clubLogoUrl={clubLogoUrl} />
  );
}

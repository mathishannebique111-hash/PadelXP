import { createClient } from "@/lib/supabase/server";
import MatchForm from "@/components/MatchForm";
import PageTitle from "@/components/PageTitle";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from '@/lib/logger';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function NewMatchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Accès restreint</h1>
        <p className="text-slate-600">Vous devez être connecté.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("club_id, club_slug")
    .eq("id", user.id)
    .maybeSingle();

  let clubId = profile?.club_id || null;
  let clubSlug = profile?.club_slug || null;

  if (!clubId || !clubSlug) {
    try {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("club_id, club_slug")
        .eq("id", user.id)
        .maybeSingle();
      if (adminProfileError) {
        logger.error("[Match/New] Failed to fetch profile via admin client", {
          message: adminProfileError.message,
          details: adminProfileError.details,
          hint: adminProfileError.hint,
          code: adminProfileError.code,
        });
      }
      if (adminProfile) {
        clubId = clubId || adminProfile.club_id || null;
        clubSlug = clubSlug || adminProfile.club_slug || null;
      }
    } catch (e) {
      logger.error("[Match/New] Unexpected error when fetching profile via admin client", e);
    }
  }

  if (!clubId) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
        {/* Background avec overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
        
        {/* Pattern animé */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-20 sm:pt-8 pb-8 text-white">
          <div className="mb-6">
            <PageTitle title="Enregistrer un match" />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 font-normal">
            <p>Vous devez être rattaché à un club pour enregistrer un match. Demandez à votre club / complexe de vous inviter ou utilisez le code d'invitation depuis l'espace joueur.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-20 md:pt-8 pb-8">
        <div className="mb-6">
          <PageTitle title="Enregistrer un match" />
        </div>
        <MatchForm selfId={user.id} />
      </div>
    </div>
  );
}

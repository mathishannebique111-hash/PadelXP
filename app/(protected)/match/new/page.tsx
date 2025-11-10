import { createClient } from "@/lib/supabase/server";
import MatchForm from "@/components/MatchForm";
import NavigationBar from "@/components/NavigationBar";
import LogoutButton from "@/components/LogoutButton";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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
  const supabase = createClient();
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
        console.error("[Match/New] Failed to fetch profile via admin client", {
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
      console.error("[Match/New] Unexpected error when fetching profile via admin client", e);
    }
  }

  if (!clubId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 text-white">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Enregistrer un match 🎾</h1>
            <LogoutButton />
          </div>
          <NavigationBar currentPage="match" />
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          <p>Vous devez être rattaché à un club pour enregistrer un match. Demandez à votre club / complexe de vous inviter ou utilisez le code d’invitation depuis l’espace joueur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.1),transparent)] z-0" />
      
      {/* Pattern animé */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Enregistrer un match 🎾</h1>
            <LogoutButton />
          </div>
          <NavigationBar currentPage="match" />
        </div>
        <MatchForm selfId={user.id} />
      </div>
    </div>
  );
}

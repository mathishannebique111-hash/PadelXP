import { createClient } from "@/lib/supabase/server";
import NavigationBar from "@/components/NavigationBar";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BoostSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Les boosts sont crédités automatiquement via le webhook Stripe
  // On peut juste afficher un message de succès

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">⚡ Paiement réussi !</h1>
      </div>

      <NavigationBar />

      <div className="mt-8 rounded-2xl border border-green-500/40 bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-8 text-center backdrop-blur-sm shadow-2xl">
        <div className="mb-4 text-7xl">✅</div>
        <h2 className="mb-4 text-3xl font-bold text-white">Boosts crédités avec succès !</h2>
        <p className="mb-6 text-lg text-white/90">
          Tes boosts sont maintenant disponibles et tu peux les utiliser lors de tes prochains matchs.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/boost"
            className="rounded-xl border-2 border-green-500/50 bg-gradient-to-r from-green-600/30 to-emerald-600/30 px-6 py-3 font-bold text-white transition-all hover:from-green-600/40 hover:to-emerald-600/40"
          >
            Voir mes boosts
          </Link>
          <Link
            href="/match/new"
            className="rounded-xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-600/30 to-purple-600/30 px-6 py-3 font-bold text-white transition-all hover:from-blue-600/40 hover:to-purple-600/40"
          >
            Enregistrer un match
          </Link>
        </div>
      </div>
    </div>
  );
}



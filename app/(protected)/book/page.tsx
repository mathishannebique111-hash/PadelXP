import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import ReservationsListContent from "@/components/booking/ReservationsListContent";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BookPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-4 md:pt-8 pb-4 sm:pb-6 md:pb-8">
                <div className="flex items-center justify-between mb-6">
                    <PageTitle title="Mes Matchs" subtitle="Historique et activité" />
                    <Link
                        href="/match/new" // Redirige vers la création de match (à implémenter ou existant)
                        className="inline-flex items-center gap-2 px-4 py-2 bg-padel-green text-[#081E4E] rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                    >
                        <Plus size={18} />
                        <span>Enregistrer</span>
                    </Link>
                </div>

                <div className="mt-6">
                    <Suspense fallback={<div className="text-white/60 text-center py-8">Chargement...</div>}>
                        <ReservationsListContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

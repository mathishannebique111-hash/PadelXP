import { Suspense } from "react";
import PageTitle from "@/components/PageTitle";
import ReferralSection from "@/components/ReferralSection";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReferralSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    return (
        <div className="relative min-h-screen pb-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />

            <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-6">
                <PageTitle title="Parrainage" />

                <div className="mt-8">
                    <Suspense fallback={
                        <div className="rounded-xl sm:rounded-2xl border-2 border-white/80 p-4 sm:p-6 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]">
                            <div className="text-sm text-white/70">Chargement...</div>
                        </div>
                    }>
                        <ReferralSection userId={user.id} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

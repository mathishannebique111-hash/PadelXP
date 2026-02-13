import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import BookingTabs from "@/components/booking/BookingTabs";
import BookingContent from "@/components/booking/BookingContent";
import ReservationsListContent from "@/components/booking/ReservationsListContent";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const resolvedSearchParams = await searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Récupérer le club de l'utilisateur
    const { clubId, clubName } = await getUserClubInfo();

    const { count: pendingCount } = await supabase
        .from('reservation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .eq('is_organizer', false);

    const activeTab = resolvedSearchParams?.tab === 'my-reservations' ? 'my-reservations' : 'book';

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Background inherited from layout */}

            <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-4 md:pt-8 pb-4 sm:pb-6 md:pb-8">
                <PageTitle title="Réservations" subtitle={clubName || "Réservez votre terrain"} />

                <div className="mt-6">
                    <BookingTabs
                        activeTab={activeTab}
                        pendingCount={pendingCount || 0}
                        bookingContent={
                            clubId ? (
                                <BookingContent clubId={clubId} />
                            ) : (
                                <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
                                    <p className="font-semibold text-yellow-200 text-lg mb-2">⚠️ Aucun club associé</p>
                                    <p className="text-yellow-200/80 mb-6">
                                        Vous devez être membre d'un club pour pouvoir réserver un terrain.
                                    </p>
                                    <Link
                                        href="/club"
                                        className="inline-flex items-center px-6 py-3 bg-yellow-500/20 text-yellow-200 rounded-xl font-medium hover:bg-yellow-500/30 transition-colors"
                                    >
                                        Rejoindre un club
                                    </Link>
                                </div>
                            )
                        }
                        reservationsContent={<ReservationsListContent />}
                    />
                </div>
            </div>
        </div>
    );
}

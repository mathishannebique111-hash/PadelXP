import { getUserClubId } from "@/lib/utils/club-utils";
import ReservationsView from "./ReservationsView";
import { redirect } from "next/navigation";

export default async function ClubReservationsPage() {
    const clubId = await getUserClubId();

    if (!clubId) {
        // This shouldn't happen if user is in dashboard, layout should have caught it
        // But for safety:
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-bold text-white">Accès restreint</h2>
                    <p className="text-white/60">Impossible de trouver votre identifiant de club.</p>
                </div>
            </div>
        );
    }

    return <ReservationsView clubId={clubId} />;
}

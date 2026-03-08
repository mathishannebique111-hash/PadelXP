import { getUserClubId } from "@/lib/utils/club-utils";
import ReservationsView from "./ReservationsView";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrialActive } from "@/lib/subscription";

export default async function ClubReservationsPage() {
    const clubId = await getUserClubId();

    if (!clubId) {
        redirect("/dashboard");
    }

    const supabase = await createClient();
    const { data: club } = await supabase
        .from("clubs")
        .select("has_reservations_option, trial_current_end_date, trial_end_date")
        .eq("id", clubId)
        .single();

    const trialActive = isTrialActive(club?.trial_current_end_date || club?.trial_end_date);
    const hasOption = !!club?.has_reservations_option;

    if (!hasOption && !trialActive) {
        redirect("/dashboard/facturation?error=reservations_option_required");
    }

    return <ReservationsView clubId={clubId} />;
}

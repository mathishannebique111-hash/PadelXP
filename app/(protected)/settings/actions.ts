"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

import { getDepartmentFromPostalCode, getRegionFromDepartment } from "@/lib/utils/geo-leaderboard-utils";

export async function updateLocation(postalCode: string, city: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const trimmedPostal = postalCode.trim();
    const trimmedCity = city.trim();

    if (trimmedPostal.length !== 5 || !trimmedCity) {
        throw new Error("Code postal et ville requis");
    }

    const dept = getDepartmentFromPostalCode(trimmedPostal);
    const region = getRegionFromDepartment(dept || "");

    const { error } = await supabase
        .from("profiles")
        .update({
            postal_code: trimmedPostal,
            city: trimmedCity,
            department_code: dept, // Geo logic recalculation
            region_code: region    // Geo logic recalculation
        })
        .eq("id", user.id);

    if (error) {
        logger.error("Error updating location", { error, userId: user.id });
        throw new Error("Erreur lors de la mise à jour");
    }

    revalidatePath("/settings");
    revalidatePath("/account");
    revalidatePath("/api/leaderboard"); // Important for leaderboard updates

    return { success: true };
}

export async function updateProfile(firstName: string, lastName: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName && !trimmedLastName) {
        throw new Error("Au moins un nom ou prénom est requis");
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
        })
        .eq("id", user.id);

    if (error) {
        logger.error("Error updating profile", { error, userId: user.id });
        throw new Error("Erreur lors de la mise à jour du profil");
    }

    // Critical: Revalidate the club members dashboard so changes appear immediately
    revalidatePath("/dashboard/membres");
    // Also revalidate the user's settings page (though mostly client-side)
    revalidatePath("/settings");
    revalidatePath("/account");

    return { success: true };
}

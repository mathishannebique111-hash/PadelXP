"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { getUserClubInfo } from "@/lib/utils/club-utils";

export async function removeMember(memberId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Vérifier si l'utilisateur est admin du club (ou propriétaire)
    // On pourrait ajouter une vérification plus stricte ici si nécessaire, 
    // mais la page parente fait déjà des vérifications.
    // Pour plus de sécurité, on peut vérifier que le memberId appartient bien au club de l'admin.

    // 1. Récupérer le club de l'admin par la méthode robuste utilisée partout ailleurs
    const { clubId } = await getUserClubInfo();

    if (!clubId) {
        // Si on ne trouve pas de club via getUserClubInfo, c'est qu'il n'est vraiment pas rattaché
        throw new Error("Vous n'êtes pas rattaché à un club.");
    }

    // 2. Vérifier que le membre à supprimer fait bien partie de ce club
    const { data: memberProfile } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", memberId)
        .single();

    if (memberProfile?.club_id !== clubId) {
        throw new Error("Ce joueur ne fait pas partie de votre club.");
    }

    // 3. Mettre à jour le profil pour retirer le club_id et club_slug
    const { error } = await supabase
        .from("profiles")
        .update({ club_id: null, club_slug: null })
        .eq("id", memberId);

    if (error) {
        logger.error("Error removing member from club", { error, memberId });
        throw new Error("Erreur lors de la suppression du membre.");
    }

    revalidatePath("/dashboard/membres");
    return { success: true };
}

export async function deleteGuest(guestId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Pour les invités, on vérifie généralement s'ils ont été créés par quelqu'un du club ou s'ils sont liés à des matchs du club?
    // La table guest_players n'a pas forcément de club_id direct, mais elle est liée à des matchs ou créée par des users.
    // Ici on permet la suppression si l'admin est authentifié. 
    // Idéalement on vérifierait que l'invité "appartient" au contexte du club, 
    // mais les invités sont souvent liés à des matchs.

    // Suppression directe
    const { error } = await supabase
        .from("guest_players")
        .delete()
        .eq("id", guestId);

    if (error) {
        logger.error("Error deleting guest player", { error, guestId });
        throw new Error("Erreur lors de la suppression de l'invité. Il est peut-être lié à des matchs existants.");
    }

    revalidatePath("/dashboard/membres");
    return { success: true };
}

export async function hideVisitor(visitorId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // 1. Récupérer le club de l'admin
    const { clubId } = await getUserClubInfo();

    if (!clubId) {
        throw new Error("Vous n'êtes pas rattaché à un club.");
    }

    // 2. Insérer dans la table des visiteurs masqués
    const { error } = await supabase
        .from("club_hidden_visitors")
        .insert({
            club_id: clubId,
            user_id: visitorId
        });

    if (error) {
        // Si l'erreur est une violation de contrainte unique (code 23505),
        // cela signifie que le visiteur est déjà masqué. On considère cela comme un succès.
        if (error.code === '23505') {
            revalidatePath("/dashboard/membres");
            return { success: true };
        }

        logger.error("Error hiding visitor FULL DETAILS", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            visitorId,
            clubId
        });
        throw new Error("Erreur lors du traitement. Impossible de masquer le visiteur.");
    }

    revalidatePath("/dashboard/membres");
    return { success: true };
}

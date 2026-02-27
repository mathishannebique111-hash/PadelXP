"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Enregistre une visite de profil.
 * Ne s'enregistre que si le visiteur est différent de la personne vue.
 */
export async function recordProfileView(viewedId: string) {
    const supabase = await createClient();

    // 1. Récupérer l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "Non authentifié" };
    }

    // 2. Ne pas enregistrer si c'est son propre profil
    if (user.id === viewedId) {
        return { success: true, message: "Auto-visite non enregistrée" };
    }

    // 3. Insérer la visite
    const { error } = await supabase
        .from("profile_views")
        .insert({
            viewer_id: user.id,
            viewed_id: viewedId
        });

    if (error) {
        console.error("[recordProfileView] Erreur insertion:", error);
        return { success: false, error };
    }

    return { success: true };
}

/**
 * Récupère la liste des visiteurs pour l'utilisateur connecté.
 */
export async function getProfileVisitors() {
    const supabase = await createClient();

    // 1. Récupérer l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "Non authentifié" };
    }

    // 2. Récupérer les visites avec les détails du profil du visiteur
    const { data, error } = await supabase
        .from("profile_views")
        .select(`
            id,
            viewed_at,
            viewer_id,
            viewer_profile:profiles!profile_views_viewer_id_fkey (
                id,
                first_name,
                last_name,
                display_name,
                avatar_url,
                niveau_padel,
                niveau_categorie,
                is_premium
            )
        `)
        .eq("viewed_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("[getProfileVisitors] Erreur:", error);
        return { success: false, error };
    }

    return { success: true, visitors: data };
}

'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from 'next/cache';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

import { createClient as createServerClient } from "@/lib/supabase/server";

export async function updateClubName(clubId: string, newName: string) {
    if (!clubId || !newName) {
        return { success: false, error: 'ID ou nom manquant' };
    }

    try {
        const { error } = await supabaseAdmin
            .from('clubs')
            .update({ name: newName })
            .eq('id', clubId);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath('/dashboard');
        revalidatePath('/(protected)/home');

        return { success: true };
    } catch (error) {
        return { success: false, error: 'Erreur serveur lors de la mise à jour' };
    }
}

export async function getAuthenticatedUserClubId() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Vérifier le profil avec le client Admin (contourne RLS)
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profile?.club_id) return profile.club_id;

    // 2. Vérifier club_admins avec le client Admin (contourne RLS)
    const { data: adminEntries } = await supabaseAdmin
        .from("club_admins")
        .select("club_id")
        .eq("user_id", user.id)
        .limit(1);

    if (adminEntries && adminEntries.length > 0) {
        return adminEntries[0].club_id;
    }

    return null;
}

export async function getOrCreateSupportConversation(clubId: string) {
    if (!clubId) return { error: "Club ID manquant" };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Non authentifié" };
    }

    // Chercher une conversation existante
    const { data: existingConv, error: fetchError } = await supabaseAdmin
        .from("club_conversations")
        .select("*")
        .eq("club_id", clubId)
        .maybeSingle();

    if (fetchError) {
        console.error("Erreur récupération conversation:", fetchError);
        return { error: "Erreur lors de la récupération de la conversation" };
    }

    if (existingConv) {
        return { conversation: existingConv };
    }

    // Créer une nouvelle conversation
    const { data: newConv, error: createError } = await supabaseAdmin
        .from("club_conversations")
        .insert({
            club_id: clubId,
            status: "open",
        })
        .select()
        .single();

    if (createError) {
        console.error("Erreur création conversation:", createError);
        return { error: "Erreur lors de la création de la conversation" };
    }

    return { conversation: newConv };
}

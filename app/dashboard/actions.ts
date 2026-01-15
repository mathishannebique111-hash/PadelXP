'use server';

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from 'next/cache';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

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

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // 1. Authentifier l'utilisateur avec ses cookies
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { partnership_id } = await request.json();

        if (!partnership_id) {
            return NextResponse.json({ error: 'Missing partnership_id' }, { status: 400 });
        }

        // 2. Vérifier que l'utilisateur est bien impliqué dans ce partenariat
        // (soit l'envoyeur, soit le receveur)
        // On utilise le client standard (RLS) pour vérifier la lecture
        const { data: partnership, error: fetchError } = await supabase
            .from('player_partnerships')
            .select('player_id, partner_id')
            .eq('id', partnership_id)
            .single();

        if (fetchError || !partnership) {
            console.error('Error fetching partnership properly:', fetchError);
            return NextResponse.json({ error: 'Partnership not found or access denied' }, { status: 404 });
        }

        // Vérification explicite : l'utilisateur doit être l'un des deux
        if (partnership.player_id !== user.id && partnership.partner_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Supprimer avec le client ADMIN (bypass RLS delete policy manquant)
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error: deleteError } = await supabaseAdmin
            .from('player_partnerships')
            .delete()
            .eq('id', partnership_id);

        if (deleteError) {
            console.error('Error deleting partnership:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in cancel route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

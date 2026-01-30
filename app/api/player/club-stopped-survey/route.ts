import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const surveySchema = z.object({
    response: z.enum(['yes', 'no']),
});

/**
 * POST /api/player/club-stopped-survey
 * Permet à un joueur de soumettre sa réponse au sondage "Votre club devrait-il continuer ?"
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        // Parse et valider le body
        const body = await req.json();
        const parsed = surveySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Réponse invalide' }, { status: 400 });
        }

        const { response } = parsed.data;

        // Récupérer le club_id du joueur
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('club_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError || !profile?.club_id) {
            logger.error('[club-stopped-survey] Error fetching profile or no club_id', {
                error: profileError?.message,
                userId: user.id
            });
            return NextResponse.json({ error: 'Club non trouvé' }, { status: 404 });
        }

        const clubId = profile.club_id;

        // Insérer ou mettre à jour la réponse (upsert)
        const { error: upsertError } = await supabaseAdmin
            .from('club_stop_survey_responses')
            .upsert(
                {
                    club_id: clubId,
                    user_id: user.id,
                    response,
                    created_at: new Date().toISOString(),
                },
                { onConflict: 'club_id,user_id' }
            );

        if (upsertError) {
            logger.error('[club-stopped-survey] Error upserting response', {
                error: upsertError.message,
                userId: user.id,
                clubId
            });
            return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 });
        }

        logger.info('[club-stopped-survey] Response recorded', {
            userId: user.id.slice(0, 8) + '...',
            clubId: clubId.slice(0, 8) + '...',
            response
        });

        return NextResponse.json({ success: true, message: 'Réponse enregistrée' });

    } catch (error) {
        logger.error('[club-stopped-survey] Unexpected error', {
            error: (error as Error).message
        });
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}

/**
 * GET /api/player/club-stopped-survey
 * Vérifie si le joueur a déjà répondu au sondage
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        // Récupérer le club_id du joueur
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('club_id')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.club_id) {
            return NextResponse.json({ hasResponded: false, response: null });
        }

        // Vérifier si une réponse existe
        const { data: existingResponse } = await supabaseAdmin
            .from('club_stop_survey_responses')
            .select('response')
            .eq('club_id', profile.club_id)
            .eq('user_id', user.id)
            .maybeSingle();

        return NextResponse.json({
            hasResponded: !!existingResponse,
            response: existingResponse?.response || null,
        });

    } catch (error) {
        logger.error('[club-stopped-survey] GET error', {
            error: (error as Error).message
        });
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}

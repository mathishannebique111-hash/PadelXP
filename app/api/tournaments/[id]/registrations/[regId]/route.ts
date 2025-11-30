import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from 'zod';

const updateRegistrationSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'waiting_list', 'rejected', 'withdrawn']).optional(),
  is_wild_card: z.boolean().optional(),
  is_seed: z.boolean().optional(),
  seed_number: z.number().int().positive().optional(),
  rejection_reason: z.string().optional(),
  payment_status: z.enum(['pending', 'paid', 'refunded', 'failed']).optional(),
  phase: z.enum(['waiting_list', 'qualifications', 'main_draw', 'eliminated']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, regId } = await params;

    // Vérifier que le tournoi existe
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('club_id, inscription_fee')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…"
      }, "Tournament not found");
      
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Vérifier que l'inscription existe
    const { data: existingRegistration, error: regError } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('id', regId)
      .eq('tournament_id', id)
      .single();

    if (regError || !existingRegistration) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        registrationId: regId.substring(0, 8) + "…"
      }, "Registration not found");
      
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // Vérifier admin club OU que l'utilisateur est un des joueurs de la paire
    const { data: clubAdmin } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('club_id', tournament.club_id)
      .not('activated_at', 'is', null)
      .maybeSingle();

    const isPlayer = existingRegistration.player1_id === user.id || existingRegistration.player2_id === user.id;

    if (!clubAdmin && !isPlayer) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Si l'utilisateur est un joueur (pas admin), il ne peut que se retirer
    if (isPlayer && !clubAdmin) {
      const body = await request.json();
      if (body.status && body.status !== 'withdrawn') {
        return NextResponse.json({ 
          error: 'Players can only withdraw from tournaments' 
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const result = updateRegistrationSchema.safeParse(body);

    if (!result.success) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        registrationId: regId.substring(0, 8) + "…",
        errors: result.error.errors 
      }, "Invalid registration update data");
      
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    // Si on met à jour le statut à "paid", enregistrer la date de paiement
    const updateData: any = { ...result.data };
    if (result.data.payment_status === 'paid' && existingRegistration.payment_status !== 'paid') {
      updateData.paid_at = new Date().toISOString();
      updateData.amount_paid = tournament?.inscription_fee || 0;
    }

    const { data: registration, error } = await supabase
      .from('tournament_registrations')
      .update(updateData)
      .eq('id', regId)
      .eq('tournament_id', id)
      .select()
      .single();

    if (error) {
      logger.error({ 
        tournamentId: id.substring(0, 8) + "…",
        registrationId: regId.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        error: error.message 
      }, "Error updating registration");
      
      return NextResponse.json({ error: 'Error updating registration' }, { status: 500 });
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      registrationId: regId.substring(0, 8) + "…",
      userId: user.id.substring(0, 8) + "…",
      updates: Object.keys(result.data)
    }, "Registration updated");

    return NextResponse.json({ registration });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


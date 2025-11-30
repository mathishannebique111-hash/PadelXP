import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que le tournoi existe
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('club_id')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…"
      }, "Tournament not found");
      
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est admin du club ou fait partie d'une inscription
    const { data: clubAdmin } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('club_id', tournament.club_id)
      .not('activated_at', 'is', null)
      .maybeSingle();

    const { data: userRegistration } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', id)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .maybeSingle();

    // Si l'utilisateur n'est ni admin ni inscrit, interdire l'accès
    if (!clubAdmin && !userRegistration) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Récupérer les inscriptions avec les infos des joueurs
    const { data: registrations, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        player1:profiles!tournament_registrations_player1_id_fkey(id, first_name, last_name, email),
        player2:profiles!tournament_registrations_player2_id_fkey(id, first_name, last_name, email)
      `)
      .eq('tournament_id', id)
      .order('registration_order', { ascending: true });

    if (error) {
      logger.error({ 
        tournamentId: id.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        error: error.message 
      }, "Error fetching registrations");
      
      return NextResponse.json({ error: 'Error fetching registrations' }, { status: 500 });
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      userId: user.id.substring(0, 8) + "…",
      count: registrations?.length || 0
    }, "Registrations fetched");

    return NextResponse.json({ registrations });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


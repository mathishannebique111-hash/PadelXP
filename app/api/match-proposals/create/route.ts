import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn("[MatchProposalCreate] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { partner_id, challenged_player1_id, challenged_player2_id, message, club_id } = await request.json();

    if (!partner_id || !challenged_player1_id || !challenged_player2_id) {
      return NextResponse.json({ 
        error: "partner_id, challenged_player1_id et challenged_player2_id requis" 
      }, { status: 400 });
    }

    // Vérifier que l'utilisateur a un partenariat accepté avec partner_id
    const { data: partnership } = await supabase
      .from('player_partnerships')
      .select('id')
      .or(`and(player_id.eq.${user.id},partner_id.eq.${partner_id},status.eq.accepted),and(player_id.eq.${partner_id},partner_id.eq.${user.id},status.eq.accepted)`)
      .maybeSingle();

    if (!partnership) {
      return NextResponse.json({ 
        error: "Vous devez avoir un partenariat accepté avec ce joueur" 
      }, { status: 400 });
    }

    // Vérifier que les deux joueurs challengés sont différents
    if (challenged_player1_id === challenged_player2_id) {
      return NextResponse.json({ error: "Les deux joueurs challengés doivent être différents" }, { status: 400 });
    }

    // Déterminer qui est player1 et player2 (celui qui propose est toujours player1)
    const proposer_player1_id = user.id;
    const proposer_player2_id = partner_id;

    // Créer la proposition de match
    const { data: proposal, error: insertError } = await supabase
      .from('match_proposals')
      .insert({
        proposer_player1_id,
        proposer_player2_id,
        challenged_player1_id,
        challenged_player2_id,
        status: 'pending',
        message: message || null,
        club_id: club_id || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
      })
      .select()
      .single();

    if (insertError) {
      logger.error("[MatchProposalCreate] Erreur création proposition", { error: insertError });
      return NextResponse.json({ 
        error: "Erreur lors de la création de la proposition",
        details: insertError.message 
      }, { status: 500 });
    }

    logger.info("[MatchProposalCreate] Proposition de match créée", {
      proposalId: proposal.id.substring(0, 8),
      proposer1: proposer_player1_id.substring(0, 8),
      proposer2: proposer_player2_id.substring(0, 8),
      challenged1: challenged_player1_id.substring(0, 8),
      challenged2: challenged_player2_id.substring(0, 8)
    });

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    logger.error("[MatchProposalCreate] Erreur inattendue", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

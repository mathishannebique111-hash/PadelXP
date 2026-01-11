import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn("[MatchProposalRespond] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { proposal_id, accept } = await request.json();

    if (!proposal_id || typeof proposal_id !== 'string') {
      return NextResponse.json({ error: "proposal_id requis" }, { status: 400 });
    }

    if (typeof accept !== 'boolean') {
      return NextResponse.json({ error: "accept doit être un booléen" }, { status: 400 });
    }

    // Vérifier que la proposition existe et que l'utilisateur est un des joueurs challengés
    const { data: proposal, error: fetchError } = await supabase
      .from('match_proposals')
      .select('*')
      .eq('id', proposal_id)
      .maybeSingle();

    if (fetchError || !proposal) {
      logger.warn("[MatchProposalRespond] Proposition non trouvée", { 
        error: fetchError,
        proposalId: proposal_id.substring(0, 8)
      });
      return NextResponse.json({ error: "Proposition non trouvée" }, { status: 404 });
    }

    const isChallenged1 = proposal.challenged_player1_id === user.id;
    const isChallenged2 = proposal.challenged_player2_id === user.id;

    if (!isChallenged1 && !isChallenged2) {
      return NextResponse.json({ error: "Vous n'êtes pas autorisé à répondre à cette proposition" }, { status: 403 });
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json({ error: "Cette proposition a déjà été traitée" }, { status: 400 });
    }

    // Mettre à jour le statut
    let newStatus: string;
    
    if (accept) {
      // Si l'autre joueur a déjà accepté, le statut devient 'accepted'
      // Sinon, on marque celui qui accepte
      if (isChallenged1) {
        newStatus = proposal.status === 'accepted_by_p2' ? 'accepted' : 'accepted_by_p1';
      } else {
        newStatus = proposal.status === 'accepted_by_p1' ? 'accepted' : 'accepted_by_p2';
      }
    } else {
      newStatus = 'declined';
    }

    const { data: updatedProposal, error: updateError } = await supabase
      .from('match_proposals')
      .update({ status: newStatus })
      .eq('id', proposal_id)
      .select()
      .single();

    if (updateError) {
      logger.error("[MatchProposalRespond] Erreur mise à jour proposition", { error: updateError });
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour",
        details: updateError.message 
      }, { status: 500 });
    }

    logger.info("[MatchProposalRespond] Proposition mise à jour", {
      proposalId: proposal_id.substring(0, 8),
      status: newStatus,
      userId: user.id.substring(0, 8)
    });

    return NextResponse.json({ success: true, proposal: updatedProposal });
  } catch (error) {
    logger.error("[MatchProposalRespond] Erreur inattendue", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn("[PartnershipRespond] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { partnership_id, accept } = await request.json();

    if (!partnership_id || typeof partnership_id !== 'string') {
      return NextResponse.json({ error: "partnership_id requis" }, { status: 400 });
    }

    if (typeof accept !== 'boolean') {
      return NextResponse.json({ error: "accept doit être un booléen" }, { status: 400 });
    }

    // Vérifier que la demande existe et que l'utilisateur est bien le partner_id (celui qui reçoit la demande)
    const { data: partnership, error: fetchError } = await supabase
      .from('player_partnerships')
      .select('*')
      .eq('id', partnership_id)
      .eq('partner_id', user.id) // L'utilisateur doit être celui qui reçoit la demande
      .maybeSingle();

    if (fetchError || !partnership) {
      logger.warn("[PartnershipRespond] Partenariat non trouvé ou non autorisé", { 
        error: fetchError,
        partnershipId: partnership_id.substring(0, 8),
        userId: user.id.substring(0, 8)
      });
      return NextResponse.json({ error: "Partenariat non trouvé" }, { status: 404 });
    }

    if (partnership.status !== 'pending') {
      return NextResponse.json({ error: "Cette demande a déjà été traitée" }, { status: 400 });
    }

    // Mettre à jour le statut
    const newStatus = accept ? 'accepted' : 'declined';
    
    const { data: updatedPartnership, error: updateError } = await supabase
      .from('player_partnerships')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnership_id)
      .select()
      .single();

    if (updateError) {
      logger.error("[PartnershipRespond] Erreur mise à jour partenariat", { error: updateError });
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour",
        details: updateError.message 
      }, { status: 500 });
    }

    logger.info("[PartnershipRespond] Partenariat mis à jour", {
      partnershipId: partnership_id.substring(0, 8),
      status: newStatus,
      userId: user.id.substring(0, 8)
    });

    return NextResponse.json({ success: true, partnership: updatedPartnership });
  } catch (error) {
    logger.error("[PartnershipRespond] Erreur inattendue", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

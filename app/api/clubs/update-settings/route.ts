import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer le corps de la requête
    const { has_reservations_option } = await req.json();

    // Vérifier que l'utilisateur est admin du club
    const { data: adminEntry, error: adminError } = await supabase
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || !adminEntry) {
      return NextResponse.json({ error: "Club non trouvé ou accès non autorisé" }, { status: 403 });
    }

    // Mettre à jour les réglages du club
    const { error: updateError } = await supabase
      .from("clubs")
      .update({ has_reservations_option })
      .eq("id", adminEntry.club_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API update-settings] Error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

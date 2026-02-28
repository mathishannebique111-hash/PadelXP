import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: "Erreur d'authentification" },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { niveau, categorie, breakdown, responses, recommendations } = body as {
      niveau: number;
      categorie: string;
      breakdown: Record<string, number>;
      responses?: Record<string, number | number[]>;
      recommendations?: string[];
    };

    // Enrichir le breakdown avec les réponses si disponibles
    const enrichedBreakdown = {
      ...breakdown,
      ...(responses ? { responses } : {})
    };

    // Convertir les recommandations en tableau pour la sauvegarde (compatibilité)
    const recommendationsArray = recommendations || [];

    const { error } = await supabase
      .from("profiles")
      .update({
        niveau_padel: niveau,
        niveau_categorie: categorie,
        niveau_breakdown: enrichedBreakdown,
        niveau_recommendations: recommendationsArray.length > 0 ? recommendationsArray : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Erreur lors de la sauvegarde" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}


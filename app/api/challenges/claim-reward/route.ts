import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/challenges/claim-reward
 * Attribue la récompense d'un challenge complété au joueur
 */
export async function POST(req: Request) {
  try {
    // Créer le client Supabase avec les cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("[claim-reward] ❌ Unauthorized: No user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { challengeId, rewardType, rewardValue } = body;

    if (!challengeId || !rewardType || !rewardValue) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    console.log(`[claim-reward] User ${user.id} claiming reward for challenge ${challengeId}`);

    // 1) Vérifier si la récompense a déjà été attribuée
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("challenge_rewards")
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId)
      .maybeSingle();

    if (checkError) {
      console.error(`[claim-reward] ❌ Error checking existing reward:`, checkError);
      return NextResponse.json(
        { error: `Erreur: ${checkError.message}. Avez-vous exécuté le script SQL pour créer la table challenge_rewards ?` },
        { status: 500 }
      );
    }

    if (existing) {
      console.log(`[claim-reward] ⚠️ Reward already claimed for challenge ${challengeId}`);
      return NextResponse.json(
        { error: "Récompense déjà réclamée", alreadyClaimed: true },
        { status: 409 }
      );
    }

    // 2) Si la récompense est en points, ajouter les points au joueur
    if (rewardType === "points") {
      const points = parseInt(rewardValue, 10);
      if (isNaN(points) || points <= 0) {
        return NextResponse.json(
          { error: "Nombre de points invalide" },
          { status: 400 }
        );
      }

      // Récupérer le profil actuel du joueur
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("[claim-reward] Error fetching profile:", profileError);
        return NextResponse.json(
          { error: "Profil introuvable" },
          { status: 404 }
        );
      }

      const currentPoints = profile.points || 0;
      const newPoints = currentPoints + points;

      console.log(`[claim-reward] Adding ${points} points: ${currentPoints} → ${newPoints}`);

      // Mettre à jour les points
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", user.id);

      if (updateError) {
        console.error("[claim-reward] ❌ Error updating points:", updateError);
        return NextResponse.json(
          { error: "Erreur lors de l'ajout des points" },
          { status: 500 }
        );
      }

      console.log(`[claim-reward] ✅ Points updated successfully: ${currentPoints} → ${newPoints}`);
      
      // Vérifier que l'update a bien fonctionné
      const { data: verifyProfile } = await supabaseAdmin
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();
      
      console.log(`[claim-reward] 🔍 Verification - Points in DB after update:`, verifyProfile?.points);
    }

    // 3) Si la récompense est un badge, créer le badge
    // TODO: Implémenter la création de badge personnalisé si nécessaire
    // Pour l'instant, on enregistre juste la récompense

    // 4) Enregistrer la récompense comme attribuée
    const { error: insertError } = await supabaseAdmin
      .from("challenge_rewards")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        reward_type: rewardType,
        reward_value: rewardValue.toString(),
      });

    if (insertError) {
      console.error("[claim-reward] Error recording reward:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement de la récompense" },
        { status: 500 }
      );
    }

    console.log(`[claim-reward] ✅ Reward claimed successfully for challenge ${challengeId}`);

    // Revalider les pages qui affichent les points
    revalidatePath("/home");
    revalidatePath("/challenges");
    revalidatePath("/profil");

    return NextResponse.json({
      success: true,
      rewardType,
      rewardValue,
      message: "Récompense attribuée avec succès !",
    });
  } catch (error) {
    console.error("[claim-reward] Exception:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}


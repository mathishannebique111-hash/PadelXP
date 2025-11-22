import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

async function getClubMemberIds(supabase: ReturnType<typeof createServerClient>, clubId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("club_id", clubId);

  const ids = (data || []).map((member) => member.id).filter(Boolean) as string[];
  return ids;
}

// GET - Récupérer tous les avis (tous les joueurs inscrits)
// Query params: ?minRating=4 pour filtrer les avis positifs
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minRatingParam = searchParams.get("minRating");
  const minRating = minRatingParam ? parseInt(minRatingParam, 10) : undefined;
  try {
    // Permettre l'accès public aux avis (pas besoin d'authentification)
    // Utiliser directement un client admin pour bypass RLS et récupérer tous les avis
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Récupérer TOUS les avis de tous les joueurs inscrits (avec client admin pour bypass RLS)
    const { data: reviews, error } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, created_at, updated_at, user_id")
      .order("created_at", { ascending: false })
      .limit(100); // Augmenter la limite pour avoir plus d'avis

    if (error) {
      console.error("❌ Error fetching reviews:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[GET /api/reviews] Found ${reviews?.length || 0} total reviews`);

    // Récupérer les profils de tous les auteurs d'avis
    const userIds = (reviews || []).map(r => r.user_id).filter((id, index, self) => self.indexOf(id) === index);
    
    // Récupérer les profils avec le même client admin
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]); // Fallback si pas d'IDs

    const profilesMap = new Map<string, { display_name: string }>();
    (profilesData || []).forEach((p) => {
      if (p.id) {
        profilesMap.set(p.id, { display_name: p.display_name || "Joueur" });
      }
    });

    let enrichedReviews = (reviews || []).map((review) => ({
      ...review,
      profiles: profilesMap.get(review.user_id) || null,
    }));

    // Filtrer par note minimale si spécifié
    if (minRating !== undefined && !isNaN(minRating)) {
      const beforeFilter = enrichedReviews.length;
      enrichedReviews = enrichedReviews.filter(review => review.rating >= minRating);
      console.log(`[GET /api/reviews] Filtered reviews with minRating=${minRating}: ${beforeFilter} → ${enrichedReviews.length}`);
    }

    const averageRating = enrichedReviews.length > 0
      ? Math.round((enrichedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / enrichedReviews.length) * 10) / 10
      : 0;
    
    console.log(`[GET /api/reviews] Returning ${enrichedReviews.length} reviews (average rating: ${averageRating})`);

    // Calculer le taux de satisfaction (avis >= 4 étoiles)
    const positiveReviewsCount = enrichedReviews.filter(r => r.rating >= 4).length;
    const satisfactionRate = enrichedReviews.length > 0
      ? Math.round((positiveReviewsCount / enrichedReviews.length) * 100)
      : 0;

    return NextResponse.json({
      reviews: enrichedReviews,
      averageRating,
      totalReviews: enrichedReviews.length,
      positiveReviews: positiveReviewsCount,
      satisfactionRate,
    });
  } catch (error) {
    console.error("❌ Unexpected error in GET /api/reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Créer un nouvel avis (tous les joueurs inscrits)
export async function POST(req: Request) {
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
    console.error("❌ Unauthorized: No user found");
    return NextResponse.json({ error: "Vous devez être connecté pour laisser un avis" }, { status: 401 });
  }

  // Utiliser un client admin pour récupérer le profil (bypass RLS) et mettre à jour les points
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  // Récupérer le profil de l'utilisateur avec le client admin (bypass RLS)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError);
    return NextResponse.json({ error: "Erreur lors de la récupération du profil" }, { status: 500 });
  }

  if (!profile) {
    console.error(`❌ Profile not found for user ${user.id}`);
    return NextResponse.json({ error: "Profil non trouvé. Veuillez contacter le support." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const validated = reviewSchema.parse(body);

    // Vérifier si c'est le premier avis de l'utilisateur
    const { count: userReviewsCount } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isFirstReviewForUser = (userReviewsCount || 0) === 0;

    // Insérer l'avis
    const { data: insertedReview, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        rating: validated.rating,
        comment: validated.comment || null,
      })
      .select('id, rating, comment, created_at, updated_at, user_id')
      .single();

    if (error) {
      console.error('❌ Error inserting review:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si c'est le premier avis, créditer 10 points dans la colonne points du profil
    if (isFirstReviewForUser) {
      // Récupérer les points actuels du profil
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();

      const currentPoints = typeof currentProfile?.points === 'number' 
        ? currentProfile.points 
        : (typeof currentProfile?.points === 'string' ? parseInt(currentProfile.points, 10) || 0 : 0);

      // Ajouter 10 points pour le premier avis
      const newPoints = currentPoints + 10;

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating points for first review:', updateError);
        // Ne pas bloquer la soumission de l'avis si l'update des points échoue
      } else {
        console.log(`✅ 10 points credited to user ${user.id.substring(0, 8)} for first review. Points: ${currentPoints} → ${newPoints}`);
      }
    }

    const enrichedReview = {
      ...insertedReview,
      profiles: profile?.display_name ? { display_name: profile.display_name } : null,
    };

    return NextResponse.json({
      review: enrichedReview,
      updated: false,
      isFirstReviewForUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("❌ Unexpected error in POST /api/reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


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

// GET - Récupérer tous les avis du club de l'utilisateur
export async function GET() {
  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();

    const clubId = profile?.club_id || null;
    if (!clubId) {
      console.warn("[Reviews] User without club attempted to fetch reviews");
      return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
    }

    const memberIds = await getClubMemberIds(supabase, clubId);
    if (memberIds.length === 0) {
      return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
    }

    // Inclure l'utilisateur courant s'il n'est pas déjà présent
    if (!memberIds.includes(user.id)) {
      memberIds.push(user.id);
    }

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, updated_at, user_id")
      .in("user_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("❌ Error fetching reviews:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", memberIds);

    const profilesMap = new Map<string, { display_name: string }>();
    (profilesData || []).forEach((p) => {
      if (p.id) {
        profilesMap.set(p.id, { display_name: p.display_name || "Joueur" });
      }
    });

    const enrichedReviews = (reviews || []).map((review) => ({
      ...review,
      profiles: profilesMap.get(review.user_id) || null,
    }));

    const averageRating = enrichedReviews.length > 0
      ? Math.round((enrichedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / enrichedReviews.length) * 10) / 10
      : 0;

    return NextResponse.json({
      reviews: enrichedReviews,
      averageRating,
      totalReviews: enrichedReviews.length,
    });
  } catch (error) {
    console.error("❌ Unexpected error in GET /api/reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Créer un nouvel avis (club courant uniquement)
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('club_id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.club_id) {
    return NextResponse.json({ error: "Vous devez être rattaché à un club pour laisser un avis" }, { status: 403 });
  }

  const memberIds = await getClubMemberIds(supabase, profile.club_id);
  if (!memberIds.includes(user.id)) {
    memberIds.push(user.id);
  }

  try {
    const body = await req.json();
    const validated = reviewSchema.parse(body);

    const { count: totalReviewsInClub } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .in('user_id', memberIds);

    const { count: userReviewsCount } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

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

    const enrichedReview = {
      ...insertedReview,
      profiles: profile.display_name ? { display_name: profile.display_name } : null,
    };

    const isFirstReviewForUser = (userReviewsCount || 0) === 0;

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


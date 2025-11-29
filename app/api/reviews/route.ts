import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { sendModeratedReviewEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { reviewSubmissionRateLimit, checkRateLimit } from "@/lib/rate-limit";

/**
 * Compte le nombre de mots dans un texte
 */
function countWords(text: string | null | undefined): number {
  if (!text || typeof text !== "string") {
    return 0;
  }

  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return 0;
  }

  const words = cleaned.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

/**
 * Schéma d'avis : note entière entre 1 et 5, commentaire optionnel (1000 caractères max, trim appliqué).
 */
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000, "Le commentaire est limité à 1000 caractères")
    .optional(),
});

async function getClubMemberIds(
  supabase: ReturnType<typeof createServerClient>,
  clubId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("club_id", clubId);

  const ids = (data || []).map((member: { id: string }) => member.id).filter(Boolean) as string[];
  return ids;
}

// GET - Récupérer tous les avis (tous les joueurs inscrits)
// Query params: ?minRating=4 pour filtrer les avis positifs
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minRatingParam = searchParams.get("minRating");
  const minRating = minRatingParam ? parseInt(minRatingParam, 10) : undefined;
  try {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: reviews, error } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, created_at, updated_at, user_id")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      logger.error({ err: error }, "Error fetching reviews");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info(
      { count: reviews?.length || 0 },
      "[GET /api/reviews] Found reviews"
    );

    const userIds = (reviews || [])
      .map((r) => r.user_id)
      .filter((id, index, self) => self.indexOf(id) === index);

    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

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

    if (minRating !== undefined && !isNaN(minRating)) {
      const beforeFilter = enrichedReviews.length;
      enrichedReviews = enrichedReviews.filter(
        (review) => review.rating >= minRating
      );
      logger.info(
        { minRating, beforeFilter, afterFilter: enrichedReviews.length },
        "[GET /api/reviews] Filtered reviews"
      );
    }

    const averageRating =
      enrichedReviews.length > 0
        ? Math.round(
            (enrichedReviews.reduce(
              (sum, r) => sum + (r.rating || 0),
              0
            ) /
              enrichedReviews.length) *
              10
          ) / 10
        : 0;

    logger.info(
      { count: enrichedReviews.length, averageRating },
      "[GET /api/reviews] Returning reviews"
    );

    const positiveReviewsCount = enrichedReviews.filter(
      (r) => r.rating >= 4
    ).length;
    const satisfactionRate =
      enrichedReviews.length > 0
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
    logger.error({ err: error }, "Unexpected error in GET /api/reviews");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: any }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.error("Unauthorized: No user found");
    return NextResponse.json(
      { error: "Vous devez être connecté pour laisser un avis" },
      { status: 401 }
    );
  }

  const userIdPreview = user.id.substring(0, 8) + "…";
  console.log("[reviews] rate-limit key", `review-user:${userIdPreview}`);
  
  // 🔒 Rate limiting par joueur (1 review / heure)
  const rl = await checkRateLimit(
    reviewSubmissionRateLimit,
    `review-user:${user.id}`
  );

  if (!rl.success) {
    return NextResponse.json(
      {
        error:
          "Vous avez déjà soumis un avis récemment. Merci de patienter avant de soumettre un nouvel avis.",
      },
      {
        status: 429,
        headers: {
          ...(rl.limit !== undefined
            ? { "X-RateLimit-Limit": String(rl.limit) }
            : {}),
          ...(rl.remaining !== undefined
            ? { "X-RateLimit-Remaining": String(rl.remaining) }
            : {}),
          ...(rl.reset !== undefined
            ? { "X-RateLimit-Reset": String(rl.reset) }
            : {}),
        },
      }
    );
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.error({ err: profileError }, "Error fetching profile");
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }

  if (!profile) {
    logger.error({ userId: user.id }, "Profile not found");
    return NextResponse.json(
      { error: "Profil non trouvé. Veuillez contacter le support." },
      { status: 404 }
    );
  }

  let playerEmail = profile.email || user.email || "";
  if (!playerEmail) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
      user.id
    );
    playerEmail = authUser?.user?.email || "";
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Format de requête invalide" },
        { status: 400 }
      );
    }

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors).flat()[0] ?? "Données invalides";
      return NextResponse.json(
        { error: firstError, details: fieldErrors },
        { status: 400 }
      );
    }

    const { rating, comment } = parsed.data;

    // Utiliser le commentaire brut (déjà trim via Zod)
    const sanitizedComment = comment || null;

    const { count: userReviewsCount } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const isFirstReviewForUser = (userReviewsCount || 0) === 0;

    logger.info(
      { userReviewsCount, isFirstReviewForUser },
      "[POST /api/reviews] First review check"
    );

    const wordCount = countWords(sanitizedComment);
    const shouldModerate = rating <= 3 && wordCount <= 6;

    logger.info(
      { rating, wordCount, shouldModerate },
      "[POST /api/reviews] Review moderation check"
    );

    const { data: insertedReview, error } = await supabaseAdmin
      .from("reviews")
      .insert({
        user_id: user.id,
        rating: rating,
        comment: sanitizedComment,
        is_hidden: shouldModerate,
      })
      .select("id, rating, comment, created_at, updated_at, user_id, is_hidden")
      .single();

    if (error) {
      logger.error({ err: error }, "Error inserting review");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (shouldModerate && insertedReview) {
      const adminEmail =
        process.env.ADMIN_EMAIL ||
        process.env.RESEND_INBOUND_EMAIL ||
        "contact@updates.padelxp.eu";

      logger.info(
        { reviewId: insertedReview.id },
        "[POST /api/reviews] Creating conversation and sending moderation email"
      );

      try {
        const { data: conversation, error: convError } = await supabaseAdmin
          .from("review_conversations")
          .insert({
            review_id: insertedReview.id,
            user_id: user.id,
            user_email: playerEmail,
            user_name: profile.display_name || "Joueur",
            subject: `Avis modéré - ${
              profile.display_name || "Joueur"
            } (${rating}/5 étoiles)`,
            status: "open",
          })
          .select("id")
          .single();

        if (convError) {
          logger.error({ err: convError }, "Error creating review conversation");
        } else if (conversation) {
          logger.info(
            { conversationId: conversation.id, reviewId: insertedReview.id },
            "[POST /api/reviews] Created conversation"
          );

          const messageText = `Note: ${rating}/5\n${
            comment ? `Commentaire: ${comment}` : "Aucun commentaire"
          }`;

          const { error: messageError } = await supabaseAdmin
            .from("review_messages")
            .insert({
              conversation_id: conversation.id,
              sender_type: "player",
              sender_id: user.id,
              sender_email: playerEmail,
              message_text: messageText,
              html_content: `<p><strong>Note:</strong> ${rating}/5</p>${
                comment
                  ? `<p><strong>Commentaire:</strong> ${comment}</p>`
                  : "<p>Aucun commentaire</p>"
              }`,
            });

          if (messageError) {
            logger.error({ err: messageError }, "Error creating review message");
          } else {
            logger.info(
              { conversationId: conversation.id },
              "[POST /api/reviews] Created initial message"
            );
          }

          await sendModeratedReviewEmail(
            adminEmail,
            profile.display_name || "Joueur",
            playerEmail,
            rating,
            comment || null,
            insertedReview.id,
            conversation.id
          );
        }
      } catch (emailError) {
        logger.error(
          { err: emailError },
          "Error in moderation flow (non-blocking)"
        );
      }
    }

    if (isFirstReviewForUser) {
      logger.info(
        { userId: user.id },
        "[POST /api/reviews] First review detected - points will be calculated dynamically"
      );
    } else {
      logger.info(
        { userId: user.id, userReviewsCount },
        "[POST /api/reviews] Not first review, no bonus points"
      );
    }

    const enrichedReview = {
      ...insertedReview,
      profiles: profile?.display_name
        ? { display_name: profile.display_name }
        : null,
    };

    const isReviewValid = rating > 3 || (rating <= 3 && wordCount > 6);

    let hadValidReviewBefore = false;
    if (!isFirstReviewForUser) {
      const { data: otherReviews } = await supabaseAdmin
        .from("reviews")
        .select("rating, comment")
        .eq("user_id", user.id)
        .neq("id", insertedReview.id);

      if (otherReviews && otherReviews.length > 0) {
        hadValidReviewBefore = otherReviews.some((r: any) => {
          const rWordCount = countWords(r.comment);
          return (
            (r.rating || 0) > 3 ||
            ((r.rating || 0) <= 3 && rWordCount > 6)
          );
        });
      }
    }

    const hasValidReviewNow = hadValidReviewBefore || isReviewValid;
    const isFirstValidReview =
      (isFirstReviewForUser && isReviewValid) ||
      (!hadValidReviewBefore && isReviewValid);

    return NextResponse.json({
      review: enrichedReview,
      updated: false,
      isFirstReviewForUser,
      isReviewValidForBonus: isReviewValid,
      isFirstValidReviewForBonus: isFirstValidReview,
    });
  } catch (error) {
    logger.error({ err: error }, "Unexpected error in POST /api/reviews");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

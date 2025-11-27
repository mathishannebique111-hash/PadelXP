import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { sendModeratedReviewEmail } from "@/lib/email";
import DOMPurify from "isomorphic-dompurify";

/**
 * Compte le nombre de mots dans un texte
 */
function countWords(text: string | null | undefined): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  // Nettoyer le texte et compter les mots
  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return 0;
  }
  
  // Diviser par les espaces et filtrer les chaînes vides
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}


/**
 * Schéma d'avis : note entière entre 1 et 5, commentaire optionnel (1000 caractères max, trim appliqué).
 */
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000, "Le commentaire est limité à 1000 caractères").optional(),
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
    // Exclure les avis masqués (is_hidden = true)
    const { data: reviews, error } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, created_at, updated_at, user_id")
      .eq("is_hidden", false) // Exclure les avis masqués
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
    .select('display_name, email')
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

  // Récupérer l'email de l'utilisateur depuis auth.users
  let playerEmail = profile.email || user.email || '';
  if (!playerEmail) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    playerEmail = authUser?.user?.email || '';
  }

  try {
    // === MODIFICATION ICI : Validation Zod avec safeParse ===
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Format de requête invalide" }, { status: 400 });
    }

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";
      return NextResponse.json({ error: firstError, details: fieldErrors }, { status: 400 });
    }

    const { rating, comment } = parsed.data;
    // === FIN DE LA MODIFICATION ===

// Sanitizer le commentaire pour bloquer XSS
const sanitizedComment = comment ? DOMPurify.sanitize(comment, {
  ALLOWED_TAGS: [], // Aucun HTML autorisé
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true // Garde le texte mais retire les tags
}).trim() : null;

    // Vérifier si c'est le premier avis de l'utilisateur
    // Utiliser supabaseAdmin pour bypass RLS et voir TOUS les avis (même masqués)
    const { count: userReviewsCount } = await supabaseAdmin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isFirstReviewForUser = (userReviewsCount || 0) === 0;
    
    console.log(`[POST /api/reviews] First review check: userReviewsCount=${userReviewsCount}, isFirstReviewForUser=${isFirstReviewForUser}`);

    // Vérifier si l'avis doit être modéré (3 étoiles ou moins ET 6 mots ou moins)
    const wordCount = countWords(sanitizedComment);
    const shouldModerate = rating <= 3 && wordCount <= 6;

    console.log(`[POST /api/reviews] Review moderation check: rating=${rating}, wordCount=${wordCount}, shouldModerate=${shouldModerate}`);

    // Insérer l'avis (avec is_hidden si besoin)
    const { data: insertedReview, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        user_id: user.id,
        rating: rating,
        comment: sanitizedComment,
        is_hidden: shouldModerate, // Masquer l'avis s'il doit être modéré
      })
      .select('id, rating, comment, created_at, updated_at, user_id, is_hidden')
      .single();

    if (error) {
      console.error('❌ Error inserting review:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si l'avis doit être modéré, créer une conversation et envoyer un email à l'administrateur
    if (shouldModerate && insertedReview) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_INBOUND_EMAIL || 'contact@updates.padelxp.eu';
      
      console.log(`[POST /api/reviews] Creating conversation and sending moderation email for review ${insertedReview.id}`);
      
      try {
        // Créer une conversation pour cet avis modéré
        const { data: conversation, error: convError } = await supabaseAdmin
          .from('review_conversations')
          .insert({
            review_id: insertedReview.id,
            user_id: user.id,
            user_email: playerEmail,
            user_name: profile.display_name || 'Joueur',
            subject: `Avis modéré - ${profile.display_name || 'Joueur'} (${rating}/5 étoiles)`,
            status: 'open',
          })
          .select('id')
          .single();

        if (convError) {
          console.error('❌ Error creating review conversation:', convError);
          // Continuer quand même pour envoyer l'email
        } else if (conversation) {
          console.log(`[POST /api/reviews] Created conversation ${conversation.id} for review ${insertedReview.id}`);
          
          // Enregistrer le message initial du joueur (l'avis)
          const messageText = `Note: ${rating}/5\n${comment ? `Commentaire: ${comment}` : 'Aucun commentaire'}`;
          
          const { error: messageError } = await supabaseAdmin
            .from('review_messages')
            .insert({
              conversation_id: conversation.id,
              sender_type: 'player',
              sender_id: user.id,
              sender_email: playerEmail,
              message_text: messageText,
              html_content: `<p><strong>Note:</strong> ${rating}/5</p>${comment ? `<p><strong>Commentaire:</strong> ${comment}</p>` : '<p>Aucun commentaire</p>'}`,
            });

          if (messageError) {
            console.error('❌ Error creating review message:', messageError);
          } else {
            console.log(`[POST /api/reviews] Created initial message for conversation ${conversation.id}`);
          }
          
          // Envoyer l'email avec la conversationId dans les headers
          await sendModeratedReviewEmail(
            adminEmail,
            profile.display_name || 'Joueur',
            playerEmail,
            rating,
            comment || null,
            insertedReview.id,
            conversation.id // Passer la conversationId
          );
        }
      } catch (emailError) {
        console.error('❌ Error in moderation flow (non-blocking):', emailError);
        // Ne pas bloquer la soumission de l'avis si l'email échoue
      }
    }

    // Les 10 points pour le premier avis sont calculés dynamiquement dans le leaderboard et PlayerSummary
    // via le paramètre bonus (reviewsBonus), pas besoin de créditer dans la colonne points du profil
    // pour éviter un double crédit (10 points dans la colonne + 10 points calculés dynamiquement = 20 points)
    if (isFirstReviewForUser) {
      console.log(`[POST /api/reviews] First review detected for user ${user.id}. Points will be calculated dynamically in leaderboard/PlayerSummary (10 points bonus).`);
    } else {
      console.log(`[POST /api/reviews] Not first review (user has ${userReviewsCount} reviews), no bonus points`);
    }

    const enrichedReview = {
      ...insertedReview,
      profiles: profile?.display_name ? { display_name: profile.display_name } : null,
    };

    // Vérifier si l'avis soumis est valide pour les points/badge
    // Un avis est valide si rating > 3 OU (rating <= 3 ET words > 6)
    // wordCount a déjà été déclaré plus haut
    const isReviewValid = rating > 3 || (rating <= 3 && wordCount > 6);
    
    // Vérifier si l'utilisateur avait déjà un avis valide AVANT de soumettre celui-ci
    let hadValidReviewBefore = false;
    if (!isFirstReviewForUser) {
      // Récupérer tous les autres avis de l'utilisateur (avant celui qu'on vient de créer)
      const { data: otherReviews } = await supabaseAdmin
        .from('reviews')
        .select('rating, comment')
        .eq('user_id', user.id)
        .neq('id', insertedReview.id);
      
      if (otherReviews && otherReviews.length > 0) {
        hadValidReviewBefore = otherReviews.some((r: any) => {
          const rWordCount = countWords(r.comment);
          return (r.rating || 0) > 3 || ((r.rating || 0) <= 3 && rWordCount > 6);
        });
      }
    }
    
    // L'utilisateur a maintenant un avis valide si : soit il en avait déjà un, soit celui-ci est valide
    const hasValidReviewNow = hadValidReviewBefore || isReviewValid;
    
    // C'est le premier avis valide si : c'est le premier avis ET qu'il est valide
    // OU si ce n'est pas le premier avis mais qu'il n'avait pas d'avis valide avant ET que celui-ci est valide
    const isFirstValidReview = (isFirstReviewForUser && isReviewValid) || (!hadValidReviewBefore && isReviewValid);

    return NextResponse.json({
      review: enrichedReview,
      updated: false,
      isFirstReviewForUser,
      isReviewValidForBonus: isReviewValid,
      isFirstValidReviewForBonus: isFirstValidReview,
    });
  } catch (error) {
    // === SUPPRESSION DU CATCH ZOD (déjà géré avec safeParse) ===
    console.error("❌ Unexpected error in POST /api/reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

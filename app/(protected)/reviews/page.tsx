import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";
import ReviewsStats from "@/components/ReviewsStats";
import PageTitle from "@/components/PageTitle";
import Link from "next/link";
import Image from "next/image";
export const dynamic = "force-dynamic";

// Créer un client admin pour bypass RLS dans les requêtes critiques
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function ReviewsPage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold text-white">Accès restreint</h1>
          <Link href="/login" className="text-blue-400 underline">Se connecter</Link>
        </div>
      );
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();

    let userClubId = userProfile?.club_id || null;

    if (!userClubId) {
      try {
        const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
          .from("profiles")
          .select("club_id")
          .eq("id", user.id)
          .maybeSingle();
        if (adminProfileError) {
          console.error("[Reviews] Failed to fetch profile via admin client", {
            message: adminProfileError.message,
            details: adminProfileError.details,
            hint: adminProfileError.hint,
            code: adminProfileError.code,
          });
        }
        if (adminProfile?.club_id) {
          userClubId = adminProfile.club_id;
        }
      } catch (e) {
        console.error("[Reviews] Unexpected error when fetching profile via admin client", e);
      }
    }

    // Plus besoin de vérifier le club_id - tous les joueurs inscrits peuvent laisser des avis

    // Récupérer TOUS les avis de tous les joueurs inscrits (pas seulement ceux du club)
    // Exclure les avis masqués (is_hidden = true)
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        user_id
      `)
      .eq("is_hidden", false) // Exclure les avis masqués
      .order("created_at", { ascending: false })
      .limit(100);

    // Gérer les erreurs de récupération des avis
    if (reviewsError) {
      console.error("❌ Error fetching reviews:", reviewsError);
    }

    // Récupérer les profils pour chaque user_id (tous les profils)
    let enrichedReviews = reviews || [];
    if (reviews && reviews.length > 0) {
      const userIds = reviews.map(r => r.user_id).filter((id, index, self) => self.indexOf(id) === index);
      // Utiliser le client admin pour bypass RLS et récupérer tous les profils
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]); // Fallback si pas d'IDs
      
      if (profilesError) {
        const errorDetails = {
          message: profilesError.message || "Unknown error",
          details: profilesError.details || null,
          hint: profilesError.hint || null,
          code: profilesError.code || null
        };
        if (!errorDetails.message && !errorDetails.details && !errorDetails.hint && !errorDetails.code) {
          console.error("❌ Error fetching profiles:", profilesError);
        } else {
          console.error("❌ Error fetching profiles:", errorDetails);
        }
      }
      
      if (profiles) {
        const profilesMap = profiles.reduce((acc, profile) => {
          if (profile.id && profile.display_name) {
            acc[profile.id] = { display_name: profile.display_name };
          }
          return acc;
        }, {} as Record<string, { display_name: string }>);
        
        // Enrichir tous les avis avec les profils (pas de filtre par club)
        enrichedReviews = reviews.map(review => ({
          ...review,
          profiles: profilesMap[review.user_id] || null
        }));
      }
    }

    // Calculer la note moyenne + taux de satisfaction (>=4)
    const averageRating = enrichedReviews && enrichedReviews.length > 0
      ? enrichedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / enrichedReviews.length
      : 0;

    // L'utilisateur a-t-il déjà laissé au moins un avis ?
    // Vérifier TOUS les avis (y compris les avis masqués) pour savoir si l'utilisateur a déjà laissé un avis
    const { count: userReviewsCount } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    const hasUserReview = (userReviewsCount || 0) > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-20 md:pt-8 pb-8">
        {/* HEADER */}
        <div className="mb-6">
          <PageTitle title="Avis et Notes" />
        </div>

      {/* FORMULAIRE */}
      <div className="mb-10 rounded-2xl bg-white p-6 sm:p-8 shadow-[0_40px_90px_rgba(4,16,46,0.5)] border-2 border-white/30 relative scale-[1.01] z-10">
        <div className="mb-5">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Donner votre avis</h2>
        </div>
        {!hasUserReview && (
          <div className="mb-5 rounded-xl border border-[#10B981]/20 bg-[#ECFDF5] px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#10B981] font-medium flex items-center gap-2">
            <Image 
              src="/images/Cadeau page avis.gif" 
              alt="Cadeau" 
              width={20} 
              height={20} 
              className="flex-shrink-0 mix-blend-multiply"
              unoptimized
            />
            <span><span className="font-semibold">10 points</span> offerts pour votre premier avis</span>
          </div>
        )}
        <ReviewForm />
      </div>

      {/* Stats et Progression */}
      <ReviewsStats 
        initialReviews={enrichedReviews || []} 
        initialAverageRating={averageRating}
      />

      {/* Liste des avis */}
      <ReviewsList 
        initialReviews={enrichedReviews || []} 
        initialAverageRating={averageRating}
      />
      </div>
    </div>
    );
  } catch (error) {
    console.error("❌ Unexpected error in ReviewsPage:", error);
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Erreur</h1>
          <p className="text-red-700">Une erreur est survenue lors du chargement de la page. Veuillez réessayer plus tard.</p>
        </div>
      </div>
    );
  }
}


import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";
import ReviewsStats from "@/components/ReviewsStats";
import NavigationBar from "@/components/NavigationBar";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
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
    const supabase = createClient();
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

    if (!userClubId) {
      return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
          {/* Background avec overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
          
          {/* Pattern animé */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 text-white">
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Avis membres</h1>
                <LogoutButton />
              </div>
              <NavigationBar currentPage="reviews" />
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-sm text-white/70 font-normal">
              <p>Vous devez être rattaché à un club pour consulter ou publier des avis. Merci de contacter votre club pour obtenir un code d'invitation.</p>
            </div>
          </div>
        </div>
      );
    }

    const { data: clubMembers } = await supabase
      .from("profiles")
      .select("id")
      .eq("club_id", userClubId);

    const memberIds = (clubMembers || []).map(member => member.id).filter(Boolean);
    if (!memberIds.includes(user.id)) {
      memberIds.push(user.id);
    }

    if (memberIds.length === 0) {
      return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
          {/* Background avec overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
          
          {/* Pattern animé */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 text-white">
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Avis membres</h1>
                <LogoutButton />
              </div>
              <NavigationBar currentPage="reviews" />
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-sm text-white/70">
              <p>Aucun membre pour le moment dans votre club.</p>
            </div>
          </div>
        </div>
      );
    }

    // Récupérer tous les avis avec jointure manuelle vers profiles
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        user_id
      `)
      .in("user_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(50);

    // Gérer les erreurs de récupération des avis
    if (reviewsError) {
      console.error("❌ Error fetching reviews:", reviewsError);
    }

    // Récupérer les profils pour chaque user_id (filtrés par club)
    let enrichedReviews = reviews || [];
    if (reviews && reviews.length > 0) {
      const userIds = reviews.map(r => r.user_id).filter((id, index, self) => self.indexOf(id) === index);
      // Utiliser le client admin pour bypass RLS
      let profilesQuery = supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      
      // Filtrer par club_id si disponible
      if (userClubId) {
        profilesQuery = profilesQuery.eq("club_id", userClubId);
      }
      
      const { data: profiles, error: profilesError } = await profilesQuery;
      
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
        
        // Filtrer les avis : ne garder que ceux dont l'auteur appartient au même club
        const validUserIds = new Set(profiles.map(p => p.id));
        enrichedReviews = reviews
          .filter(review => validUserIds.has(review.user_id))
          .map(review => ({
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
    const hasUserReview = (enrichedReviews || []).some((r) => r.user_id === user.id);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8">
        {/* HEADER */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Avis et Notes</h1>
            <LogoutButton />
          </div>
          <NavigationBar currentPage="reviews" />
          <div className="mt-3 rounded-2xl bg-gradient-to-r from-teal-500 via-sky-600 to-blue-700 p-6 text-white shadow-xl">
            <h2 className="text-2xl font-semibold tracking-tight">Partagez votre expérience !</h2>
            <p className="mt-1 text-sm text-white/70">Votre avis inspire la communauté</p>
          </div>
        </div>

      {/* Stats et Progression */}
      <ReviewsStats 
        initialReviews={enrichedReviews || []} 
        initialAverageRating={averageRating}
      />

      {/* FORMULAIRE */}
      <div className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900">Donner votre avis</h2>
          {!hasUserReview && (
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-extrabold text-white shadow" style={{background:'linear-gradient(135deg,#22c55e,#a3e635)'}}>
              ✨ +10 points
            </span>
          )}
        </div>
        {!hasUserReview && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 font-semibold flex items-center gap-2">
            🎁 Récompense immédiate : Gagnez <span className="text-emerald-700">10 points</span> en laissant votre avis maintenant !
          </div>
        )}
        <ReviewForm />
      </div>

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


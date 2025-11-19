"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
}

interface ReviewsListProps {
  initialReviews?: Review[];
  initialAverageRating?: number;
  onReviewSubmitted?: () => void;
}

export default function ReviewsList({ 
  initialReviews = [], 
  initialAverageRating = 0,
  onReviewSubmitted 
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [averageRating, setAverageRating] = useState(initialAverageRating);
  const [loading, setLoading] = useState(false);

  // Synchroniser l'état initial avec les props au montage
  useEffect(() => {
    setReviews(initialReviews);
    setAverageRating(initialAverageRating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Écouter les événements de soumission d'avis
  useEffect(() => {
    const handleReviewSubmitted = async (event?: Event) => {
      console.log("📥 ReviewsList received reviewSubmitted event");
      // Recharger les avis depuis l'API avec un petit délai pour s'assurer que la DB est à jour
      setLoading(true);
      try {
        // Attendre un peu plus pour s'assurer que la DB est à jour
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const response = await fetch("/api/reviews", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("📊 Fetched reviews:", data.reviews?.length || 0, "Average:", data.averageRating);
        console.log("📊 First review:", data.reviews?.[0]);
        
        if (data.reviews && Array.isArray(data.reviews)) {
          // Trier par date décroissante pour s'assurer que le nouvel avis est en premier
          const sortedReviews = [...data.reviews].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          console.log("✅ Setting reviews:", sortedReviews.length);
          console.log("✅ First review data:", sortedReviews[0]);
          setReviews(sortedReviews);
          setAverageRating(data.averageRating || 0);
        } else {
          console.warn("⚠️ No reviews in response:", data);
        }
      } catch (error) {
        console.error("❌ Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    // Écouter l'événement personnalisé
    window.addEventListener("reviewSubmitted", handleReviewSubmitted as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener("reviewSubmitted", handleReviewSubmitted as EventListener);
    };
  }, []);

  // Calculer le taux de satisfaction
  const satisfactionRate = reviews && reviews.length > 0
    ? Math.round((reviews.filter((r) => (r.rating || 0) >= 4).length / reviews.length) * 100)
    : 0;

  // Afficher tous les avis (pas seulement les 5 premiers)
  const topToShow = reviews || [];

  return (
    <>
      {/* LISTE DES AVIS */}
      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-5 sm:mb-6 tracking-tight">
          Avis de la communauté ({reviews?.length || 0})
        </h2>
        {(reviews && reviews.length > 0) ? (
          <>
            {topToShow.map((review: Review, idx: number) => (
              <div
                key={review.id}
                className="rounded-xl sm:rounded-2xl bg-white p-5 sm:p-6 border border-white/10 shadow-[0_20px_50px_rgba(4,16,46,0.25)] opacity-0 animate-fade-in"
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0066FF] to-[#003D99] text-white flex items-center justify-center font-bold text-sm">
                      {(review.profiles?.display_name || 'Joueur').slice(0,1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{review.profiles?.display_name || 'Joueur'}</div>
                      <div className="text-xs sm:text-sm text-slate-500">
                        {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`${n <= review.rating ? 'text-[#FFD700] drop-shadow-[0_0_3px_rgba(255,215,0,0.5)]' : 'text-slate-300'} text-lg sm:text-xl`}>★</span>
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-slate-700 text-sm sm:text-base leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="rounded-xl sm:rounded-2xl bg-white p-8 sm:p-10 text-center border border-white/10 shadow-[0_20px_50px_rgba(4,16,46,0.25)]">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-5">Soyez le premier à partager votre passion !</div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-amber-700 shadow-sm">
              <Image 
                src="/images/Badge.png" 
                alt="Badges" 
                width={16} 
                height={16} 
                className="flex-shrink-0"
                unoptimized
              />
              Badge "Contributeur" offert au premier avis
            </div>
          </div>
        )}
      </div>
    </>
  );
}


"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { sortReviewsByDate } from "@/lib/utils/review-utils";
import type { Review } from "@/lib/utils/review-utils";
import { logger } from '@/lib/logger';

// Fonction pour formater la date sur une seule ligne
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

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

  // Trier tous les avis par date (plus récents en premier)
  const sortedReviews = sortReviewsByDate(reviews);

  // Synchroniser l'état initial avec les props au montage
  useEffect(() => {
    setReviews(initialReviews);
    setAverageRating(initialAverageRating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Écouter les événements de soumission d'avis
  useEffect(() => {
    const handleReviewSubmitted = async (event?: Event) => {
      logger.info("📥 ReviewsList received reviewSubmitted event");
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
        logger.info(`📊 Fetched reviews: ${data.reviews?.length || 0} Average: ${data.averageRating}`);
        logger.info(`📊 First review: ${JSON.stringify(data.reviews?.[0])}`);

        if (data.reviews && Array.isArray(data.reviews)) {
          // Trier par date décroissante pour s'assurer que le nouvel avis est en premier
          const sortedReviews = [...data.reviews].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          logger.info("✅ Setting reviews:", sortedReviews.length);
          logger.info("✅ First review data:", sortedReviews[0]);
          setReviews(sortedReviews);
          setAverageRating(data.averageRating || 0);
        } else {
          logger.warn("⚠️ No reviews in response:", data);
        }
      } catch (error) {
        logger.error("❌ Error fetching reviews:", error);
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

  return (
    <>
      {/* LISTE DES AVIS */}
      <div className="space-y-4 sm:space-y-6">
        {/* TOUS LES AVIS */}
        {sortedReviews.length > 0 && (
          <>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-5 sm:mb-6 tracking-tight">
              Avis de la communauté ({sortedReviews.length})
            </h2>
            <div className="space-y-4 sm:space-y-6">
              {sortedReviews.map((review: Review, idx: number) => (
                <div
                  key={review.id}
                  className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 sm:p-6 border-2 shadow-[0_20px_50px_rgba(4,16,46,0.25)] opacity-0 animate-fade-in relative"
                  style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'forwards', borderColor: 'rgba(var(--theme-accent-rgb, 0, 102, 255), 0.2)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-lg ring-2 ring-[rgb(var(--theme-accent))]/20" style={{ background: 'linear-gradient(to bottom right, rgb(var(--theme-accent)), rgb(var(--theme-secondary-accent)))' }}>
                        {(() => {
                          const name = review.profiles?.display_name || 'Joueur';
                          const words = name.trim().split(' ');
                          if (words.length >= 2) {
                            return (words[0][0] + words[1][0]).toUpperCase();
                          }
                          return name.slice(0, 2).toUpperCase();
                        })()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{review.profiles?.display_name || 'Joueur'}</div>
                        <div className="text-xs sm:text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(review.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} className={`${n <= review.rating ? 'drop-shadow-[0_0_3px_rgba(var(--theme-secondary-accent-rgb, 191,255,0), 0.5)]' : 'text-slate-300'} text-lg sm:text-xl`} style={{ color: n <= review.rating ? 'rgb(var(--theme-secondary-accent))' : undefined }}>★</span>
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* MESSAGE SI AUCUN AVIS */}
        {sortedReviews && sortedReviews.length === 0 && (
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


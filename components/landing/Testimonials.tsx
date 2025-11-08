"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reviews", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.warn(`Reviews API returned ${response.status}, using empty reviews`);
        setReviews([]);
        setAverageRating(0);
        return;
      }
      
      const data = await response.json();
      if (data.reviews) {
        // Trier par date décroissante et prendre les 6 premiers
        const sortedReviews = [...data.reviews]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 6);
        setReviews(sortedReviews);
        setAverageRating(data.averageRating || 0);
      } else {
        setReviews([]);
        setAverageRating(0);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
      setAverageRating(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Écouter les événements de soumission d'avis pour mettre à jour automatiquement
  useEffect(() => {
    const handleReviewSubmitted = async () => {
      console.log("📥 Testimonials received reviewSubmitted event");
      // Attendre un peu pour s'assurer que la DB est à jour
      await new Promise(resolve => setTimeout(resolve, 300));
      fetchReviews();
    };

    window.addEventListener("reviewSubmitted", handleReviewSubmitted);
    
    return () => {
      window.removeEventListener("reviewSubmitted", handleReviewSubmitted);
    };
  }, [fetchReviews]);

  return (
    <section className="relative py-24 bg-black">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            La voix de la{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              communauté
            </span>
          </h2>
          {averageRating > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="text-2xl font-bold text-white">{averageRating.toFixed(1)}</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`${
                      n <= Math.round(averageRating) ? "text-[#FFD700]" : "text-gray-600"
                    } text-xl`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div className="text-white/60 text-lg ml-2">
                ({reviews.length} avis)
              </div>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-white/60 text-lg">Chargement des avis...</p>
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                      {(review.profiles?.display_name || "Joueur").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {review.profiles?.display_name || "Joueur"}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(review.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`${
                          n <= review.rating ? "text-[#FFD700]" : "text-gray-600"
                        } text-lg`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-300 leading-relaxed">{review.comment}</p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-white/60 text-lg">
              Les témoignages arrivent bientôt...
            </p>
          </div>
        )}
      </div>
    </section>
  );
}


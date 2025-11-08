"use client";

import { useEffect, useState } from "react";

interface ReviewsStatsProps {
  initialReviews?: any[];
  initialAverageRating?: number;
}

export default function ReviewsStats({ 
  initialReviews = [], 
  initialAverageRating = 0,
}: ReviewsStatsProps) {
  const [reviews, setReviews] = useState(initialReviews);
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
      console.log("📥 ReviewsStats received reviewSubmitted event");
      setLoading(true);
      try {
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
        
        if (data.reviews && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
          setAverageRating(data.averageRating || 0);
        }
      } catch (error) {
        console.error("❌ Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("reviewSubmitted", handleReviewSubmitted as EventListener);
    
    return () => {
      window.removeEventListener("reviewSubmitted", handleReviewSubmitted as EventListener);
    };
  }, []);

  return (
    <>
      {/* STATS */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`rounded-xl bg-white p-6 shadow-md hover:shadow-blue-200 transition-all border border-blue-50 ${loading ? 'opacity-75' : ''}`}>
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            Avis
            {loading && <span className="text-xs text-blue-500 animate-pulse">Mise à jour...</span>}
          </div>
          <div className="text-3xl font-extrabold text-gray-900 transition-all">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-pulse">...</span>
              </span>
            ) : (
              <span className="animate-fade-in">{reviews?.length || 0}</span>
            )}
          </div>
        </div>
        <div className={`rounded-xl bg-white p-6 shadow-md hover:shadow-yellow-200 transition-all border border-yellow-50 ${loading ? 'opacity-75' : ''}`}>
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            Note moyenne
            {loading && <span className="text-xs text-yellow-500 animate-pulse">Mise à jour...</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-extrabold text-gray-900 transition-all">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <span className="animate-fade-in">{averageRating > 0 ? averageRating.toFixed(1) : "—"}</span>
              )}
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={`${n <= Math.round(averageRating) ? 'text-[#FFD700]' : 'text-gray-300'} text-xl drop-shadow transition-all`}>★</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESSION COMMUNAUTAIRE */}
      <div className="mb-8 rounded-xl bg-white p-6 border border-gray-100 shadow">
        <div className="mb-2 text-sm text-gray-700">🎯 Objectif : 50 avis</div>
        <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600" style={{ width: `${Math.min(100, Math.round(((reviews?.length || 0)/50)*100))}%` }} />
        </div>
      </div>
    </>
  );
}


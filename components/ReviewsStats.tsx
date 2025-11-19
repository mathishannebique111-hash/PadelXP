"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
      <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className={`rounded-xl sm:rounded-2xl bg-white p-4 sm:p-5 shadow-[0_30px_70px_rgba(4,16,46,0.35)] border border-white/10 hover:shadow-[0_30px_70px_rgba(4,16,46,0.45)] transition-all ${loading ? 'opacity-75' : ''}`}>
          <div className="text-xs sm:text-sm text-slate-600 font-medium mb-2 flex items-center gap-2 uppercase tracking-[0.05em]">
            Avis
            {loading && <span className="text-xs text-blue-500 animate-pulse font-normal normal-case">Mise à jour...</span>}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 transition-all tabular-nums">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-pulse">...</span>
              </span>
            ) : (
              <span className="animate-fade-in">{reviews?.length || 0}</span>
            )}
          </div>
        </div>
        <div className={`rounded-xl sm:rounded-2xl bg-white p-4 sm:p-5 shadow-[0_30px_70px_rgba(4,16,46,0.35)] border border-white/10 hover:shadow-[0_30px_70px_rgba(4,16,46,0.45)] transition-all ${loading ? 'opacity-75' : ''}`}>
          <div className="text-xs sm:text-sm text-slate-600 font-medium mb-2 flex items-center gap-2 uppercase tracking-[0.05em]">
            Note moyenne
            {loading && <span className="text-xs text-yellow-500 animate-pulse font-normal normal-case">Mise à jour...</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 transition-all tabular-nums">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <span className="animate-fade-in">{averageRating > 0 ? averageRating.toFixed(1) : "—"}</span>
              )}
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => (
                <span 
                  key={n} 
                  className={`${n <= Math.round(averageRating) ? 'text-[#FFD700] drop-shadow-[0_0_4px_rgba(255,215,0,0.6)]' : 'text-slate-300'} text-lg sm:text-xl transition-all`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESSION COMMUNAUTAIRE */}
      <div className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-sm p-4 sm:p-5 border border-white/10 shadow-[0_20px_50px_rgba(4,16,46,0.25)]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs sm:text-sm text-slate-700 font-medium uppercase tracking-[0.05em] flex items-center gap-1.5">
            <Image 
              src="/images/Objectif page avis.png" 
              alt="Objectif" 
              width={16} 
              height={16} 
              className="flex-shrink-0"
              unoptimized
            />
            <span>Objectif : 50 avis</span>
          </div>
          <div className="text-xs text-slate-500 tabular-nums hidden sm:block">
            {Math.min(100, Math.round(((reviews?.length || 0)/50)*100))}%
          </div>
        </div>
        <div className="h-2.5 sm:h-3 w-full rounded-full bg-slate-200/60 overflow-hidden">
          <div 
            className="h-full rounded-full bg-[#10B981] shadow-sm" 
            style={{ width: `${Math.min(100, Math.round(((reviews?.length || 0)/50)*100))}%` }} 
          />
        </div>
      </div>
    </>
  );
}


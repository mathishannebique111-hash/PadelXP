"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface ReviewsStatsProps {
  initialReviews?: any[];
  initialAverageRating?: number;
}

interface RewardStatus {
  goalReached: boolean;
  totalReviews: number;
  isEligible: boolean;
  hasClaimed: boolean;
  canClaim: boolean;
}

export default function ReviewsStats({ 
  initialReviews = [], 
  initialAverageRating = 0,
}: ReviewsStatsProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [averageRating, setAverageRating] = useState(initialAverageRating);
  const [loading, setLoading] = useState(false);
  const [rewardStatus, setRewardStatus] = useState<RewardStatus | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Synchroniser l'état initial avec les props au montage
  useEffect(() => {
    setReviews(initialReviews);
    setAverageRating(initialAverageRating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charger le statut de la récompense
  useEffect(() => {
    const loadRewardStatus = async () => {
      try {
        const response = await fetch("/api/reviews/reward-status");
        if (response.ok) {
          const data = await response.json();
          setRewardStatus(data);
        }
      } catch (error) {
        console.error("Error loading reward status:", error);
      }
    };

    loadRewardStatus();
  }, []);

  // Recharger le statut après soumission d'avis
  useEffect(() => {
    const handleReviewSubmitted = async () => {
      try {
        const response = await fetch("/api/reviews/reward-status");
        if (response.ok) {
          const data = await response.json();
          setRewardStatus(data);
        }
      } catch (error) {
        console.error("Error reloading reward status:", error);
      }
    };

    window.addEventListener("reviewSubmitted", handleReviewSubmitted as EventListener);
    return () => {
      window.removeEventListener("reviewSubmitted", handleReviewSubmitted as EventListener);
    };
  }, []);

  const handleClaimReward = async () => {
    if (claiming || !rewardStatus?.canClaim) return;

    setClaiming(true);
    try {
      const response = await fetch("/api/reviews/claim-free-boost", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Recharger le statut
        const statusResponse = await fetch("/api/reviews/reward-status");
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setRewardStatus(statusData);
        }
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
    } finally {
      setClaiming(false);
    }
  };

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
        <div className="h-2.5 sm:h-3 w-full rounded-full bg-slate-200/60 overflow-hidden mb-4">
          <div 
            className="h-full rounded-full bg-[#10B981] shadow-sm" 
            style={{ width: `${Math.min(100, Math.round(((reviews?.length || 0)/50)*100))}%` }} 
          />
        </div>

        {/* Cadre de récompense */}
        <div className="rounded-lg border border-yellow-400/40 bg-gradient-to-br from-yellow-500/15 to-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Image 
              src="/images/Éclair boost.png" 
              alt="Boost" 
              width={24} 
              height={24} 
              className="flex-shrink-0 mt-0.5"
              unoptimized
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900 mb-1">
                1 boost gratuit offert
              </div>
              <div className="text-xs text-slate-700 mb-3">
                Tous les joueurs ayant laissé un avis avant l'atteinte de l'objectif recevront 1 boost gratuit pour avoir participé à cette réussite communautaire !
              </div>
              
              {/* Bouton de réclamation ou statut */}
              {rewardStatus && (
                <>
                  {rewardStatus.goalReached && rewardStatus.isEligible && !rewardStatus.hasClaimed && (
                    <button
                      onClick={handleClaimReward}
                      disabled={claiming}
                      className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {claiming ? "Récupération..." : "Récupérer mon boost gratuit"}
                    </button>
                  )}
                  {rewardStatus.goalReached && rewardStatus.isEligible && rewardStatus.hasClaimed && (
                    <div className="flex items-center gap-2 text-xs text-green-700 font-medium">
                      <span>✅</span>
                      <span>Boost gratuit réclamé !</span>
                    </div>
                  )}
                  {rewardStatus.goalReached && !rewardStatus.isEligible && (
                    <div className="text-xs text-slate-600">
                      Vous n'êtes pas éligible pour cette récompense. Seuls les joueurs ayant laissé un avis avant l'atteinte de l'objectif peuvent réclamer le boost.
                    </div>
                  )}
                  {!rewardStatus.goalReached && (
                    <div className="text-xs text-slate-600">
                      L'objectif n'est pas encore atteint. Continuez à laisser des avis pour débloquer cette récompense !
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


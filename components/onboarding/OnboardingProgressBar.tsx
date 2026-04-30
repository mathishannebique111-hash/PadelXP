"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, ChevronRight, Gift, Check, X } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import OnboardingStepsPopup from "./OnboardingStepsPopup";

const STEP_LABELS: Record<number, string> = {
  2: "Évalue ton niveau",
  3: "Enregistre ton premier match",
};

export default function OnboardingProgressBar() {
  const { isComplete, currentStep, steps, markRewardClaimed } = useOnboarding();
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Fully done: all steps complete AND reward claimed → hide bar
  if (isComplete && steps.rewardClaimed) return null;
  // Not started yet or loading
  if (!isComplete && currentStep <= 1) return null;

  const completed = isComplete ? 3 : currentStep - 1;
  const percentage = isComplete ? 100 : Math.round((completed / 3) * 100);

  const isClub = typeof window !== "undefined" && !!document.body.dataset.clubSubdomain;

  // Completed state: green bar, waiting for user to claim reward
  const isWaitingClaim = isComplete && !steps.rewardClaimed;

  const handleClick = () => {
    if (isWaitingClaim) {
      setShowRewardPopup(true);
    } else {
      setShowPopup(true);
    }
  };

  const handleClaimReward = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/player/onboarding-reward", { method: "POST", credentials: "include" });
      if (res.ok) {
        markRewardClaimed();
        setShowRewardPopup(false);
        // Refresh server components to update points in PlayerSummary/leaderboard
        router.refresh();
      } else {
        console.error("[OnboardingProgressBar] Reward API failed", res.status);
      }
    } catch (e) {
      console.error("[OnboardingProgressBar] Reward API error", e);
    }
    setClaiming(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="block w-full mb-4 sm:mb-6 animate-in slide-in-from-top-4 fade-in duration-500 group relative text-left"
      >
        {/* Glow */}
        <div
          className="absolute inset-0 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ backgroundColor: isWaitingClaim ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.08)" }}
        />

        <div
          className={`relative z-10 p-2.5 sm:p-3 rounded-xl border transition-all duration-300 ${
            isWaitingClaim
              ? "border-emerald-400/30 bg-emerald-500/[0.08] backdrop-blur-sm group-hover:bg-emerald-500/[0.14] group-hover:border-emerald-400/40"
              : !isClub
                ? "border-blue-400/20 bg-blue-500/[0.06] backdrop-blur-sm group-hover:bg-blue-500/[0.1] group-hover:border-blue-400/30"
                : ""
          }`}
          style={
            !isWaitingClaim && isClub
              ? { borderColor: "rgb(var(--theme-accent))", backgroundColor: "rgb(var(--theme-accent))" }
              : {}
          }
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex flex-shrink-0 items-center justify-center w-6 h-6 rounded-full border ${
                    isWaitingClaim
                      ? "bg-emerald-500/20 border-emerald-400/30"
                      : !isClub ? "bg-blue-500/10 border-blue-400/20" : ""
                  }`}
                  style={
                    !isWaitingClaim && isClub
                      ? { backgroundColor: "transparent", color: "rgb(var(--theme-page))", borderColor: "rgba(var(--theme-page), 0.3)" }
                      : {}
                  }
                >
                  {isWaitingClaim ? (
                    <Gift size={11} strokeWidth={2.5} className="text-emerald-400" />
                  ) : (
                    <Rocket
                      size={11}
                      strokeWidth={2.5}
                      className={!isClub ? "text-blue-400" : ""}
                      style={isClub ? { color: "rgb(var(--theme-page))" } : {}}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isWaitingClaim
                        ? "text-emerald-300/70"
                        : !isClub ? "text-blue-300/60" : ""
                    }`}
                    style={!isWaitingClaim && isClub ? { color: "rgb(var(--theme-page))" } : {}}
                  >
                    {isWaitingClaim ? "Onboarding terminé !" : `Étape ${currentStep}/3`}
                  </span>
                  <span
                    className={`block text-xs sm:text-sm truncate transition-colors duration-300 ${
                      isWaitingClaim
                        ? "font-bold text-emerald-300 group-hover:text-emerald-200"
                        : !isClub ? "font-medium text-white/90 group-hover:text-white" : "font-bold"
                    }`}
                    style={!isWaitingClaim && isClub ? { color: "rgb(var(--theme-page))" } : {}}
                  >
                    {isWaitingClaim ? "Récupère tes +20 points !" : (STEP_LABELS[currentStep] || "Complète ton profil")}
                  </span>
                </div>
              </div>
              {isWaitingClaim ? (
                <div className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                  <span className="text-[10px] font-bold text-emerald-300">+20 pts</span>
                </div>
              ) : (
                <ChevronRight
                  size={16}
                  className={`flex-shrink-0 ${!isClub ? "text-white/20 group-hover:text-white/70" : "opacity-70 group-hover:opacity-100"}`}
                  style={isClub ? { color: "rgb(var(--theme-page))" } : {}}
                />
              )}
            </div>

            {/* Progress bar */}
            <div
              className={`h-1.5 w-full rounded-full overflow-hidden border ${
                isWaitingClaim
                  ? "h-1 bg-black/40 border-emerald-500/10"
                  : !isClub ? "h-1 bg-black/40 border-white/[0.02]" : ""
              }`}
              style={
                !isWaitingClaim && isClub
                  ? { backgroundColor: "rgba(var(--theme-page), 0.2)", borderColor: "rgb(var(--theme-page))" }
                  : {}
              }
            >
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: isWaitingClaim ? "#10b981" : (isClub ? "rgb(var(--theme-page))" : "#3b82f6"),
                  boxShadow: isWaitingClaim ? "0 0 12px rgba(16, 185, 129, 0.6)" : (isClub ? "none" : "0 0 12px rgba(59, 130, 246, 0.6)"),
                }}
              >
                {!isClub && <div className="absolute inset-0 bg-white/10" />}
              </div>
            </div>
          </div>
        </div>
      </button>

      {showPopup && <OnboardingStepsPopup onClose={() => setShowPopup(false)} />}

      {/* Reward claim popup */}
      {showRewardPopup && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          onClick={() => setShowRewardPopup(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div
            className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0a1a4a] p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowRewardPopup(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-white/40 hover:text-white/80 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center mb-4">
                <Gift size={28} className="text-emerald-400" />
              </div>

              <h3 className="text-lg font-bold text-white mb-1">Onboarding terminé !</h3>
              <p className="text-sm text-white/60 mb-5">
                Tu as complété toutes les étapes. Récupère ta récompense de bienvenue.
              </p>

              <div className="w-full rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-4 mb-5">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-emerald-400">+20</span>
                  <span className="text-sm font-semibold text-emerald-300/80">points</span>
                </div>
              </div>

              <button
                onClick={handleClaimReward}
                disabled={claiming}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {claiming ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} />
                    Récupérer mes points
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

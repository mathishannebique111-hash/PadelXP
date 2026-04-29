"use client";

import { useState, useEffect } from "react";
import { Rocket, ChevronRight } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import OnboardingStepsPopup from "./OnboardingStepsPopup";

const STEP_LABELS: Record<number, string> = {
  2: "Évalue ton niveau",
  3: "Enregistre ton premier match",
};

export default function OnboardingProgressBar() {
  const { isComplete, loading, currentStep, refreshOnboarding } = useOnboarding();
  const [showPopup, setShowPopup] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);

  // When onboarding just completed, show 100% briefly then hide
  useEffect(() => {
    if (isComplete && !pointsAwarded) {
      setShowCompleted(true);
      setPointsAwarded(true);

      // Award 20 bonus points
      (async () => {
        try {
          await fetch("/api/player/onboarding-reward", { method: "POST", credentials: "include" });
        } catch { /* non-blocking */ }
      })();

      // Hide after 3 seconds
      setTimeout(() => {
        setShowCompleted(false);
      }, 3000);
    }
  }, [isComplete, pointsAwarded]);

  if (isComplete && !showCompleted) return null;

  const completed = isComplete ? 3 : currentStep - 1;
  const percentage = isComplete ? 100 : Math.round((completed / 3) * 100);
  const label = isComplete ? "Onboarding terminé ! +20 points" : (STEP_LABELS[currentStep] || "Complète ton profil");

  const isClub = typeof window !== "undefined" && !!document.body.dataset.clubSubdomain;

  return (
    <>
      <button
        onClick={() => !isComplete && setShowPopup(true)}
        className="block w-full mb-4 sm:mb-6 animate-in slide-in-from-top-4 fade-in duration-500 group relative text-left"
      >
        {/* Glow */}
        <div
          className="absolute inset-0 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ backgroundColor: isComplete ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.08)" }}
        />

        {/* Frame — more prominent than ChallengeHighlightBar */}
        <div
          className={`relative z-10 p-2.5 sm:p-3 rounded-xl border transition-all duration-300 ${
            !isClub
              ? "border-blue-400/20 bg-blue-500/[0.06] backdrop-blur-sm group-hover:bg-blue-500/[0.1] group-hover:border-blue-400/30"
              : ""
          }`}
          style={
            isClub
              ? {
                  borderColor: "rgb(var(--theme-accent))",
                  backgroundColor: "rgb(var(--theme-accent))",
                }
              : {}
          }
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex flex-shrink-0 items-center justify-center w-6 h-6 rounded-full border ${
                    !isClub ? "bg-blue-500/10 border-blue-400/20" : ""
                  }`}
                  style={
                    isClub
                      ? { backgroundColor: "transparent", color: "rgb(var(--theme-page))", borderColor: "rgba(var(--theme-page), 0.3)" }
                      : {}
                  }
                >
                  <Rocket
                    size={11}
                    strokeWidth={2.5}
                    className={!isClub ? "text-blue-400" : ""}
                    style={isClub ? { color: "rgb(var(--theme-page))" } : {}}
                  />
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      !isClub ? "text-blue-300/60" : ""
                    }`}
                    style={isClub ? { color: "rgb(var(--theme-page))" } : {}}
                  >
                    Étape {currentStep}/3
                  </span>
                  <span
                    className={`block text-xs sm:text-sm truncate transition-colors duration-300 ${
                      !isClub ? "font-medium text-white/90 group-hover:text-white" : "font-bold"
                    }`}
                    style={isClub ? { color: "rgb(var(--theme-page))" } : {}}
                  >
                    {label}
                  </span>
                </div>
              </div>
              <ChevronRight
                size={16}
                className={`flex-shrink-0 ${!isClub ? "text-white/20 group-hover:text-white/70" : "opacity-70 group-hover:opacity-100"}`}
                style={isClub ? { color: "rgb(var(--theme-page))" } : {}}
              />
            </div>

            {/* Progress bar */}
            <div
              className={`h-1.5 w-full rounded-full overflow-hidden border ${
                !isClub ? "h-1 bg-black/40 border-white/[0.02]" : ""
              }`}
              style={
                isClub
                  ? { backgroundColor: "rgba(var(--theme-page), 0.2)", borderColor: "rgb(var(--theme-page))" }
                  : {}
              }
            >
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: isClub ? "rgb(var(--theme-page))" : "#3b82f6",
                  boxShadow: isClub ? "none" : "0 0 12px rgba(59, 130, 246, 0.6)",
                }}
              >
                {!isClub && <div className="absolute inset-0 bg-white/10" />}
              </div>
            </div>
          </div>
        </div>
      </button>

      {showPopup && <OnboardingStepsPopup onClose={() => setShowPopup(false)} />}
    </>
  );
}

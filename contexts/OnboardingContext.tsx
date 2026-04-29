"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { OnboardingStatus } from "@/lib/onboarding";

interface OnboardingState {
  steps: OnboardingStatus;
  isComplete: boolean;
  loading: boolean;
  currentStep: number;
  refreshOnboarding: () => Promise<void>;
  markFirstMatchPlayed: () => void;
}

function computeStep(s: OnboardingStatus): number {
  if (!s.levelEvaluated) return 2;
  if (!s.firstMatchPlayed) return 3;
  return 4;
}

const defaultStatus: OnboardingStatus = { accountCreated: true, levelEvaluated: false, firstMatchPlayed: false };

const OnboardingCtx = createContext<OnboardingState>({
  steps: defaultStatus,
  isComplete: false,
  loading: false,
  currentStep: 2,
  refreshOnboarding: async () => {},
  markFirstMatchPlayed: () => {},
});

export function OnboardingProvider({
  children,
  initialStatus,
}: {
  children: ReactNode;
  initialStatus?: OnboardingStatus | null;
}) {
  const [steps, setSteps] = useState<OnboardingStatus>(initialStatus ?? defaultStatus);

  const isComplete = steps.accountCreated && steps.levelEvaluated && steps.firstMatchPlayed;
  const currentStep = computeStep(steps);

  const refreshOnboarding = useCallback(async () => {
    try {
      const res = await fetch("/api/player/onboarding-status", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const data: OnboardingStatus = await res.json();
        // Merge: steps can only go forward (true), never revert to false
        setSteps(prev => ({
          accountCreated: prev.accountCreated || data.accountCreated,
          levelEvaluated: prev.levelEvaluated || data.levelEvaluated,
          firstMatchPlayed: prev.firstMatchPlayed || data.firstMatchPlayed,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const markFirstMatchPlayed = useCallback(() => {
    setSteps(prev => ({ ...prev, firstMatchPlayed: true }));
  }, []);

  // Always fetch client-side to get fresh data (server cache may be stale)
  useEffect(() => {
    refreshOnboarding();
  }, [refreshOnboarding]);

  return (
    <OnboardingCtx.Provider value={{ steps, isComplete, loading: false, currentStep, refreshOnboarding, markFirstMatchPlayed }}>
      {children}
    </OnboardingCtx.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingCtx);
}

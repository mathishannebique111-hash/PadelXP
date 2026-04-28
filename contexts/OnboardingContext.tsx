"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { OnboardingStatus } from "@/lib/onboarding";

interface OnboardingState {
  steps: OnboardingStatus;
  isComplete: boolean;
  loading: boolean;
  currentStep: number;
  refreshOnboarding: () => Promise<void>;
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
      const res = await fetch("/api/player/onboarding-status", { credentials: "include" });
      if (res.ok) {
        const data: OnboardingStatus = await res.json();
        setSteps(data);
      }
    } catch { /* ignore */ }
  }, []);

  // If no initialStatus provided, fetch client-side
  useEffect(() => {
    if (!initialStatus) {
      refreshOnboarding();
    }
  }, [initialStatus, refreshOnboarding]);

  return (
    <OnboardingCtx.Provider value={{ steps, isComplete, loading: false, currentStep, refreshOnboarding }}>
      {children}
    </OnboardingCtx.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingCtx);
}

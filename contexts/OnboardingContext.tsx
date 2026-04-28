"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { OnboardingStatus } from "@/lib/onboarding";

interface OnboardingState {
  steps: OnboardingStatus;
  isComplete: boolean;
  loading: boolean;
  /** 1-based: which step the user is currently on */
  currentStep: number;
  refreshOnboarding: () => Promise<void>;
}

const STORAGE_KEY = "padelxp.onboarding.complete";

function computeStep(s: OnboardingStatus): number {
  // Step 1 = account created (always done)
  if (!s.levelEvaluated) return 2;
  if (!s.firstMatchPlayed) return 3;
  return 4; // all done
}

const defaultStatus: OnboardingStatus = { accountCreated: true, levelEvaluated: false, firstMatchPlayed: false };

const OnboardingCtx = createContext<OnboardingState>({
  steps: defaultStatus,
  isComplete: false,
  loading: true,
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
  const [loading, setLoading] = useState(!initialStatus);

  // Check localStorage for cached completion
  const [cachedComplete, setCachedComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(STORAGE_KEY) === "true";
      setCachedComplete(cached);
      if (cached) {
        setSteps({ accountCreated: true, levelEvaluated: true, firstMatchPlayed: true });
        setLoading(false);
      }
    }
  }, []);

  const isComplete = steps.accountCreated && steps.levelEvaluated && steps.firstMatchPlayed;
  const currentStep = computeStep(steps);

  // Persist completion to localStorage
  useEffect(() => {
    if (isComplete && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, [isComplete]);

  const refreshOnboarding = useCallback(async () => {
    try {
      const res = await fetch("/api/player/onboarding-status", { credentials: "include" });
      if (res.ok) {
        const data: OnboardingStatus = await res.json();
        setSteps(data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // If no initialStatus and not cached complete, fetch client-side
  useEffect(() => {
    if (!initialStatus && cachedComplete === false) {
      refreshOnboarding();
    }
  }, [initialStatus, cachedComplete, refreshOnboarding]);

  // isComplete: true only if localStorage says so OR actual steps are all done
  const resolvedComplete = cachedComplete === true || isComplete;

  return (
    <OnboardingCtx.Provider value={{ steps, isComplete: resolvedComplete, loading: false, currentStep, refreshOnboarding }}>
      {children}
    </OnboardingCtx.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingCtx);
}

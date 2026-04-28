"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Intercepts the Android hardware back button in Capacitor.
 * - If there's history, goes back to the previous page.
 * - If no history (root page), does nothing (prevents app from closing).
 */
export default function BackButtonHandler() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        // Only run in Capacitor native app
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");

        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            router.back();
          }
          // If can't go back, do nothing (don't close the app)
        });

        cleanup = () => {
          listener.remove();
        };
      } catch {
        // Not in Capacitor or plugin not available
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [router]);

  return null;
}

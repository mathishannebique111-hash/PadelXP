"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Silently re-fetches server component data on an interval */
export default function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}

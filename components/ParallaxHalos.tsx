"use client";

import { useEffect, useRef } from "react";

function getScrollY(): number {
  if (typeof window === "undefined") return 0;
  const se = document.scrollingElement || document.documentElement || document.body;
  return se ? se.scrollTop : window.scrollY || 0;
}

export default function ParallaxHalos() {
  const haloTopRef = useRef<HTMLDivElement | null>(null);
  const haloBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const y = getScrollY();
      const topTranslate = Math.min(160, y * 0.18);
      const bottomTranslate = Math.max(-160, -y * 0.15);

      if (haloTopRef.current) {
        haloTopRef.current.style.transform = `translate3d(${topTranslate * -0.25}px, ${topTranslate}px, 0) scale(1.08)`;
        haloTopRef.current.style.opacity = "0.38";
      }
      if (haloBottomRef.current) {
        haloBottomRef.current.style.transform = `translate3d(${bottomTranslate * 0.25}px, ${bottomTranslate}px, 0) scale(1.08)`;
        haloBottomRef.current.style.opacity = "0.36";
      }
    };

    const onAnyScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        update();
        raf = 0;
      });
    };

    // Attach to multiple potential scroll targets (window, document, scrollingElement)
    const targets: Array<EventTarget | null> = [
      typeof window !== "undefined" ? window : null,
      typeof document !== "undefined" ? document : null,
      typeof document !== "undefined" ? document.scrollingElement : null,
      typeof document !== "undefined" ? document.documentElement : null,
      typeof document !== "undefined" ? document.body : null,
    ];
    targets.forEach((t) => t?.addEventListener("scroll", onAnyScroll as EventListener, { passive: true } as any));

    // Initial paint
    update();

    return () => {
      targets.forEach((t) => t?.removeEventListener("scroll", onAnyScroll as EventListener));
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={haloTopRef}
        aria-hidden
        className="fixed -top-24 -right-24 h-[460px] w-[460px] rounded-full bg-blue-500/40 blur-[90px] will-change-transform"
      />
      <div
        ref={haloBottomRef}
        aria-hidden
        className="fixed -bottom-28 -left-28 h-[400px] w-[400px] rounded-full bg-indigo-500/40 blur-[90px] will-change-transform"
      />
    </>
  );
}



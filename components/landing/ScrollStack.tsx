"use client";

import { useLayoutEffect, useRef, ReactNode } from "react";
import "./ScrollStack.css";

// ─── ScrollStackItem ──────────────────────────────────────────────────────────

interface ScrollStackItemProps {
  children: ReactNode;
  itemClassName?: string;
}

export const ScrollStackItem = ({ children, itemClassName = "" }: ScrollStackItemProps) => (
  <div className={`scroll-stack-card relative overflow-hidden ${itemClassName}`.trim()}>{children}</div>
);

// ─── ScrollStack ──────────────────────────────────────────────────────────────

interface ScrollStackProps {
  children: ReactNode;
  className?: string;
  /** Vertical offset (px) between stacked cards so you see the ones below */
  itemStackDistance?: number;
  /** How far from the top of the viewport cards stick (e.g. "8vh") */
  stackPosition?: string;
  /** Scale reduction per card that has been stacked on top of it */
  itemScale?: number;
  /** Minimum scale a card can shrink to */
  baseScale?: number;
  /** Extra scroll height (px) added after each card — "dwell" time before next card */
  itemDistance?: number;
  // legacy props — accepted but unused, kept for API compat
  scaleEndPosition?: string | number;
  scaleDuration?: number;
  rotationAmount?: number;
  blurAmount?: number;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
}

const ScrollStack = ({
  children,
  className = "",
  itemStackDistance = 16,
  stackPosition = "8vh",
  itemScale = 0.05,
  baseScale = 0.85,
  itemDistance = 0,
}: ScrollStackProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>(":scope > .scroll-stack-card"));

    // Compute sticky top in px from the stackPosition string (e.g. "8vh")
    const getStickyTopPx = (index: number) => {
      let basePx = 0;
      if (typeof stackPosition === "string" && stackPosition.endsWith("vh")) {
        basePx = (parseFloat(stackPosition) / 100) * window.innerHeight;
      } else {
        basePx = parseFloat(stackPosition as string);
      }
      return basePx + itemStackDistance * index;
    };

    // Apply sticky positioning + z-index per card
    cards.forEach((card, i) => {
      card.style.position = "sticky";
      card.style.top = `${getStickyTopPx(i)}px`;
      card.style.zIndex = String(10 + i);
      card.style.transformOrigin = "top center";
      card.style.willChange = "transform";
      if (itemDistance > 0 && i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
    });

    const onScroll = () => {
      cards.forEach((card, i) => {
        const stickyTop = getStickyTopPx(i);
        const rect = card.getBoundingClientRect();
        const isStuck = rect.top <= stickyTop + 1;

        if (!isStuck) {
          card.style.transform = "scale(1)";
          card.style.opacity = "1";
          return;
        }

        // Count how many subsequent cards are also stuck (on top of this one)
        let cardsOnTop = 0;
        for (let j = i + 1; j < cards.length; j++) {
          const jStickyTop = getStickyTopPx(j);
          const jRect = cards[j].getBoundingClientRect();
          if (jRect.top <= jStickyTop + 1) cardsOnTop++;
        }

        const scale = Math.max(baseScale, 1 - cardsOnTop * itemScale);
        card.style.transform = `scale(${scale})`;
        card.style.opacity = cardsOnTop >= 3 ? "0.4" : cardsOnTop >= 2 ? "0.65" : cardsOnTop >= 1 ? "0.85" : "1";
      });
    };

    const onResize = () => {
      cards.forEach((card, i) => {
        card.style.top = `${getStickyTopPx(i)}px`;
      });
      onScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [itemStackDistance, stackPosition, itemScale, baseScale, itemDistance]);

  return (
    <div ref={containerRef} className={`scroll-stack-container ${className}`.trim()}>
      {children}
    </div>
  );
};

export default ScrollStack;

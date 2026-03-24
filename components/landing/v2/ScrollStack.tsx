"use client";

import { useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import './ScrollStack.css';

export const ScrollStackItem = ({
  children,
  itemClassName = '',
}: {
  children: React.ReactNode;
  itemClassName?: string;
}) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
);

interface ScrollStackProps {
  children: React.ReactNode;
  className?: string;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  scaleEndPosition?: string;
  baseScale?: number;
  scaleDuration?: number;
  rotationAmount?: number;
  blurAmount?: number;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
}

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  scaleDuration = 0.5,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onStackComplete,
}: ScrollStackProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stackCompletedRef = useRef(false);
  const animationFrameRef = useRef<number>(0);
  const lenisRef = useRef<Lenis | null>(null);
  const cardsRef = useRef<Element[]>([]);
  const lastTransformsRef = useRef(new Map<number, { translateY: number; scale: number; rotation: number; blur: number }>());
  const isUpdatingRef = useRef(false);

  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  const parsePercentage = useCallback((value: string, containerHeight: number) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }, []);

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return {
        scrollTop: window.scrollY,
        containerHeight: window.innerHeight,
      };
    } else {
      const scroller = scrollerRef.current!;
      return {
        scrollTop: scroller.scrollTop,
        containerHeight: scroller.clientHeight,
      };
    }
  }, [useWindowScroll]);

  const getElementOffset = useCallback(
    (element: Element) => {
      if (useWindowScroll) {
        const rect = element.getBoundingClientRect();
        return rect.top + window.scrollY;
      } else {
        return (element as HTMLElement).offsetTop;
      }
    },
    [useWindowScroll]
  );

  const updateCardTransforms = useCallback(() => {
    if (!cardsRef.current.length || isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    const { scrollTop, containerHeight } = getScrollData();
    const stackPositionPx = parsePercentage(stackPosition, containerHeight);
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);

    const endElement = useWindowScroll
      ? document.querySelector('.scroll-stack-end')
      : scrollerRef.current?.querySelector('.scroll-stack-end');
    const endElementTop = endElement ? getElementOffset(endElement) : 0;

    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      const el = card as HTMLElement;
      const cardTop = getElementOffset(card);
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

      let blur = 0;
      if (blurAmount) {
        let topCardIndex = 0;
        for (let j = 0; j < cardsRef.current.length; j++) {
          const jCardTop = getElementOffset(cardsRef.current[j]);
          const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
          if (scrollTop >= jTriggerStart) topCardIndex = j;
        }
        if (i < topCardIndex) blur = Math.max(0, (topCardIndex - i) * blurAmount);
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100,
      };

      const lastTransform = lastTransformsRef.current.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        el.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        el.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';
        lastTransformsRef.current.set(i, newTransform);
      }

      if (i === cardsRef.current.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });

    isUpdatingRef.current = false;
  }, [itemScale, itemStackDistance, stackPosition, scaleEndPosition, baseScale, rotationAmount, blurAmount, useWindowScroll, onStackComplete, calculateProgress, parsePercentage, getScrollData, getElementOffset]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll('.scroll-stack-card')
        : scroller.querySelectorAll('.scroll-stack-card')
    );
    cardsRef.current = cards;

    cards.forEach((card, i) => {
      const el = card as HTMLElement;
      if (i < cards.length - 1) el.style.marginBottom = `${itemDistance}px`;
      el.style.willChange = 'transform, filter';
      el.style.transformOrigin = 'top center';
      el.style.backfaceVisibility = 'hidden';
      el.style.transform = 'translateZ(0)';
    });

    const handleScroll = () => updateCardTransforms();

    let lenis: Lenis;
    let raf: number;

    if (useWindowScroll) {
      lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      lenis.on('scroll', handleScroll);
      const tick = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    } else {
      lenis = new Lenis({
        wrapper: scroller,
        content: scroller.querySelector('.scroll-stack-inner') as HTMLElement,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', handleScroll);
      const tick = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }

    lenisRef.current = lenis;
    animationFrameRef.current = raf;
    updateCardTransforms();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      lenisRef.current?.destroy();
      stackCompletedRef.current = false;
      cardsRef.current = [];
      lastTransformsRef.current.clear();
      isUpdatingRef.current = false;
    };
  }, [itemDistance, itemScale, itemStackDistance, stackPosition, scaleEndPosition, baseScale, scaleDuration, rotationAmount, blurAmount, useWindowScroll, onStackComplete, updateCardTransforms]);

  return (
    <div className={`scroll-stack-scroller ${useWindowScroll ? 'scroll-stack-scroller--window' : ''} ${className}`.trim()} ref={scrollerRef}>
      <div className={`scroll-stack-inner ${useWindowScroll ? 'scroll-stack-inner--window' : ''}`.trim()}>
        {children}
        <div className="scroll-stack-end" />
      </div>
    </div>
  );
};

export default ScrollStack;

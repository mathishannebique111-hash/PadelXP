'use client';

import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import gsap from 'gsap';
import './CardSwap.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ customClass, className, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={`card ${customClass ?? ''} ${className ?? ''}`.trim()}
    />
  )
);
Card.displayName = 'Card';

const makeSlot = (i: number, distX: number, distY: number, total: number) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
});

const placeNow = (
  el: HTMLElement,
  slot: ReturnType<typeof makeSlot>,
  skew: number
) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  });

interface CardSwapProps {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  autoplay?: boolean;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  swapOnClick?: boolean;
  skewAmount?: number;
  easing?: 'elastic' | 'smooth';
  children: React.ReactNode;
}

const CardSwap = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  autoplay = true,
  onCardClick,
  swapOnClick = false,
  skewAmount = 6,
  easing = 'elastic',
  children,
}: CardSwapProps) => {
  const config =
    easing === 'elastic'
      ? {
          ease: 'elastic.out(0.6,0.9)',
          durDrop: 2,
          durMove: 2,
          durReturn: 2,
          promoteOverlap: 0.9,
          returnDelay: 0.05,
        }
      : {
          ease: 'power1.inOut',
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2,
        };

  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => React.createRef<HTMLDivElement>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length]
  );

  const order = useRef<number[]>(
    Array.from({ length: childArr.length }, (_, i) => i)
  );
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const container = useRef<HTMLDivElement>(null);
  const swapRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const total = refs.length;
    refs.forEach((r, i) =>
      placeNow(r.current!, makeSlot(i, cardDistance, verticalDistance, total), skewAmount)
    );

    const swap = () => {
      if (order.current.length < 2) return;

      // Kill any running animation and snap all cards to their current slots instantly
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
        // Snap every card to its slot based on current order
        order.current.forEach((idx, i) => {
          const el = refs[idx].current!;
          const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
          gsap.set(el, { x: slot.x, y: slot.y, z: slot.z, zIndex: slot.zIndex });
        });
      }

      const [front, ...rest] = order.current;
      // Update order immediately so rapid clicks always use the latest state
      order.current = [...rest, front];
      const elFront = refs[front].current!;
      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(elFront, {
        y: '+=500',
        duration: config.durDrop,
        ease: config.ease,
      });

      tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);
      rest.forEach((idx, i) => {
        const el = refs[idx].current!;
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(
          el,
          { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease },
          `promote+=${i * 0.15}`
        );
      });

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
      tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
      tl.call(() => { gsap.set(elFront, { zIndex: backSlot.zIndex }); }, undefined, 'return');
      tl.to(
        elFront,
        { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease },
        'return'
      );
      // order already updated above
    };

    swapRef.current = swap;
    if (autoplay) {
      swap();
      intervalRef.current = window.setInterval(swap, delay);
    }

    if (pauseOnHover) {
      const node = container.current!;
      const pause = () => {
        tlRef.current?.pause();
        clearInterval(intervalRef.current);
      };
      const resume = () => {
        tlRef.current?.play();
        intervalRef.current = window.setInterval(swap, delay);
      };
      node.addEventListener('mouseenter', pause);
      node.addEventListener('mouseleave', resume);
      return () => {
        node.removeEventListener('mouseenter', pause);
        node.removeEventListener('mouseleave', resume);
        clearInterval(intervalRef.current);
      };
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child as React.ReactElement<CardProps & { ref?: React.Ref<HTMLDivElement> }>, {
          key: i,
          ref: refs[i],
          style: { width, height, ...((child.props as CardProps).style ?? {}) },
          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            (child.props as CardProps).onClick?.(e);
            onCardClick?.(i);
            if (swapOnClick && swapRef.current) {
              clearInterval(intervalRef.current);
              swapRef.current();
              if (autoplay) {
                intervalRef.current = window.setInterval(swapRef.current, delay);
              }
            }
          },
        })
      : child
  );

  return (
    <div ref={container} className="card-swap-container" style={{ width, height }}>
      {rendered}
    </div>
  );
};

export default CardSwap;

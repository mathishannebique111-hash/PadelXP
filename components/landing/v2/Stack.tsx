'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './Stack.css';

export interface StackRef {
  next: () => void;
}

// Handles drag tilt only — no stack position
interface DragWrapperProps {
  children: React.ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  disableDrag?: boolean;
}

function DragWrapper({ children, onSendToBack, sensitivity, disableDrag = false }: DragWrapperProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_: unknown, info: { offset: { x: number; y: number } }) {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) {
      x.set(0);
      y.set(0);
      onSendToBack();
    } else {
      x.set(0);
      y.set(0);
    }
  }

  if (disableDrag) {
    return <div className="drag-fill">{children}</div>;
  }

  return (
    <motion.div
      className="drag-fill drag-cursor"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

interface StackProps {
  randomRotation?: boolean;
  sensitivity?: number;
  cards?: React.ReactNode[];
  animationConfig?: { stiffness: number; damping: number };
  sendToBackOnClick?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  mobileClickOnly?: boolean;
  mobileBreakpoint?: number;
}

const Stack = forwardRef<StackRef, StackProps>(function Stack({
  randomRotation = false,
  sensitivity = 200,
  cards = [],
  animationConfig = { stiffness: 260, damping: 20 },
  sendToBackOnClick = false,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  mobileClickOnly = false,
  mobileBreakpoint = 768,
}: StackProps, ref) {
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  const shouldDisableDrag = mobileClickOnly && isMobile;
  const shouldEnableClick = sendToBackOnClick || shouldDisableDrag;

  // Reverse so card[0] ends up last in DOM → highest z-index → on top
  const buildStack = (c: React.ReactNode[]) =>
    [...c].reverse().map((content, index) => ({ id: c.length - index, content }));

  const [stack, setStack] = useState(() => cards.length ? buildStack(cards) : []);

  useEffect(() => {
    if (cards.length) setStack(buildStack(cards));
  }, [cards]);

  const sendToBack = (id: number) => {
    setStack(prev => {
      const newStack = [...prev];
      const index = newStack.findIndex(card => card.id === id);
      const [card] = newStack.splice(index, 1);
      newStack.unshift(card);
      return newStack;
    });
  };

  useEffect(() => {
    if (autoplay && stack.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        const topCardId = stack[stack.length - 1].id;
        sendToBack(topCardId);
      }, autoplayDelay);
      return () => clearInterval(interval);
    }
  }, [autoplay, autoplayDelay, stack, isPaused]);

  useImperativeHandle(ref, () => ({
    next: () => {
      setStack(prev => {
        if (prev.length <= 1) return prev;
        const next = [...prev];
        const top = next.pop()!;
        next.unshift(top);
        return next;
      });
    },
  }));

  return (
    <div
      className="stack-container"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {stack.map((card, index) => {
        const randomRotate = randomRotation ? Math.random() * 10 - 5 : 0;
        // depth: 0 = front card, increases toward back
        const depth = stack.length - index - 1;

        return (
          // Outer div: handles stack position + z-ordering
          // The WHOLE bounding box moves, so corners always protrude visibly
          <motion.div
            key={card.id}
            className="card-slot"
            style={{ zIndex: index + 1 }}
            animate={{
              y: depth * 46,
              x: depth * 28,
              rotateZ: depth * 5 + randomRotate,
              scale: 1 - depth * 0.03,
            }}
            initial={false}
            transition={{
              type: 'spring',
              stiffness: animationConfig.stiffness,
              damping: animationConfig.damping,
            }}
            onClick={() => shouldEnableClick && sendToBack(card.id)}
          >
            {/* Inner div: handles drag tilt only */}
            <DragWrapper
              onSendToBack={() => sendToBack(card.id)}
              sensitivity={sensitivity}
              disableDrag={shouldDisableDrag}
            >
              <div className="card">{card.content}</div>
            </DragWrapper>
          </motion.div>
        );
      })}
    </div>
  );
});

export default Stack;

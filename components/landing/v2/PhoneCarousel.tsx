"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface PhoneItem {
  image: string;
  text: string;
}

interface Props {
  items: PhoneItem[];
}

const PHONE_HEIGHT = "clamp(320px, 46vh, 500px)";

function PhoneSlot({
  item,
  scale,
  opacity,
  onClick,
}: {
  item: PhoneItem | undefined;
  scale: number;
  opacity: number;
  onClick?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center flex-shrink-0"
      style={{ opacity, transform: `scale(${scale})`, transition: "opacity .15s, transform .15s", cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        {item && (
          <motion.img
            key={item.image}
            src={item.image}
            alt={item.text}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ height: PHONE_HEIGHT, maxWidth: "none", userSelect: "none", pointerEvents: "none",
              filter: scale === 1
                ? "drop-shadow(0 20px 40px rgba(0,0,0,0.7)) drop-shadow(0 4px 12px rgba(125,200,40,0.1))"
                : "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }}
            draggable={false}
          />
        )}
      </AnimatePresence>
      {/* Label under active phone */}
      {scale === 1 && item && (
        <span className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#7DC828" }}>
          {item.text}
        </span>
      )}
    </div>
  );
}

export default function PhoneCarousel({ items }: Props) {
  const [active, setActive] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const didDrag = useRef(false);

  const prev = () => setActive(a => Math.max(0, a - 1));
  const next = () => setActive(a => Math.min(items.length - 1, a + 1));

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    didDrag.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 8) didDrag.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const delta = dragStartX.current - e.clientX;
    if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
    dragStartX.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full select-none">
      {/* Phones row */}
      <div
        className="flex items-center justify-center gap-6 md:gap-10 cursor-grab active:cursor-grabbing w-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Left phone */}
        <PhoneSlot
          item={items[active - 1]}
          scale={0.72}
          opacity={active > 0 ? 0.45 : 0}
          onClick={() => !didDrag.current && prev()}
        />

        {/* Active phone */}
        <PhoneSlot item={items[active]} scale={1} opacity={1} />

        {/* Right phone */}
        <PhoneSlot
          item={items[active + 1]}
          scale={0.72}
          opacity={active < items.length - 1 ? 0.45 : 0}
          onClick={() => !didDrag.current && next()}
        />
      </div>

      {/* Dots */}
      <div className="flex items-center gap-2 mt-6">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="rounded-full transition-all duration-200"
            style={{
              width: i === active ? "20px" : "6px",
              height: "6px",
              background: i === active ? "#7DC828" : "rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

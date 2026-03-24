"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onDown = () => setClicking(true);
    const onUp = () => setClicking(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      {/* Hide system cursor */}
      <style>{`* { cursor: none !important; }`}</style>

      {/* Padel racket cursor — offset so face tip aligns with click point */}
      <div
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: pos.x - 3,
          top: pos.y - 5,
          opacity: visible ? 1 : 0,
          transform: `scale(${clicking ? 0.85 : 1}) rotate(-35deg)`,
          transition: "transform 0.1s ease, opacity 0.2s ease",
        }}
      >
        <svg width="30" height="46" viewBox="0 0 30 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Racket frame */}
          <ellipse cx="15" cy="15" rx="13" ry="13.5" stroke="white" strokeWidth="2.2" fill="rgba(255,255,255,0.06)" />
          {/* Holes in the face — padel style */}
          <circle cx="15" cy="8"  r="1.6" fill="rgba(125,200,40,0.7)" />
          <circle cx="9"  cy="12" r="1.4" fill="rgba(125,200,40,0.55)" />
          <circle cx="21" cy="12" r="1.4" fill="rgba(125,200,40,0.55)" />
          <circle cx="15" cy="15" r="1.6" fill="rgba(125,200,40,0.8)" />
          <circle cx="9"  cy="19" r="1.4" fill="rgba(125,200,40,0.55)" />
          <circle cx="21" cy="19" r="1.4" fill="rgba(125,200,40,0.55)" />
          <circle cx="15" cy="22" r="1.4" fill="rgba(125,200,40,0.5)" />
          {/* Bridge */}
          <path d="M11 27 Q15 29 19 27" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Handle */}
          <rect x="12" y="28" width="6" height="15" rx="3" fill="white" fillOpacity="0.9" />
          {/* Grip wrapping lines */}
          <line x1="12.5" y1="32" x2="17.5" y2="32" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          <line x1="12.5" y1="35" x2="17.5" y2="35" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          <line x1="12.5" y1="38" x2="17.5" y2="38" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          {/* Handle cap */}
          <rect x="11.5" y="41" width="7" height="2.5" rx="1.25" fill="rgba(125,200,40,0.9)" />
        </svg>
      </div>

    </>
  );
}

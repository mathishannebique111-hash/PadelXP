"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function ClubHeader({
  clubName,
  clubLogo,
  clubSlug,
}: {
  clubName: string | null;
  clubLogo: string | null;
  clubSlug: string | null;
}) {
  const groupRef = useRef<HTMLDivElement | null>(null);
  const [underlineWidth, setUnderlineWidth] = useState<number>(0);

  const measure = () => {
    const el = groupRef.current;
    if (!el) return;
    const width = Math.ceil(el.getBoundingClientRect().width);
    // Extend a bit beyond the content width for a nicer accent
    const extended = Math.ceil(width * 1.12); // +12%
    setUnderlineWidth(extended);
  };

  useLayoutEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    document.fonts?.ready?.then?.(() => measure());
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    measure();
  }, [clubName, clubLogo]);

  return (
    <div className="mb-12 flex justify-center" style={{ paddingTop: "4px", marginTop: "4px" }}>
      <div className="inline-flex flex-col items-center">
        <div ref={groupRef} className="inline-flex items-center gap-3">
          {clubLogo ? (
            <img
              src={clubLogo}
              alt={clubName || "Logo du club"}
              className="h-16 w-16 rounded-full object-cover flex-shrink-0"
            />
          ) : null}
          <h2 className="text-3xl font-extrabold tracking-tight text-white whitespace-nowrap">{clubName || "Club"}</h2>
        </div>
        <div className="relative mt-3 h-[2px]" style={{ width: underlineWidth ? `${underlineWidth}px` : undefined }}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
        </div>
      </div>
    </div>
  );
}

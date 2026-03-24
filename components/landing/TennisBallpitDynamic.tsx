"use client";

import dynamic from "next/dynamic";

// Three.js uses browser globals (self, window, WebGL) — must be client-only
const TennisBallpit = dynamic(() => import("./TennisBallpit"), { ssr: false });

export default function TennisBallpitDynamic() {
  return <TennisBallpit />;
}

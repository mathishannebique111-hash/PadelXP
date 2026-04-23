"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Eye } from "lucide-react";

interface CoachPageTabsProps {
  coachName: string;
  chatContent: React.ReactNode;
  oracleContent: React.ReactNode;
  activeTab: "coach" | "oracle";
  onTabChange: (tab: "coach" | "oracle") => void;
}

export default function CoachPageTabs({ coachName, chatContent, oracleContent, activeTab, onTabChange }: CoachPageTabsProps) {
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const navBar = document.getElementById("bottom-nav-bar");
      const navTop = navBar ? navBar.getBoundingClientRect().top : window.innerHeight;
      const available = navTop - rect.top - 8;
      setContainerHeight(Math.max(available, 300));
    }
    measure();
    window.addEventListener("resize", measure);
    const timer = setTimeout(measure, 150);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-hidden"
      style={containerHeight ? { height: containerHeight } : { height: "calc(100dvh - 12rem)" }}
    >
      {/* Coach identity header */}
      <div className="flex-shrink-0 mb-2 px-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {activeTab === "coach"
            ? <>Salut, moi c&apos;est {coachName}</>
            : <>{coachName} analyse ton match</>}
        </h2>
        <p className="text-sm text-white/45 mt-0.5">
          {activeTab === "coach"
            ? "Ton coach de padel — pose-moi n'importe quelle question"
            : "Prédictions, tactiques et insights avant ton match"}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex-shrink-0 flex gap-1 mb-2 px-1">
        <button
          onClick={() => onTabChange("coach")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "coach"
              ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
              : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
          }`}
        >
          <MessageSquare size={15} />
          Mon Coach
        </button>
        <button
          onClick={() => onTabChange("oracle")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "oracle"
              ? "bg-purple-500/20 text-purple-300 border border-purple-400/30"
              : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
          }`}
        >
          <Eye size={15} />
          Oracle
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={activeTab === "coach" ? "h-full" : "hidden"}>{chatContent}</div>
        <div className={activeTab === "oracle" ? "h-full overflow-y-auto" : "hidden"}>{oracleContent}</div>
      </div>
    </div>
  );
}

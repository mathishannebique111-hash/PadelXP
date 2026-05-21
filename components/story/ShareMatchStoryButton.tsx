"use client";

import { useRef, useState, useCallback } from "react";
import { Share2, Loader2 } from "lucide-react";
import StoryMatchCard, { type StoryMatchData } from "./StoryMatchCard";
import { shareStoryImage } from "@/lib/utils/story-share";

interface ShareMatchStoryButtonProps {
  matchData: StoryMatchData;
}

export default function ShareMatchStoryButton({ matchData }: ShareMatchStoryButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleShare = useCallback(async () => {
    if (!cardRef.current || generating) return;
    setGenerating(true);
    try {
      await shareStoryImage(cardRef.current, `padelxp-match-${Date.now()}.png`);
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  return (
    <>
      <button
        onClick={handleShare}
        disabled={generating}
        className="flex items-center justify-center gap-1.5 w-full py-2 mt-2 rounded-xl text-[11px] font-semibold bg-[#071554]/[0.06] border border-[#071554]/10 text-[#071554]/70 hover:bg-[#071554]/10 transition-all active:scale-[0.97] disabled:opacity-50"
      >
        {generating ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Share2 size={12} />
        )}
        {generating ? "Génération..." : "Partager en story"}
      </button>
      <StoryMatchCard ref={cardRef} data={matchData} />
    </>
  );
}

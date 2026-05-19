"use client";

import { useRef, useState, useCallback } from "react";
import { Share2, Loader2 } from "lucide-react";
import StoryRankCard, { type StoryRankData } from "./StoryRankCard";
import { shareStoryImage } from "@/lib/utils/story-share";

interface ShareRankStoryButtonProps {
  rankData: StoryRankData;
}

export default function ShareRankStoryButton({ rankData }: ShareRankStoryButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleShare = useCallback(async () => {
    if (!cardRef.current || generating) return;
    setGenerating(true);
    try {
      await shareStoryImage(cardRef.current, `padelxp-rank-${Date.now()}.png`);
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  return (
    <>
      <button
        onClick={handleShare}
        disabled={generating}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15 transition-all text-[11px] font-bold tracking-wider uppercase disabled:opacity-50"
      >
        {generating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Share2 size={14} />
        )}
        Partager
      </button>
      <StoryRankCard ref={cardRef} data={rankData} />
    </>
  );
}

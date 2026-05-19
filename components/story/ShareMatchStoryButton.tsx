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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/15 transition-all text-[11px] font-medium disabled:opacity-50"
      >
        {generating ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Share2 size={13} />
        )}
        Story
      </button>
      <StoryMatchCard ref={cardRef} data={matchData} />
    </>
  );
}

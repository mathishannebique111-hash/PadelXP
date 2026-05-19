"use client";

import { useRef, useState, useCallback } from "react";
import { Share2, Loader2, X, Instagram, Download, Send, Film, Image as ImageIcon } from "lucide-react";
import StoryMatchCard, { type StoryMatchData } from "./StoryMatchCard";
import { generateStoryImage, downloadBlob } from "@/lib/utils/story-share";

interface ShareMatchStoryButtonProps {
  matchData: StoryMatchData;
}

export default function ShareMatchStoryButton({ matchData }: ShareMatchStoryButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getImageBlob = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      return await generateStoryImage(cardRef.current);
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleNativeShare = useCallback(async () => {
    const blob = await getImageBlob();
    if (!blob) return;
    const file = new File([blob], `padelxp-match-${Date.now()}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch { /* cancelled */ }
    } else {
      downloadBlob(blob, file.name);
    }
    setShowModal(false);
  }, [getImageBlob]);

  const handleDownload = useCallback(async () => {
    const blob = await getImageBlob();
    if (!blob) return;
    downloadBlob(blob, `padelxp-match-${Date.now()}.png`);
    setShowModal(false);
  }, [getImageBlob]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center justify-center gap-1.5 w-full py-2 mt-2 rounded-xl text-[11px] font-semibold bg-[#071554]/[0.06] border border-[#071554]/10 text-[#071554]/70 hover:bg-[#071554]/10 transition-all active:scale-[0.97]"
      >
        <Share2 size={12} />
        Partager en story
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !generating && setShowModal(false)}
        >
          <div
            className="w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-3xl bg-[#111] border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with logo */}
            <div className="flex flex-col items-center pt-8 pb-4">
              <img
                src="/padelxp-logo-transparent.png"
                alt="PadelXP"
                className="h-10 mb-4 object-contain"
              />
              <p className="text-white/40 text-xs font-medium">Partager ce match</p>
            </div>

            {/* Options grid */}
            <div className="px-6 pb-6 space-y-3">
              {/* Row 1: Story + Reel */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleNativeShare}
                  disabled={generating}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-gradient-to-b from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white hover:from-purple-500/30 hover:to-pink-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 size={22} className="animate-spin text-purple-400" />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                  <span className="text-xs font-bold">Story</span>
                </button>
                <button
                  onClick={handleNativeShare}
                  disabled={generating}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-gradient-to-b from-pink-500/20 to-orange-500/20 border border-pink-500/30 text-white hover:from-pink-500/30 hover:to-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 size={22} className="animate-spin text-pink-400" />
                  ) : (
                    <Film size={22} className="text-pink-400" />
                  )}
                  <span className="text-xs font-bold">Reel</span>
                </button>
              </div>

              {/* Row 2: Publication + Message */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleNativeShare}
                  disabled={generating}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 size={22} className="animate-spin text-white/50" />
                  ) : (
                    <ImageIcon size={22} className="text-white/50" />
                  )}
                  <span className="text-xs font-bold">Publication</span>
                </button>
                <button
                  onClick={handleNativeShare}
                  disabled={generating}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 size={22} className="animate-spin text-white/50" />
                  ) : (
                    <Send size={22} className="text-white/50" />
                  )}
                  <span className="text-xs font-bold">Message</span>
                </button>
              </div>

              {/* Download */}
              <button
                onClick={handleDownload}
                disabled={generating}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all active:scale-95 disabled:opacity-50"
              >
                <Download size={16} />
                <span className="text-xs font-bold">Enregistrer l'image</span>
              </button>
            </div>

            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              disabled={generating}
              className="w-full py-4 border-t border-white/10 text-white/40 text-sm font-medium hover:text-white/60 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <StoryMatchCard ref={cardRef} data={matchData} />
    </>
  );
}

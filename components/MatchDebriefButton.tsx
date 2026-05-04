"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

interface Props {
  score: string;
  isWin: boolean;
}

export default function MatchDebriefButton({ score, isWin }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        const result = isWin ? "gagné" : "perdu";
        const msg = `J'ai ${result} ce match ${score}. Donne-moi ton analyse.`;
        router.push(`/coach?msg=${encodeURIComponent(msg)}`);
      }}
      className="flex items-center justify-center gap-1.5 w-full py-2 mt-2 rounded-xl text-[11px] font-semibold bg-[#071554]/[0.06] border border-[#071554]/10 text-[#071554]/70 hover:bg-[#071554]/10 transition-all active:scale-[0.97]"
    >
      <Sparkles size={12} />
      Débriefer avec le coach
    </button>
  );
}

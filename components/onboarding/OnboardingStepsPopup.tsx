"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface Props {
  onClose: () => void;
}

const STEPS = [
  { label: "Créer ton compte", href: "/home", step: 1 },
  { label: "Évalue ton niveau", href: "/home", step: 2 },
  { label: "Enregistre ton premier match", href: "/match/new?tab=record", step: 3 },
];

export default function OnboardingStepsPopup({ onClose }: Props) {
  const router = useRouter();
  const { steps } = useOnboarding();

  const isDone = (step: number) => {
    if (step === 1) return steps.accountCreated;
    if (step === 2) return steps.levelEvaluated;
    if (step === 3) return steps.firstMatchPlayed;
    return false;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ top: 0, left: 0, right: 0, bottom: 0 }} onClick={onClose}>
      {/* Backdrop — covers everything including safe areas */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0a1a4a] p-5 shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Tes premiers pas</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-white/40 hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {STEPS.map((s) => {
            const done = isDone(s.step);
            return (
              <button
                key={s.step}
                onClick={() => {
                  if (!done) {
                    router.push(s.href);
                  }
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  done
                    ? "bg-white/5 opacity-60"
                    : "bg-white/[0.07] hover:bg-white/[0.12] active:scale-[0.98]"
                }`}
              >
                {/* Step indicator */}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done
                      ? "bg-green-500/20 text-green-400"
                      : "border border-white/20 text-white/60"
                  }`}
                >
                  {done ? <Check size={14} /> : s.step}
                </div>

                {/* Label */}
                <span className={`flex-1 text-left text-sm ${done ? "text-white/40 line-through" : "text-white font-medium"}`}>
                  {s.label}
                </span>

                {/* Arrow for incomplete */}
                {!done && <ChevronRight size={16} className="text-white/30" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

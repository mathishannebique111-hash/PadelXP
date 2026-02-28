"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Save, RefreshCw } from "lucide-react";
import {
  PADEL_QUESTIONS,
  CATEGORY_INFO,
} from "@/lib/padel/levelQuestions";
import {
  calculatePadelLevel,
  type AssessmentResponses,
} from "@/lib/padel/levelCalculator";
import LevelQuestionCard from "./LevelQuestionCard";
import LevelProgressBar from "./LevelProgressBar";
import LevelResultContent from "./LevelResultContent";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface Props {
  onComplete?: (result: any) => void;
  onCancel?: () => void;
  forceStart?: boolean;
}

export default function LevelAssessmentWizard({ onComplete, onCancel, forceStart = false }: Props) {
  const supabase = createClient();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [hasStarted, setHasStarted] = useState(forceStart);
  const [responses, setResponses] = useState<
    Record<number, number | number[]>
  >({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Charger la progression sauvegardée au montage et après reconnexion
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("questionnaire_progress")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[LevelAssessmentWizard] Erreur chargement profil:", profileError);
        }

        if (profile?.questionnaire_progress) {
          const dbProgress = typeof profile.questionnaire_progress === 'string'
            ? JSON.parse(profile.questionnaire_progress)
            : profile.questionnaire_progress;

          if (dbProgress.currentQuestion !== undefined && dbProgress.responses) {
            setCurrentQuestion(dbProgress.currentQuestion);
            setResponses(dbProgress.responses);
            localStorage.setItem(`questionnaire_progress_${user.id}`, JSON.stringify(dbProgress));
            return;
          }
        }

        const savedProgress = localStorage.getItem(`questionnaire_progress_${user.id}`);
        if (savedProgress) {
          try {
            const parsed = JSON.parse(savedProgress);
            if (parsed.currentQuestion !== undefined && parsed.responses) {
              setCurrentQuestion(parsed.currentQuestion);
              setResponses(parsed.responses);
              await supabase.from("profiles").update({ questionnaire_progress: parsed }).eq("id", user.id);
            }
          } catch (e) {
            console.error("[LevelAssessmentWizard] Erreur parsing localStorage:", e);
          }
        }
      } catch (error) {
        console.error("[LevelAssessmentWizard] Erreur chargement progression:", error);
      }
    };

    loadProgress();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadProgress();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Sauvegarder la progression à chaque changement
  useEffect(() => {
    const saveProgress = async () => {
      if (!hasStarted || (currentQuestion === 0 && Object.keys(responses).length === 0)) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const progressData = {
          currentQuestion,
          responses,
          updatedAt: new Date().toISOString()
        };

        try {
          localStorage.setItem(`questionnaire_progress_${user.id}`, JSON.stringify(progressData));
        } catch (e) { }

        await supabase.from("profiles").update({ questionnaire_progress: progressData }).eq("id", user.id);
      } catch (error) { }
    };

    const timeoutId = setTimeout(saveProgress, 300);
    return () => clearTimeout(timeoutId);
  }, [currentQuestion, responses, hasStarted, supabase]);

  // Masquer le logo du club et la navbar quand le questionnaire a commencé
  const notifyNativeColor = (color: string) => {
    if (typeof window === 'undefined') return;
    if ((window as any).webkit?.messageHandlers?.updateSafeAreaColor) {
      (window as any).webkit.messageHandlers.updateSafeAreaColor.postMessage(color);
    }
    if ((window as any).Capacitor) {
      try {
        const event = new CustomEvent('updateSafeAreaColor', { detail: { color } });
        window.dispatchEvent(event);
      } catch (e) { }
    }
  };

  useEffect(() => {
    if (hasStarted) {
      document.body.classList.add('questionnaire-open');
      document.documentElement.classList.add('questionnaire-open');
      notifyNativeColor('#020617');
    } else {
      document.body.classList.remove('questionnaire-open');
      document.documentElement.classList.remove('questionnaire-open');
      notifyNativeColor('#172554');
    }

    return () => {
      document.body.classList.remove('questionnaire-open');
      document.documentElement.classList.remove('questionnaire-open');
    };
  }, [hasStarted]);

  const question = PADEL_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / PADEL_QUESTIONS.length) * 100;
  const canGoNext = responses[question?.id] !== undefined;
  const canGoBack = currentQuestion > 0;

  const handleAnswer = (value: number | number[]) => {
    setResponses((prev) => ({ ...prev, [question.id]: value }));
  };

  const handleNext = () => {
    if (!canGoNext) return;

    if (currentQuestion === PADEL_QUESTIONS.length - 1) {
      calculateResult();
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!canGoBack) return;
    setCurrentQuestion((prev) => prev - 1);
  };

  const handleRetake = () => {
    setIsCompleted(false);
    setCurrentQuestion(0);
    setResponses({});
    setResult(null);
    setIsSaved(false);
  };

  const handleSaveResult = async () => {
    if (isSaving || isSaved || !result) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/padel-level/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niveau: result.niveau,
          categorie: result.categorie,
          breakdown: result.breakdown,
          responses: result.breakdown.responses,
          recommendations: [result.tips.technique, result.tips.tactique, result.tips.mental],
        }),
      });

      if (response.ok) {
        setIsSaved(true);

        // Notifier les autres composants
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("questionnaireCompleted"));
          window.dispatchEvent(new CustomEvent("profileUpdated"));
          window.dispatchEvent(new CustomEvent("questionnaireCompleted"));

          try {
            localStorage.setItem("questionnaireCompleted", "true");
            setTimeout(() => localStorage.removeItem("questionnaireCompleted"), 1000);
          } catch (e) { }
        }

        // Nettoyer la progression sauvegardée
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("profiles").update({ questionnaire_progress: null }).eq("id", user.id);
            localStorage.removeItem(`questionnaire_progress_${user.id}`);
          }
        } catch (error) {
          console.error("[LevelAssessmentWizard] Erreur nettoyage progression:", error);
        }

        // Fermer le wizard après un court délai
        setTimeout(() => {
          setIsCompleted(false);
          setHasStarted(false);
          setCurrentQuestion(0);
          setResponses({});
          setResult(null);
          if (onComplete) onComplete(result);
        }, 1500);
      }
    } catch (error) {
      console.error("[LevelAssessmentWizard] Erreur sauvegarde niveau:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateResult = async () => {
    const get = (id: number): number =>
      (responses[id] as number | undefined) ?? 0;

    const mappedResponses: AssessmentResponses = {
      vitres: get(1),
      coupsBase: get(2),
      service: get(3),
      volee: get(4),
      smash: get(5),
      lobs: get(6),
      coupFiable: get(7),
      transitions: get(8),
      lectureJeu: get(9),
      communication: get(10),
      tempo: get(11),
      strategie: get(12),
      ratioRisque: get(13),
      passeSportif: get(14),
      frequence: get(15),
      tournois: get(16),
      resultats: get(17),
      classementFFT: get(18),
      endurance: get(19),
      pression: get(20),
      doublesVitres: get(21),
      adversaireSup: get(22),
    };

    let userProfile: { preferred_side?: "left" | "right" | "indifferent" | null } | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("preferred_side").eq("id", user.id).maybeSingle();
        if (profile) {
          userProfile = { preferred_side: profile.preferred_side as "left" | "right" | "indifferent" | null };
        }
      }
    } catch (error) { }

    const calculatedResult = calculatePadelLevel(mappedResponses, userProfile);
    setResult(calculatedResult);
    setIsCompleted(true);
  };

  if (!hasStarted) {
    const hasProgress = currentQuestion > 0;

    return (
      <motion.div
        initial={{ height: "auto" }}
        animate={{ height: "auto" }}
        className="bg-white/5 rounded-2xl border border-white/80 p-4 sm:p-6 shadow-xl"
      >
        <h1 className="text-lg sm:text-xl font-bold text-white mb-2">
          Évaluer mon niveau
        </h1>
        {hasProgress ? (
          <p className="text-xs sm:text-sm text-gray-400 mb-4">
            Vous vous êtes arrêté à la question{" "}
            <span className="font-semibold text-white">
              {Math.min(currentQuestion + 1, PADEL_QUESTIONS.length)}
            </span>{" "}
            sur {PADEL_QUESTIONS.length}. Reprenez quand vous voulez.
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400 mb-4">
            22 questions rapides pour estimer précisément ton niveau de padel de
            1 à 10. Vous pouvez interrompre et reprendre plus tard.
          </p>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setHasStarted(true)}
          className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 min-h-[44px]"
        >
          {hasProgress ? "Reprendre le questionnaire" : "Commencer l'évaluation"}
          <ChevronRight size={18} />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ height: "auto", opacity: 0 }}
      animate={{ height: ["100vh", "100dvh"], opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-[100000] flex flex-col bg-slate-950 overflow-hidden touch-none"
      style={{ height: '100dvh', overscrollBehavior: 'none' }}
    >
      <style jsx global>{`
        body.questionnaire-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          overscroll-behavior: none !important;
          background-color: #020617 !important;
        }
        body.questionnaire-open #__next, 
        body.questionnaire-open main,
        body.questionnaire-open .relative.min-h-screen.bg-\[\#172554\] {
          background-color: #020617 !important;
          background-image: none !important;
        }
        body.questionnaire-open [data-club-logo-container="true"],
        body.questionnaire-open [data-header-actions="true"],
        body.questionnaire-open #bottom-nav-bar,
        body.questionnaire-open #site-logo-mobile,
        body.questionnaire-open .site-header-logo {
          display: none !important;
        }
      `}</style>

      {/* Header fixe */}
      <div className="sticky z-20 px-4 pt-6 pb-2 flex-shrink-0" style={{ paddingTop: 'calc(var(--sat, 0px) + 1.5rem)' }}>
        <div className="flex justify-center mb-4 relative z-[100001]">
          <div className="relative w-32 h-10">
            <Image
              src="/padelxp-logo-transparent.png"
              alt="PadelXP"
              fill
              className="object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
              priority
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <LevelProgressBar
            progress={isCompleted ? 100 : progress}
            currentStep={isCompleted ? PADEL_QUESTIONS.length : currentQuestion + 1}
            totalSteps={PADEL_QUESTIONS.length}
          />

          {!isCompleted && (
            <div className="mt-2.5 flex items-center justify-center gap-2">
              {(() => {
                const CategoryIcon = CATEGORY_INFO[question.category].Icon;
                return <CategoryIcon size={12} className="text-blue-400 flex-shrink-0" />;
              })()}
              <span className="text-[9px] uppercase tracking-[0.2em] font-black text-blue-500/80">
                {CATEGORY_INFO[question.category].label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Contenu - Questions ou Résultats */}
      <div className="flex-1 overflow-y-auto px-4 py-1 flex items-start justify-center" style={{ minHeight: 0 }}>
        <div className="w-full max-w-3xl mx-auto pb-32">
          <AnimatePresence mode="wait">
            {!isCompleted ? (
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="w-full"
              >
                <LevelQuestionCard
                  question={question}
                  value={responses[question.id]}
                  onChange={handleAnswer}
                />
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full mt-4"
              >
                <LevelResultContent result={result} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Boutons Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-3 sm:px-4 py-3 flex-shrink-0 pb-10 sm:pb-12 bg-slate-950/80 backdrop-blur-md border-t border-white/5">
        {!isCompleted ? (
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex gap-2 sm:gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                disabled={!canGoBack}
                className="px-3 py-2 rounded-lg sm:rounded-xl border border-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-w-[40px] min-h-[40px]"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline ml-2">Précédent</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                disabled={!canGoNext}
                className="flex-1 py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                {currentQuestion === PADEL_QUESTIONS.length - 1 ? (
                  <>
                    <span>Voir mon niveau</span>
                    <Check size={18} />
                  </>
                ) : (
                  <>
                    <span>Suivant</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const progressData = { currentQuestion, responses, updatedAt: new Date().toISOString() };
                    localStorage.setItem(`questionnaire_progress_${user.id}`, JSON.stringify(progressData));
                    await supabase.from("profiles").update({ questionnaire_progress: progressData }).eq("id", user.id);
                  }
                } catch (error) { }
                setHasStarted(false);
                if (onCancel) onCancel();
              }}
              className="mt-3 w-full text-[10px] text-gray-400 underline decoration-dotted underline-offset-2 active:text-gray-200"
            >
              Poursuivre plus tard
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto w-full">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveResult}
              disabled={isSaving || isSaved}
              className="w-full sm:flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/40"
            >
              {isSaved ? (
                <>
                  <Check size={18} />
                  <span>NIVEAU ENREGISTRÉ</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{isSaving ? "CHARGEMENT..." : "ENREGISTRER MON NIVEAU"}</span>
                </>
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleRetake}
              className="w-full sm:w-auto px-6 py-4 rounded-xl border border-white/10 text-white/60 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={14} />
              <span>Refaire</span>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}


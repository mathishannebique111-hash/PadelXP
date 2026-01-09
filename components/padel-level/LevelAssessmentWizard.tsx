"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
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
import LevelResultCard from "./LevelResultCard";

interface Props {
  onComplete?: (result: any) => void;
}

export default function LevelAssessmentWizard({ onComplete }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [responses, setResponses] = useState<
    Record<number, number | number[]>
  >({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const question = PADEL_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / PADEL_QUESTIONS.length) * 100;
  const canGoNext = responses[question.id] !== undefined;
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

  const calculateResult = () => {
    const get = (id: number): number =>
      (responses[id] as number | undefined) ?? 0;

    const mappedResponses: AssessmentResponses = {
      vitres: get(1),
      coupsBase: get(2),
      service: get(3),
      volee: get(4),
      smash: get(5),
      coupsTechniques: (responses[6] as number[]) ?? [],
      transitions: get(7),
      lectureJeu: get(8),
      communication: get(9),
      tempo: get(10),
      strategie: get(11),
      tournois: get(12),
      classementFFT: get(13),
      resultats: get(14),
      frequence: get(15),
      // 16,17 physiques
      endurance: get(16),
      pression: get(17),
      // 18-20 situations
      doublesVitres: get(18),
      retourService: get(19),
      adversaireSup: get(20),
      // 21-23 expérience avancée
      statutPro: get(21),
      classementIntl: get(22),
      revenus: get(23),
    };

    const calculatedResult = calculatePadelLevel(mappedResponses);
    setResult(calculatedResult);
    setIsCompleted(true);

    if (onComplete) onComplete(calculatedResult);
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 px-4 py-6 pb-24">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Évaluer mon niveau
            </h1>
            <p className="text-sm md:text-base text-gray-400 mb-6">
              23 questions rapides pour estimer précisément ton niveau de padel
              de 1 à 10. Design mobile-first, tu peux arrêter à tout moment.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setHasStarted(true)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm md:text-base flex items-center justify-center gap-2 min-h-[44px]"
            >
              Commencer l&apos;évaluation
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted && result) {
    return (
      <LevelResultCard
        result={result}
        onRetake={() => {
          setIsCompleted(false);
          setCurrentQuestion(0);
          setResponses({});
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* Header fixe - mobile first */}
      <div className="sticky top-0 z-20 bg-slate-900 px-4 py-4 border-b border-slate-800">
        <LevelProgressBar
          progress={progress}
          currentStep={currentQuestion + 1}
          totalSteps={PADEL_QUESTIONS.length}
        />

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xl">
            {CATEGORY_INFO[question.category].icon}
          </span>
          <span className="text-xs md:text-sm font-medium text-gray-400">
            {CATEGORY_INFO[question.category].label}
          </span>
        </div>
      </div>

      {/* Zone scrollable pour la question */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <LevelQuestionCard
              question={question}
              value={responses[question.id]}
              onChange={handleAnswer}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Boutons fixés en bas - mobile-first */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900 border-t border-slate-800 px-4 py-4">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            disabled={!canGoBack}
            className="px-4 py-4 rounded-xl border border-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[44px]"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Retour</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={!canGoNext}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}


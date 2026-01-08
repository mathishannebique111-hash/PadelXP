"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  Users,
  Flame,
  Trophy,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Hand,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Zap,
  TrendingUp,
  ArrowBigUp,
  Shield,
  ChevronLeft,
} from "lucide-react";

type OnboardingAnswers = {
  level: "beginner" | "leisure" | "regular" | "competition" | null;
  preferred_side: "left" | "right" | "indifferent" | null;
  hand: "right" | "left" | null;
  frequency: "monthly" | "weekly" | "2-3weekly" | "3+weekly" | null;
  best_shot: "smash" | "vibora" | "lob" | "defense" | null;
};

type QuestionId = 0 | 1 | 2 | 3 | 4;

interface Question {
  id: QuestionId;
  title: string;
  subtitle?: string;
  options: Array<{
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
  }>;
}

const questions: Question[] = [
  {
    id: 0,
    title: "Quel est votre niveau de pratique ?",
    subtitle: "Aidez-nous à mieux vous connaître",
    options: [
      {
        value: "beginner",
        label: "Je débute",
        icon: Sprout,
        description: "Premiers pas sur le terrain",
      },
      {
        value: "leisure",
        label: "Loisir",
        icon: Users,
        description: "Pour le plaisir entre amis",
      },
      {
        value: "regular",
        label: "Régulier",
        icon: Flame,
        description: "Pratique régulière",
      },
      {
        value: "competition",
        label: "Compétition",
        icon: Trophy,
        description: "Niveau compétitif",
      },
    ],
  },
  {
    id: 1,
    title: "Quel côté préférez-vous ?",
    subtitle: "Votre position favorite sur le terrain",
    options: [
      {
        value: "left",
        label: "Gauche",
        icon: ArrowLeft,
      },
      {
        value: "right",
        label: "Droite",
        icon: ArrowRight,
      },
      {
        value: "indifferent",
        label: "Indifférent",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    id: 2,
    title: "Quelle est votre main forte ?",
    subtitle: "Pour adapter nos recommandations",
    options: [
      {
        value: "right",
        label: "Droitier",
        icon: Hand,
      },
      {
        value: "left",
        label: "Gaucher",
        icon: Hand,
      },
    ],
  },
  {
    id: 3,
    title: "À quelle fréquence jouez-vous ?",
    subtitle: "Pour personnaliser votre expérience",
    options: [
      {
        value: "monthly",
        label: "1x / mois",
        icon: Calendar,
      },
      {
        value: "weekly",
        label: "1x / semaine",
        icon: CalendarDays,
      },
      {
        value: "2-3weekly",
        label: "2-3x / semaine",
        icon: CalendarRange,
      },
      {
        value: "3+weekly",
        label: "+ de 3x / semaine",
        icon: CalendarClock,
      },
    ],
  },
  {
    id: 4,
    title: "Quel est votre coup signature ?",
    subtitle: "Votre spécialité sur le terrain",
    options: [
      {
        value: "smash",
        label: "Smash",
        icon: Zap,
        description: "Puissance et précision",
      },
      {
        value: "vibora",
        label: "Vibora",
        icon: TrendingUp,
        description: "Effet et contrôle",
      },
      {
        value: "lob",
        label: "Lob",
        icon: ArrowBigUp,
        description: "Hauteur et placement",
      },
      {
        value: "defense",
        label: "Défense",
        icon: Shield,
        description: "Solidité et réactivité",
      },
    ],
  },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState<QuestionId>(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    level: null,
    preferred_side: null,
    hand: null,
    frequency: null,
    best_shot: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const hasAnswer = answers[question.id === 0 ? "level" : question.id === 1 ? "preferred_side" : question.id === 2 ? "hand" : question.id === 3 ? "frequency" : "best_shot"] !== null;

  const handleAnswer = (value: string) => {
    const key = question.id === 0 ? "level" : question.id === 1 ? "preferred_side" : question.id === 2 ? "hand" : question.id === 3 ? "frequency" : "best_shot";
    setAnswers((prev) => ({
      ...prev,
      [key]: value as any,
    }));
    
    // Passer automatiquement à la question suivante après un court délai pour l'animation
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => (prev + 1) as QuestionId);
      } else {
        // Si c'est la dernière question, soumettre automatiquement
        handleSubmit();
      }
    }, 300);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => (prev - 1) as QuestionId);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => (prev + 1) as QuestionId);
    } else {
      handleSubmit();
    }
  };


  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          skip: false,
        }),
      });

      if (response.ok) {
        router.push("/home");
      } else {
        const data = await response.json();
        console.error("Erreur:", data.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Barre de progression */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Bouton Précédent (en haut à gauche) */}
      {currentQuestion > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute top-4 left-4 z-50 p-2 text-white/60 hover:text-white/90 transition-colors flex items-center gap-2"
          aria-label="Question précédente"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Précédent</span>
        </button>
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md space-y-8"
          >
            {/* Titre et sous-titre */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {question.title}
              </h1>
              {question.subtitle && (
                <p className="text-sm sm:text-base text-white/70">
                  {question.subtitle}
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const Icon = option.icon;
                const key = question.id === 0 ? "level" : question.id === 1 ? "preferred_side" : question.id === 2 ? "hand" : question.id === 3 ? "frequency" : "best_shot";
                const isSelected = answers[key as keyof OnboardingAnswers] === option.value;
                const isHandLeft = question.id === 2 && option.value === "left";

                return (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                        : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 sm:w-7 sm:h-7 ${
                            isHandLeft ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white text-base sm:text-lg">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs sm:text-sm text-white/60 mt-1">
                            {option.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                        >
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicateur de progression (numéro de question) */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="text-sm text-white/60">
          {currentQuestion + 1} / {questions.length}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
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
  X,
} from "lucide-react";

type OnboardingData = {
  level: "beginner" | "leisure" | "regular" | "competition" | null;
  preferred_side: "left" | "right" | "indifferent" | null;
  hand: "right" | "left" | null;
  frequency: "monthly" | "weekly" | "2-3weekly" | "3+weekly" | null;
  best_shot: "smash" | "vibora" | "lob" | "defense" | null;
};

interface PadelProfileEditModalProps {
  initialData: OnboardingData;
  onSave: (data: OnboardingData) => Promise<void>;
  onClose: () => void;
}

const questions = [
  {
    id: "level",
    title: "Quel est votre niveau de pratique ?",
    options: [
      { value: "beginner", label: "Je débute", icon: Sprout, description: "Premiers pas sur le terrain" },
      { value: "leisure", label: "Loisir", icon: Users, description: "Pour le plaisir entre amis" },
      { value: "regular", label: "Régulier", icon: Flame, description: "Pratique régulière" },
      { value: "competition", label: "Compétition", icon: Trophy, description: "Niveau compétitif" },
    ],
  },
  {
    id: "preferred_side",
    title: "Quel côté préférez-vous ?",
    options: [
      { value: "left", label: "Gauche", icon: ArrowLeft },
      { value: "right", label: "Droite", icon: ArrowRight },
      { value: "indifferent", label: "Indifférent", icon: ArrowLeftRight },
    ],
  },
  {
    id: "hand",
    title: "Quelle est votre main forte ?",
    options: [
      { value: "right", label: "Droitier", icon: Hand },
      { value: "left", label: "Gaucher", icon: Hand },
    ],
  },
  {
    id: "frequency",
    title: "À quelle fréquence jouez-vous ?",
    options: [
      { value: "monthly", label: "1x / mois", icon: Calendar },
      { value: "weekly", label: "1x / semaine", icon: CalendarDays },
      { value: "2-3weekly", label: "2-3x / semaine", icon: CalendarRange },
      { value: "3+weekly", label: "+ de 3x / semaine", icon: CalendarClock },
    ],
  },
  {
    id: "best_shot",
    title: "Quel est votre coup signature ?",
    options: [
      { value: "smash", label: "Smash", icon: Zap, description: "Puissance et précision" },
      { value: "vibora", label: "Vibora", icon: TrendingUp, description: "Effet et contrôle" },
      { value: "lob", label: "Lob", icon: ArrowBigUp, description: "Hauteur et placement" },
      { value: "defense", label: "Défense", icon: Shield, description: "Solidité et réactivité" },
    ],
  },
];

export default function PadelProfileEditModal({
  initialData,
  onSave,
  onClose,
}: PadelProfileEditModalProps) {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentValue = data[question.id as keyof OnboardingData];

  const handleAnswer = (value: string) => {
    setData((prev) => ({
      ...prev,
      [question.id]: value as any,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-gradient-to-b from-blue-950 via-black to-black rounded-2xl border border-white/10 p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Barre de progression */}
          <div className="mb-6">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="mt-2 text-xs text-white/60 text-center">
              {currentQuestion + 1} / {questions.length}
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Question */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white text-center">
              {question.title}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const Icon = option.icon;
                const isSelected = currentValue === option.value;
                const isHandLeft = question.id === "hand" && option.value === "left";

                return (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                        : "border-white/20 bg-white/5 hover:border-white/40"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${isHandLeft ? "rotate-180" : ""}`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-white/60 mt-1">
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

            {/* Bouton Suivant */}
            {currentValue && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNext}
                disabled={isSaving}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                {isSaving
                  ? "Enregistrement..."
                  : currentQuestion === questions.length - 1
                  ? "Enregistrer"
                  : "Suivant"}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

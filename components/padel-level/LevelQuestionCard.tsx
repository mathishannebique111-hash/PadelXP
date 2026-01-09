"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Question } from "@/lib/padel/levelQuestions";

interface Props {
  question: Question;
  value: number | number[] | undefined;
  onChange: (value: number | number[]) => void;
}

export default function LevelQuestionCard({
  question,
  value,
  onChange,
}: Props) {
  const isMultiple = question.multiple;
  const selectedValues = Array.isArray(value)
    ? value
    : value !== undefined
    ? [value]
    : [];

  const handleSelect = (points: number) => {
    if (isMultiple) {
      const current = Array.isArray(value) ? value : [];
      const newValue = current.includes(points)
        ? current.filter((v) => v !== points)
        : [...current, points];
      onChange(newValue);
    } else {
      onChange(points);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-4 md:p-8 shadow-2xl max-w-3xl mx-auto">
      {/* Question - taille mobile optimisée */}
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
        {question.question}
      </h2>

      {question.description && (
        <p className="text-sm text-gray-400 mb-4 md:mb-6">
          {question.description}
        </p>
      )}

      {isMultiple && (
        <div className="mb-4 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
          💡 Sélection multiple possible
        </div>
      )}

      {/* Options - zone tactile 44px minimum */}
      <div className="space-y-2 md:space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedValues.includes(option.points);

          return (
            <motion.button
              key={option.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(option.points)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all min-h-[44px] ${
                isSelected
                  ? "bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-slate-700/50 border-slate-600 active:border-slate-500"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium text-sm md:text-base ${
                      isSelected ? "text-blue-300" : "text-white"
                    }`}
                  >
                    {option.label}
                  </p>
                  {option.description && (
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                      {option.description}
                    </p>
                  )}
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-500 flex items-center justify-center"
                  >
                    <Check size={14} className="text-white md:hidden" />
                    <Check size={16} className="text-white hidden md:block" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}


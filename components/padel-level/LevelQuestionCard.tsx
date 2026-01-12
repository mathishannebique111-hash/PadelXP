"use client";

import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
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
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl border border-slate-700/50 w-full">
      {/* Question - taille mobile optimisée */}
      <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3 leading-tight">
        {question.question}
      </h2>

      {question.description && (
        <p className="text-xs sm:text-sm text-gray-300 mb-3 sm:mb-4 leading-relaxed">
          {question.description}
        </p>
      )}

      {isMultiple && (
        <div className="mb-3 sm:mb-4 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs flex items-center gap-2">
          <Info size={12} className="flex-shrink-0" />
          <span>Sélection multiple possible</span>
        </div>
      )}

      {/* Options - zone tactile 44px minimum, taille réduite sur mobile */}
      <div className="space-y-2 sm:space-y-2.5">
        {question.options.map((option) => {
          const isSelected = selectedValues.includes(option.points);

          return (
            <motion.button
              key={option.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => handleSelect(option.points)}
              className={`w-full text-left p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 min-h-[44px] sm:min-h-[48px] md:min-h-[52px] ${
                isSelected
                  ? "bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700/70"
              }`}
            >
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium text-xs sm:text-sm md:text-base leading-snug ${
                      isSelected ? "text-blue-300" : "text-white"
                    }`}
                  >
                    {option.label}
                  </p>
                  {option.description && (
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 mt-1 leading-relaxed">
                      {option.description}
                    </p>
                  )}
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
                  >
                    <Check size={14} className="text-white sm:hidden" />
                    <Check size={16} className="text-white hidden sm:block md:hidden" />
                    <Check size={18} className="text-white hidden md:block" />
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


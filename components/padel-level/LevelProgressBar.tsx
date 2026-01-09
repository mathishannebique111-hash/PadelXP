"use client";

import { motion } from "framer-motion";

interface Props {
  progress: number;
  currentStep: number;
  totalSteps: number;
}

export default function LevelProgressBar({
  progress,
  currentStep,
  totalSteps,
}: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs md:text-sm font-medium text-gray-400">
          {currentStep}/{totalSteps}
        </span>
        <span className="text-xs md:text-sm font-bold text-blue-400">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}


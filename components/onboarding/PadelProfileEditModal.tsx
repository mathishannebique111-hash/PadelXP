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
  ChevronDown,
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

const levelLabels: Record<string, string> = {
  beginner: "Je débute",
  leisure: "Loisir",
  regular: "Régulier",
  competition: "Compétition",
};

const sideLabels: Record<string, string> = {
  left: "Gauche",
  right: "Droite",
  indifferent: "Indifférent",
};

const handLabels: Record<string, string> = {
  right: "Droitier",
  left: "Gaucher",
};

const frequencyLabels: Record<string, string> = {
  monthly: "1-2x par mois",
  weekly: "1x / semaine",
  "2-3weekly": "2-3x / semaine",
  "3+weekly": "+ de 3x / semaine",
};

const shotLabels: Record<string, string> = {
  smash: "Smash",
  vibora: "Vibora",
  lob: "Lob",
  defense: "Bajada",
};

const levelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  beginner: Sprout,
  leisure: Users,
  regular: Flame,
  competition: Trophy,
};

const sideIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  left: ArrowLeft,
  right: ArrowRight,
  indifferent: ArrowLeftRight,
};

const handIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  right: Hand,
  left: Hand,
};

const frequencyIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  monthly: Calendar,
  weekly: CalendarDays,
  "2-3weekly": CalendarRange,
  "3+weekly": CalendarClock,
};

const shotIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  smash: Zap,
  vibora: TrendingUp,
  lob: ArrowBigUp,
  defense: Shield,
};

const fieldConfig = {
  level: {
    label: "Niveau",
    icon: levelIcons,
    options: [
      { value: "beginner", label: levelLabels.beginner },
      { value: "leisure", label: levelLabels.leisure },
      { value: "regular", label: levelLabels.regular },
      { value: "competition", label: levelLabels.competition },
    ],
  },
  hand: {
    label: "Main forte",
    icon: handIcons,
    options: [
      { value: "right", label: handLabels.right },
      { value: "left", label: handLabels.left },
    ],
  },
  preferred_side: {
    label: "Côté préféré",
    icon: sideIcons,
    options: [
      { value: "left", label: sideLabels.left },
      { value: "right", label: sideLabels.right },
      { value: "indifferent", label: sideLabels.indifferent },
    ],
  },
  best_shot: {
    label: "Coup signature",
    icon: shotIcons,
    options: [
      { value: "smash", label: shotLabels.smash },
      { value: "vibora", label: shotLabels.vibora },
      { value: "lob", label: shotLabels.lob },
      { value: "defense", label: shotLabels.defense },
    ],
  },
  frequency: {
    label: "Fréquence",
    icon: frequencyIcons,
    options: [
      { value: "monthly", label: frequencyLabels.monthly },
      { value: "weekly", label: frequencyLabels.weekly },
      { value: "2-3weekly", label: frequencyLabels["2-3weekly"] },
      { value: "3+weekly", label: frequencyLabels["3+weekly"] },
    ],
  },
};

export default function PadelProfileEditModal({
  initialData,
  onSave,
  onClose,
}: PadelProfileEditModalProps) {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [openField, setOpenField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field: keyof OnboardingData, value: string | null) => {
    setData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setOpenField(null);
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

  const renderField = (fieldKey: keyof OnboardingData) => {
    const field = fieldConfig[fieldKey];
    const currentValue = data[fieldKey];
    const IconComponent = currentValue && field.icon[currentValue] ? field.icon[currentValue] : null;
    const isLeftHanded = fieldKey === "hand" && currentValue === "left";
    const isOpen = openField === fieldKey;

    const getDisplayLabel = (value: string | null) => {
      if (!value) return null;
      if (fieldKey === "level") return levelLabels[value];
      if (fieldKey === "hand") return handLabels[value];
      if (fieldKey === "preferred_side") return sideLabels[value];
      if (fieldKey === "best_shot") return shotLabels[value];
      if (fieldKey === "frequency") return frequencyLabels[value];
      return null;
    };

    return (
      <div key={fieldKey} className="relative">
        <div
          className={`rounded-xl border border-white/30 bg-white/5 p-5 transition-all cursor-pointer ${
            isOpen ? "bg-white/[0.1] border-white/50" : "hover:bg-white/[0.07]"
          }`}
          onClick={() => setOpenField(isOpen ? null : fieldKey)}
        >
          <div className="flex items-start gap-4">
            {IconComponent && (
              <IconComponent
                className={`w-7 h-7 text-white flex-shrink-0 mt-0.5 transition-transform ${
                  isOpen ? "scale-110" : ""
                } ${isLeftHanded ? "rotate-180" : ""}`}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                {field.label}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-base font-bold text-white">
                  {currentValue ? getDisplayLabel(currentValue) : "Non renseigné"}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white/50 transition-transform flex-shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Options dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm"
            >
              <div className="p-2 space-y-1">
                {field.options.map((option) => {
                  const OptionIcon = field.icon[option.value];
                  const isSelected = currentValue === option.value;
                  const isOptionLeftHanded = fieldKey === "hand" && option.value === "left";

                  return (
                    <button
                      key={option.value}
                      onClick={() => handleFieldChange(fieldKey, option.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                        isSelected
                          ? "bg-white/20 border border-white/40"
                          : "hover:bg-white/10 border border-transparent"
                      }`}
                    >
                      {OptionIcon && (
                        <OptionIcon
                          className={`w-5 h-5 text-white flex-shrink-0 ${
                            isOptionLeftHanded ? "rotate-180" : ""
                          }`}
                        />
                      )}
                      <span className="text-sm font-medium text-white flex-1">
                        {option.label}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-3 h-3 text-white"
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
                        </div>
                      )}
                    </button>
                  );
                })}
                {currentValue && (
                  <button
                    onClick={() => handleFieldChange(fieldKey, null)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
                  >
                    <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-400 flex-1">
                      Effacer
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/80 p-6 sm:p-8 md:p-10 backdrop-blur-sm max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                Modifier mon profil
              </h2>
              <p className="text-xs sm:text-sm text-white/50">
                Cliquez sur un champ pour le modifier
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {renderField("level")}
            {renderField("hand")}
            {renderField("preferred_side")}
            {renderField("best_shot")}
            {renderField("frequency")}
          </div>

          {/* Footer buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg border border-white/20 text-white text-sm font-medium transition-all hover:bg-white/10 active:scale-95"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

"use client";

import { Lock, LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface LockedFeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  ctaText?: string;
  onPress?: () => void;
}

export default function LockedFeatureCard({
  title,
  description,
  icon: Icon,
  ctaText = "Compléter mon profil",
  onPress,
}: LockedFeatureCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onPress) {
      onPress();
    } else {
      // Par défaut, rediriger vers l'onglet "Mon Profil"
      router.push("/home?tab=padel");
    }
  };

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-black/90 p-6 sm:p-8 shadow-xl overflow-hidden">
      {/* Cadenas dans le coin supérieur droit */}
      <div className="absolute top-4 right-4">
        <div className="rounded-full bg-yellow-500/20 p-2 border border-yellow-500/30">
          <Lock className="w-4 h-4 text-yellow-400" />
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icône centrale avec cercle */}
        <div className="relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white/80" />
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-md">
          {description}
        </p>

        {/* Bouton CTA */}
        <button
          onClick={handleClick}
          className="mt-2 w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

interface NotificationModalProps {
  type: "dethroned_from_1" | "dethroned_from_2" | "dethroned_from_3";
  onClose: () => void;
}

export default function NotificationModal({ type, onClose }: NotificationModalProps) {
  useEffect(() => {
    console.log(`[NotificationModal] 🎬 MODAL MONTÉ avec type: ${type}`);
    
    // Fermer automatiquement après 8 secondes
    const timer = setTimeout(() => {
      console.log(`[NotificationModal] ⏰ Fermeture automatique après 8 secondes`);
      onClose();
    }, 8000);

    return () => {
      console.log(`[NotificationModal] 🧹 Nettoyage du modal`);
      clearTimeout(timer);
    };
  }, [onClose, type]);

  const messages = {
    dethroned_from_1: {
      title: "Vous avez été détrôné de la 1ère place ! 👑",
      message: "Un autre joueur vous a dépassé et prend la tête du classement.",
      emoji: "😢",
      color: "from-amber-500 to-yellow-600",
    },
    dethroned_from_2: {
      title: "Vous avez perdu la 2ème place ! 🥈",
      message: "Vous n'êtes plus sur le podium, continuez à vous battre !",
      emoji: "😔",
      color: "from-gray-400 to-gray-600",
    },
    dethroned_from_3: {
      title: "Vous êtes sorti du top 3 ! 🥉",
      message: "Vous n'êtes plus sur le podium, mais vous pouvez y revenir !",
      emoji: "💪",
      color: "from-orange-400 to-orange-600",
    },
  };

  const config = messages[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay avec fond semi-transparent */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className={`rounded-2xl bg-gradient-to-br ${config.color} p-8 shadow-2xl`}>
          <div className="text-center">
            <div className="mb-4 text-6xl">{config.emoji}</div>
            <h2 className="mb-3 text-2xl font-bold text-white">
              {config.title}
            </h2>
            <p className="mb-6 text-lg text-white/90">
              {config.message}
            </p>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/20 px-6 py-3 font-semibold text-white transition-all hover:bg-white/30 backdrop-blur-sm"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


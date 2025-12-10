'use client';

import Image from 'next/image';

interface TrialExtensionProgressProps {
  clubId: string;
  playersCount: number;
  matchesCount: number;
  autoExtensionUnlocked: boolean;
}

export default function TrialExtensionProgress({
  clubId,
  playersCount,
  matchesCount,
  autoExtensionUnlocked,
}: TrialExtensionProgressProps) {

  // Si l'extension automatique est déjà débloquée, ne pas afficher
  if (autoExtensionUnlocked) {
    return null;
  }

  const objectives = [
    {
      label: 'Joueurs',
      current: playersCount,
      target: 10,
      image: '/images/profil.png',
      completed: playersCount >= 10,
    },
    {
      label: 'Matchs',
      current: matchesCount,
      target: 20,
      image: '/images/enregistrer un match.png',
      completed: matchesCount >= 20,
    },
  ];

  const completedCount = objectives.filter(obj => obj.completed).length;
  const allCompleted = completedCount === objectives.length;
  const atLeastOneCompleted = completedCount >= 1;

  return (
    <div className="rounded-xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/20 via-green-600/10 to-emerald-500/20 p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">
          <Image 
            src="/images/cadeau accueil club.png" 
            alt="Cadeau" 
            width={32} 
            height={32} 
            className="w-8 h-8 object-contain"
            unoptimized
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">
            Débloquez +16 jours gratuits supplémentaires !
          </h3>
          <p className="text-sm text-white/80">
            Atteignez au moins un de ces objectifs pour obtenir automatiquement 16 jours d'essai gratuit en plus (total 30 jours)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {objectives.map((obj, index) => {
          const progress = Math.min((obj.current / obj.target) * 100, 100);
          const isCompleted = obj.completed;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image 
                    src={obj.image} 
                    alt={obj.label} 
                    width={20} 
                    height={20} 
                    className="w-5 h-5 object-contain flex-shrink-0"
                    unoptimized
                  />
                  <span className="text-sm font-semibold text-white">
                    {obj.label}
                  </span>
                  {isCompleted && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-200">
                      ✓ Débloqué
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/70">
                  <span className={isCompleted ? 'text-emerald-300 font-bold' : ''}>
                    {obj.current}
                  </span>
                  <span className="text-white/50"> / {obj.target}</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                      : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {atLeastOneCompleted && !allCompleted && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-400/50">
          <p className="text-sm text-emerald-200 text-center">
            🎉 Félicitations ! Vous avez débloqué l'extension automatique. Votre essai a été prolongé à 30 jours.
          </p>
        </div>
      )}

      {allCompleted && (
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/50">
          <p className="text-sm text-emerald-100 text-center font-semibold">
            🏆 Excellent ! Tous les objectifs sont atteints. Votre essai a été prolongé à 30 jours.
          </p>
        </div>
      )}

    </div>
  );
}


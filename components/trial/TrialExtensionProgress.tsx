'use client';

import { Gift, Users, Swords, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface TrialExtensionProgressProps {
  clubId: string;
  playersCount: number;
  matchesCount: number;
  autoExtensionUnlocked: boolean;
  offerType?: 'standard' | 'founder';
}

export default function TrialExtensionProgress({
  clubId,
  playersCount,
  matchesCount,
  autoExtensionUnlocked,
  offerType = 'standard',
}: TrialExtensionProgressProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [extensionGranted, setExtensionGranted] = useState(autoExtensionUnlocked);

  // Vérifier et déclencher l'extension automatique si un objectif est atteint
  useEffect(() => {
    // Si l'extension est déjà débloquée, ne rien faire
    if (autoExtensionUnlocked || extensionGranted) {
      return;
    }

    // Vérifier si au moins un objectif est atteint
    const playersReached = playersCount >= 10;
    const matchesReached = matchesCount >= 20;

    if (!playersReached && !matchesReached) {
      return; // Aucun objectif atteint, ne rien faire
    }

    // Éviter les appels multiples
    if (isChecking) {
      return;
    }

    const checkAndExtend = async () => {
      setIsChecking(true);

      try {
        const response = await fetch('/api/trial/check-and-extend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clubId }),
        });

        const data = await response.json();

        if (response.ok && data.extended) {
          setExtensionGranted(true);
          // Rafraîchir la page pour mettre à jour l'affichage
          router.refresh();
        } else if (response.ok && data.alreadyExtended) {
          setExtensionGranted(true);
        }
      } catch (error) {
        logger.error('[TrialExtensionProgress] Error checking extension:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Vérifier immédiatement et aussi après un court délai pour gérer les mises à jour asynchrones
    checkAndExtend();
    const timeoutId = setTimeout(checkAndExtend, 1000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, playersCount, matchesCount, autoExtensionUnlocked]);

  // Si l'extension automatique est déjà débloquée OU si c'est une offre fondateur (déjà 90 jours), ne pas afficher
  if (extensionGranted || autoExtensionUnlocked || offerType === 'founder') {
    return null;
  }

  const objectives = [
    {
      label: 'Joueurs',
      current: playersCount,
      target: 10,
      icon_component: <Users className="w-5 h-5 text-emerald-100" />,
      completed: playersCount >= 10,
    },
    {
      label: 'Matchs',
      current: matchesCount,
      target: 20,
      icon_component: <Swords className="w-5 h-5 text-emerald-100" />,
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
          <Gift className="w-8 h-8 text-emerald-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">
            Débloquez +15 jours gratuits supplémentaires !
          </h3>
          <p className="text-sm text-white/80">
            Atteignez au moins un de ces objectifs pour obtenir automatiquement 15 jours d'essai gratuit en plus (total 30 jours)
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
                  <div className="flex-shrink-0">
                    {obj.icon_component}
                  </div>
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
                  className={`h-full rounded-full transition-all duration-500 ${isCompleted
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


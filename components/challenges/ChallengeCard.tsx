"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { logger } from '@/lib/logger';
import { toast } from "sonner";
import { activatePremium } from "@/app/actions/premium";
import { Calendar, PartyPopper, Trophy, X, AlertCircle, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { Lock } from "lucide-react";

interface PlayerChallenge {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  objective: string;
  rewardType: "points" | "badge";
  rewardLabel: string;
  status: "active" | "upcoming" | "completed";
  progress: {
    current: number;
    target: number;
  };
  rewardClaimed: boolean;
  isPremium?: boolean;
}

interface ChallengeCardProps {
  challenge: PlayerChallenge;
  isPremiumUser?: boolean;
  onRewardClaimed?: () => void;
  onPremiumUnlocked?: () => void;
}

function formatRange(startISO: string, endISO: string) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return `${formatter.format(new Date(startISO))} → ${formatter.format(new Date(endISO))}`;
}

function statusLabel(status: PlayerChallenge["status"]) {
  switch (status) {
    case "active":
      return "Challenge en cours";
    case "upcoming":
      return "À venir";
    case "completed":
      return "Terminé";
    default:
      return "En cours";
  }
}

function statusClasses(status: PlayerChallenge["status"]) {
  switch (status) {
    case "active":
      return "bg-white/30 text-white border border-white";
    case "upcoming":
      return "bg-blue-500/20 text-blue-200 border border-blue-400/40";
    case "completed":
    default:
      return "bg-white/20 text-white/80 border border-white/25";
  }
}

export default function ChallengeCard({ challenge, isPremiumUser = false, onRewardClaimed, onPremiumUnlocked }: ChallengeCardProps) {
  const [claiming, setClaiming] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [rewardValue, setRewardValue] = useState("");
  const [hasClaimed, setHasClaimed] = useState(false);
  const [autoCloseTimeout, setAutoCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const now = new Date();
  const endDate = new Date(challenge.endDate);
  const isExpired = now > endDate;
  const isCompleted = challenge.progress.current >= challenge.progress.target;
  const isFailed = isExpired && !isCompleted;
  const canClaim = isCompleted && !challenge.rewardClaimed && !hasClaimed && !isExpired;

  const isLocked = challenge.isPremium && !isPremiumUser;

  logger.info(`[ChallengeCard ${challenge.id.substring(0, 8)}] "${challenge.title}" - Progress: ${challenge.progress.current}/${challenge.progress.target}, isCompleted: ${isCompleted}, isExpired: ${isExpired}, isFailed: ${isFailed}, canClaim: ${canClaim}, rewardClaimed: ${challenge.rewardClaimed}, hasClaimed: ${hasClaimed}, isLocked: ${isLocked}`);

  // Nettoyer le timeout si le composant est démonté ou si le pop-up est fermé
  useEffect(() => {
    return () => {
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
      }
    };
  }, [autoCloseTimeout]);

  const claimReward = async () => {
    if (claiming || challenge.rewardClaimed || hasClaimed || isLocked) {
      logger.info(`[ChallengeCard ${challenge.id.substring(0, 8)}] ❌ Cannot claim: claiming=${claiming}, rewardClaimed=${challenge.rewardClaimed}, hasClaimed=${hasClaimed}, isLocked=${isLocked}`);
      return;
    }

    logger.info(`[ChallengeCard ${challenge.id.substring(0, 8)}] 🚀 Claiming reward...`);
    setClaiming(true);
    setHasClaimed(true); // Marquer comme réclamé immédiatement pour éviter les doublons
    try {
      const response = await fetch("/api/challenges/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          rewardType: challenge.rewardType,
          rewardValue: challenge.rewardLabel,
        }),
      });

      logger.info(`[ChallengeCard ${challenge.id.substring(0, 8)}] Response status:`, response.status);

      if (response.ok) {
        const data = await response.json();
        logger.info(`[ChallengeCard ${challenge.id.substring(0, 8)}] ✅ Reward claimed successfully!`, data);
        setRewardValue(data.rewardValue);
        setShowCongrats(true);

        // Masquer le pop-up après 8 secondes (mais peut être fermé manuellement avant)
        const timeout = setTimeout(() => {
          setShowCongrats(false);
          if (onRewardClaimed) {
            onRewardClaimed();
          }
        }, 8000);
        setAutoCloseTimeout(timeout);
      } else {
        const error = await response.json();
        logger.info(`[ChallengeCard ${challenge.id.substring(0, 8)}] ⚠️ Error response:`, error);
        if (error.alreadyClaimed) {
          logger.info("Récompense déjà réclamée");
          // Garder hasClaimed = true car la récompense a déjà été réclamée
        } else {
          // Réinitialiser hasClaimed en cas d'erreur pour permettre une nouvelle tentative
          setHasClaimed(false);
          logger.info("Récompense non disponible pour le moment");
        }
      }
    } catch (error) {
      // Erreur silencieuse pour éviter de polluer la console
      logger.info(`[ChallengeCard ${challenge.id.substring(0, 8)}] 🔴 Exception:`, error);
      // Réinitialiser hasClaimed en cas d'exception pour permettre une nouvelle tentative
      setHasClaimed(false);
    } finally {
      setClaiming(false);
    }
  };

  const handleClosePopup = () => {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
      setAutoCloseTimeout(null);
    }
    setShowCongrats(false);
    if (onRewardClaimed) {
      onRewardClaimed();
    }
  };

  const percentage = Math.min((challenge.progress.current / challenge.progress.target) * 100, 100);

  return (
    <>
      {/* Pop-up de félicitations */}
      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative mx-4 max-w-md transform animate-[scale-in_0.3s_ease-out] rounded-2xl bg-gradient-to-br from-yellow-500/20 via-amber-500/15 to-orange-500/10 p-8 text-center shadow-2xl ring-2 ring-yellow-400/30">
            {/* Confettis effet */}
            <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-yellow-400/20 blur-2xl" />
            <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />

            {/* Contenu */}
            <div className="relative z-10">
              <PartyPopper className="mb-4 h-16 w-16 text-yellow-400" />
              <h2 className="mb-3 text-3xl font-bold text-yellow-300">
                Félicitations !
              </h2>
              <p className="mb-6 text-lg text-white/90">
                Vous avez complété le challenge
                <br />
                <span className="font-semibold text-white">"{challenge.title}"</span>
              </p>

              {/* Récompense */}
              <div className="mx-auto mb-6 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-yellow-400/25 to-amber-500/20 px-6 py-4 shadow-lg ring-1 ring-yellow-400/40">
                {challenge.rewardType === "points" ? (
                  <Image
                    src="/images/Étoile points challenges.png"
                    alt="Étoile"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                ) : (
                  <Image
                    src="/images/Badge.png"
                    alt="Badge"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                )}
                <div className="text-left">
                  <div className="text-sm font-medium text-yellow-200/80">
                    Récompense
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {challenge.rewardType === "points"
                      ? `+${challenge.rewardLabel} points`
                      : challenge.rewardLabel}
                  </div>
                </div>
              </div>

              <p className="mb-6 text-sm text-white/70">
                {challenge.rewardType === "points"
                  ? "Vos points ont été ajoutés à votre compte"
                  : "Le badge a été ajouté à votre page badges"}
              </p>

              {/* Bouton fermer */}
              <button
                onClick={handleClosePopup}
                className="mx-auto rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carte du challenge */}
      <div className={`group relative rounded-2xl border-2 p-1 shadow-lg transition-all duration-300 overflow-hidden ${isCompleted && !isLocked
        ? "border-blue-500 bg-gradient-to-br from-blue-600/10 via-black/40 to-black/20 shadow-blue-500/20"
        : isFailed && !isLocked
          ? "border-red-500/80 bg-gradient-to-br from-red-500/10 to-rose-500/5 shadow-red-500/20"
          : challenge.isPremium
            ? isLocked
              ? "border-amber-500/30 bg-slate-900/80"
              : "border-amber-500/60 bg-gradient-to-br from-amber-500/10 to-black/40 shadow-amber-500/10"
            : "border-white/40 bg-gradient-to-br from-white/[0.15] to-white/[0.08] hover:border-white/50 hover:shadow-xl"
        }`}>

        {/* Overlay si verrouillé */}
        {isLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[4px] text-center p-6">
            <div className="mb-3 p-3 rounded-full bg-amber-500/20 border border-amber-500/40">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Challenge Premium</h3>
            <p className="text-sm text-slate-300 mb-6 max-w-xs">
              Débloquez ce challenge et bien plus encore avec PadelXP Premium.
            </p>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (claiming) return;

                try {
                  setClaiming(true);
                  const result = await activatePremium();
                  if (result.success) {
                    if (result.verified) {
                      toast.success("Félicitations ! Premium activé et vérifié.");
                    } else if (result.warning) {
                      toast.warning(`Activé mais non vérifié: ${result.warning}`);
                    } else {
                      toast.success("Félicitations ! Vous êtes maintenant Premium.");
                    }

                    router.refresh(); // Force refresh immediately
                    if (onRewardClaimed) onRewardClaimed();
                    if (onPremiumUnlocked) onPremiumUnlocked();


                  } else {
                    toast.error("Erreur lors de l'activation : " + result.error);
                  }
                } catch (err) {
                  toast.error("Erreur inattendue");
                  logger.error("[ChallengeCard] Upgrade error", err);
                } finally {
                  setClaiming(false);
                }
              }}
              disabled={claiming}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Activation...</span>
                </>
              ) : (
                <span>Devenir Premium (Gratuit)</span>
              )}
            </button>
          </div>
        )}

        <div className={`p-4 ${isLocked ? "opacity-30 blur-[1px] pointer-events-none select-none grayscale-[0.5]" : ""}`}>
          {/* Effet brillant style top joueurs (seulement si non verrouillé) */}
          {!isLocked && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-shine-challenge">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent challenge-shine-gradient" />
              </div>
            </div>
          )}

          {/* En-tête */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="mb-2 text-xl font-bold text-white flex items-center gap-2">
                {challenge.title}
                {challenge.isPremium && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Premium
                  </span>
                )}
              </h3>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusClasses(challenge.status)}`}>
                {statusLabel(challenge.status)}
              </span>
            </div>

            {/* Badge récompense */}
            <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-yellow-500/15 to-amber-600/10 px-3 py-2 shadow ring-1 ring-yellow-400/20">
              <span className="text-[10px] font-medium uppercase tracking-wide text-yellow-200/80">
                Récompense
              </span>
              <div className="flex items-center gap-1.5">
                {challenge.rewardType === "points" ? (
                  <Image
                    src="/images/Étoile points challenges.png"
                    alt="Étoile"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-1">
                    <Image
                      src="/images/Badge.png"
                      alt="Badge"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                )}
                <span className="text-sm font-bold text-white">
                  {challenge.rewardType === "points"
                    ? `${challenge.rewardLabel} pts`
                    : challenge.rewardLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Objectif */}
          <div className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#071554]/80 to-[#071554]/40 p-4 shadow-inner">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="mb-1 text-sm font-medium text-white">Objectif</div>
                <div className="text-xs text-white">{challenge.objective}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {challenge.progress.current}/{challenge.progress.target}
                </div>
                <div className="text-xs font-medium text-white">{Math.round(percentage)}%</div>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="relative h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${isCompleted
                  ? "bg-blue-500 shadow-lg shadow-blue-500/50"
                  : "bg-blue-500 shadow-lg shadow-blue-500/30"
                  }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Indicateur de récompense réclamée */}
            {challenge.rewardClaimed && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/15 px-3 py-2 text-sm font-medium text-blue-300">
                <span>✅</span>
                <span>Récompense réclamée</span>
              </div>
            )}
          </div>

          {/* Période */}
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-white flex-shrink-0" />
            <span className="font-medium text-white">Période :</span>
            <span className="font-semibold text-white">{formatRange(challenge.startDate, challenge.endDate)}</span>
          </div>

          {/* Bouton récupérer la récompense - En bas du cadre */}
          {canClaim && !hasClaimed && (
            <div className="mb-2">
              <button
                onClick={claimReward}
                disabled={claiming}
                className="group relative w-full overflow-hidden rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                {/* Effet de brillance animé */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                {/* Contenu du bouton */}
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {claiming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Récupération...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base sm:text-lg">Récupérer la récompense</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Message de challenge terminé */}
          {isExpired && (
            <div className={`mb-5 rounded-2xl border px-4 py-3 ${isCompleted
              ? "border-blue-500/40 bg-blue-500/10"
              : "border-red-500/40 bg-red-500/10"
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isCompleted ? "✅" : "❌"}</span>
                <div>
                  <div className={`font-bold ${isCompleted ? "text-blue-300" : "text-red-300"}`}>
                    Challenge terminé
                  </div>
                  <div className={`text-sm ${isCompleted ? "text-blue-200/80" : "text-red-200/80"}`}>
                    {isCompleted
                      ? "Félicitations ! Vous avez réussi ce challenge !"
                      : "Ce challenge n'a pas été complété à temps."}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


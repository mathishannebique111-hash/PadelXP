"use client";

import { useState, useEffect } from "react";

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
}

interface ChallengeCardProps {
  challenge: PlayerChallenge;
  onRewardClaimed?: () => void;
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
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
    case "upcoming":
      return "bg-blue-500/20 text-blue-200 border border-blue-400/40";
    case "completed":
    default:
      return "bg-white/10 text-white/70 border border-white/15";
  }
}

export default function ChallengeCard({ challenge, onRewardClaimed }: ChallengeCardProps) {
  const [claiming, setClaiming] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [rewardValue, setRewardValue] = useState("");

  const isCompleted = challenge.progress.current >= challenge.progress.target;
  const canClaim = isCompleted && !challenge.rewardClaimed;

  console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] "${challenge.title}" - Progress: ${challenge.progress.current}/${challenge.progress.target}, isCompleted: ${isCompleted}, canClaim: ${canClaim}, rewardClaimed: ${challenge.rewardClaimed}`);

  // Auto-claim quand le challenge est complété
  useEffect(() => {
    console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] useEffect triggered - canClaim: ${canClaim}, claiming: ${claiming}`);
    if (canClaim && !claiming) {
      console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] 🎯 Attempting to claim reward...`);
      claimReward();
    }
  }, [canClaim, claiming]);

  const claimReward = async () => {
    if (claiming || challenge.rewardClaimed) {
      console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] ❌ Cannot claim: claiming=${claiming}, rewardClaimed=${challenge.rewardClaimed}`);
      return;
    }

    console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] 🚀 Claiming reward...`);
    setClaiming(true);
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

      console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] Response status:`, response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] ✅ Reward claimed successfully!`, data);
        setRewardValue(data.rewardValue);
        setShowCongrats(true);
        
        // Masquer le pop-up après 8 secondes
        setTimeout(() => {
          setShowCongrats(false);
          if (onRewardClaimed) {
            onRewardClaimed();
          }
        }, 8000);
      } else {
        const error = await response.json();
        console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] ⚠️ Error response:`, error);
        if (error.alreadyClaimed) {
          console.log("Récompense déjà réclamée");
        } else {
          // Ne pas afficher l'erreur si la table n'existe pas encore
          console.log("Récompense non disponible pour le moment");
        }
      }
    } catch (error) {
      // Erreur silencieuse pour éviter de polluer la console
      console.log(`[ChallengeCard ${challenge.id.substring(0, 8)}] 🔴 Exception:`, error);
    } finally {
      setClaiming(false);
    }
  };

  const percentage = Math.min((challenge.progress.current / challenge.progress.target) * 100, 100);

  return (
    <>
      {/* Pop-up de félicitations */}
      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative mx-4 max-w-md transform animate-[scale-in_0.3s_ease-out] rounded-3xl bg-gradient-to-br from-yellow-500/20 via-amber-500/15 to-orange-500/10 p-8 text-center shadow-2xl ring-2 ring-yellow-400/30">
            {/* Confettis effet */}
            <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-yellow-400/20 blur-2xl" />
            <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />

            {/* Contenu */}
            <div className="relative z-10">
              <div className="mb-4 text-6xl">🎉</div>
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
                <span className="text-4xl">
                  {challenge.rewardType === "points" ? "⭐" : "🏆"}
                </span>
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

              <p className="text-sm text-white/70">
                Vos points ont été ajoutés à votre compte
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Carte du challenge */}
      <div className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-6 shadow-xl transition-all duration-300 hover:border-white/20 hover:shadow-2xl">
        {/* En-tête */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="mb-2 text-xl font-bold text-white">{challenge.title}</h3>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusClasses(challenge.status)}`}>
              {statusLabel(challenge.status)}
            </span>
          </div>

          {/* Badge récompense */}
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br from-yellow-500/15 to-amber-600/10 px-5 py-3 shadow-lg ring-1 ring-yellow-400/20">
            <span className="text-xs font-medium uppercase tracking-wide text-yellow-200/80">
              Récompense
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {challenge.rewardType === "points" ? "⭐" : "🏆"}
              </span>
              <span className="text-lg font-bold text-white">
                {challenge.rewardType === "points"
                  ? `${challenge.rewardLabel} pts`
                  : challenge.rewardLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Période */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xl">📅</span>
            <div>
              <div className="font-medium text-white/60">Période</div>
              <div className="font-semibold text-white">{formatRange(challenge.startDate, challenge.endDate)}</div>
            </div>
          </div>
        </div>

        {/* Progression */}
        <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-4 shadow-inner">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="mb-1 text-sm font-medium text-blue-200/90">Progression</div>
              <div className="text-xs text-white/70">{challenge.objective}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {challenge.progress.current}/{challenge.progress.target}
              </div>
              <div className="text-xs font-medium text-blue-300">{Math.round(percentage)}%</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                isCompleted
                  ? "bg-gradient-to-r from-emerald-400 to-green-500 shadow-lg shadow-emerald-500/50"
                  : "bg-gradient-to-r from-blue-400 to-cyan-500 shadow-lg shadow-blue-500/30"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Indicateur de récompense réclamée */}
          {challenge.rewardClaimed && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300">
              <span>✅</span>
              <span>Récompense réclamée</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


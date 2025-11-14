"use client";

import { useRouter } from "next/navigation";
import ChallengeCard from "./ChallengeCard";

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

interface ChallengesListProps {
  challenges: PlayerChallenge[];
}

export default function ChallengesList({ challenges }: ChallengesListProps) {
  const router = useRouter();

  const handleRewardClaimed = () => {
    // Recharger la page pour mettre à jour les données
    router.refresh();
  };

  if (challenges.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-14 text-center text-white">
        Aucun challenge n'a encore été publié par votre club. Revenez bientôt !
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          onRewardClaimed={handleRewardClaimed}
        />
      ))}
    </div>
  );
}


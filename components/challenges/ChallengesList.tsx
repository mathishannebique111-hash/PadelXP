"use client";

import { useState } from "react";
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
  scope: 'global' | 'club';
}

interface ChallengesListProps {
  challenges: PlayerChallenge[];
}

export default function ChallengesList({ challenges }: ChallengesListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'club'>('general');

  const handleRewardClaimed = () => {
    router.refresh();
  };

  const filteredChallenges = challenges.filter(c =>
    activeTab === 'general' ? c.scope === 'global' : c.scope === 'club'
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-xl w-full sm:w-fit mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'general'
            ? 'bg-padel-green text-slate-900 shadow-lg'
            : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
        >
          Général
        </button>
        <button
          onClick={() => setActiveTab('club')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'club'
            ? 'bg-padel-green text-slate-900 shadow-lg'
            : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
        >
          Club
        </button>
      </div>

      {filteredChallenges.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-12 text-center">
          <p className="text-white/60">
            {activeTab === 'general'
              ? "Aucun challenge général disponible pour le moment."
              : "Aucun challenge club disponible pour le moment."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onRewardClaimed={handleRewardClaimed}
            />
          ))}
        </div>
      )}
    </div>
  );
}



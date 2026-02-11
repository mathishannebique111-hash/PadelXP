"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Trophy, MapPin } from "lucide-react";
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
      <div className="flex items-center justify-center sm:justify-start gap-2 px-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'general'
            ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-lg shadow-blue-500/10'
            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
            }`}
        >
          <Globe size={14} />
          <span>Général</span>
        </button>
        <button
          onClick={() => setActiveTab('club')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'club'
            ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-lg shadow-blue-500/10'
            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
            }`}
        >
          <MapPin size={14} />
          <span>Mon Club</span>
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



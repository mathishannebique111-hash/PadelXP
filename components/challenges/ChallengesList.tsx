"use client";

import { createClient } from "@/lib/supabase/client";

import { useState, useEffect } from "react";
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
  isPremium?: boolean;
}

interface ChallengesListProps {
  challenges: PlayerChallenge[];
  isPremiumUser: boolean;
  debugInfo?: string;
}
export default function ChallengesList({ challenges, isPremiumUser = false, debugInfo }: ChallengesListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'club' | 'premium'>('general');
  // Local state for optimistic update, similar to PremiumStats
  const [isPremium, setIsPremium] = useState(isPremiumUser);

  // Sync local state with prop only if prop becomes true (to avoid race condition re-locking)
  useEffect(() => {
    if (isPremiumUser) {
      setIsPremium(true);
    }
  }, [isPremiumUser]);

  // CLIENT-SIDE VERIFICATION: Check DB directly
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .single();

          // Force update local state if client sees true (Self-healing)
          if (profile?.is_premium) {
            setIsPremium(true);
          }
        }
      } catch (e) {
        // Use silent internal logging if needed
        console.error("Error checking premium status", e);
      }
    };

    checkPremiumStatus();
  }, []);

  const handleRewardClaimed = () => {
    router.refresh();
  };

  const handlePremiumUnlocked = () => {
    setIsPremium(true);
    router.refresh();
  };

  const filteredChallenges = challenges.filter(c => {
    if (activeTab === 'general') return c.scope === 'global' && !c.isPremium;
    if (activeTab === 'club') return c.scope === 'club' && !c.isPremium;
    if (activeTab === 'premium') return !!c.isPremium;
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-center gap-3 px-2 overflow-x-auto p-4 scrollbar-hide">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'general'
            ? 'bg-[#172554] text-blue-200 border border-blue-400/50 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/50 ring-offset-2 ring-offset-[#172554]'
            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
        >
          <Globe size={14} />
          <span>Général</span>
        </button>
        <button
          onClick={() => setActiveTab('club')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'club'
            ? 'bg-[#CCFF00] text-[#172554] shadow-lg shadow-[#CCFF00]/25 ring-2 ring-[#CCFF00] ring-offset-2 ring-offset-[#172554]'
            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
        >
          <MapPin size={14} />
          <span>Mon Club</span>
        </button>
        <button
          onClick={() => setActiveTab('premium')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'premium'
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-400 ring-offset-2 ring-offset-[#172554]'
            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
        >
          <Trophy size={14} className={activeTab === 'premium' ? "text-white" : "text-amber-400"} />
          <span>Premium</span>
        </button>
      </div>

      {filteredChallenges.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-12 text-center">
          <p className="text-white/60">
            {activeTab === 'general'
              ? "Aucun challenge général disponible pour le moment."
              : activeTab === 'club'
                ? "Aucun challenge club disponible pour le moment."
                : "Aucun challenge Premium disponible pour le moment."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isPremiumUser={isPremium}
              onRewardClaimed={handleRewardClaimed}
              onPremiumUnlocked={handlePremiumUnlocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}



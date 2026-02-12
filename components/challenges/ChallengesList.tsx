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
      <div className="flex items-center justify-center sm:justify-start gap-2 px-2 overflow-x-auto">
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
        <button
          onClick={() => setActiveTab('premium')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'premium'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-lg shadow-amber-500/10'
            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
            }`}
        >
          <Trophy size={14} className="text-amber-400" />
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



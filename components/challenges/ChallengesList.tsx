"use client";

import { createClient } from "@/lib/supabase/client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, Trophy, MapPin, Search, ArrowRight } from "lucide-react";
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
  createdAt: string;
  isPremium?: boolean;
}

interface ChallengesListProps {
  challenges: PlayerChallenge[];
  isPremiumUser: boolean;
  hasClub?: boolean;
  debugInfo?: string;
}
export default function ChallengesList({ challenges, isPremiumUser = false, hasClub = false, debugInfo }: ChallengesListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'club'>('general');
  // Local state for optimistic update, similar to PremiumStats
  const [isPremium, setIsPremium] = useState(isPremiumUser);

  // Sync local state with prop only if prop becomes true (to avoid race condition re-locking)
  useEffect(() => {
    if (isPremiumUser) {
      setIsPremium(true);
    }
  }, [isPremiumUser]);

  // Read filter from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get('filter');
      if (filter === 'club') setActiveTab('club');
      else if (filter === 'general') setActiveTab('general');
    }
  }, []);

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

  const filteredChallenges = challenges
    .filter(c => {
      if (activeTab === 'general') return c.scope === 'global' || !!c.isPremium;
      if (activeTab === 'club') return c.scope === 'club' && !c.isPremium;
      return false;
    })
    .sort((a, b) => {
      // Les challenges réclamés vont à la fin
      if (a.rewardClaimed && !b.rewardClaimed) return 1;
      if (!a.rewardClaimed && b.rewardClaimed) return -1;
      // Sinon tri par date (le plus récent en haut)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
      </div>

      {filteredChallenges.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-12 text-center">
          {activeTab === 'general' ? (
            <p className="text-white/60">Aucun challenge disponible pour le moment.</p>
          ) : (
            hasClub ? (
              <p className="text-white/60">Aucun challenge club disponible pour le moment.</p>
            ) : (
              <div className="max-w-md mx-auto py-4 px-4 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white">Classement réservé aux membres</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Rejoignez un club dans l'onglet "Mon club" pour avoir accès aux challenges de votre club.
                </p>
                <button
                  onClick={() => {
                    router.push('/home?tab=club');
                  }}
                  className="inline-flex items-center gap-2 text-padel-green font-semibold text-sm hover:underline mt-2"
                >
                  Rejoindre un club <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )
          )}
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



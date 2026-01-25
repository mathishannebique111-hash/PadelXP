'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TabType = 'record' | 'history' | 'partners' | 'boost';

interface MatchTabsProps {
  activeTab?: TabType;
  recordContent: React.ReactNode;
  historyContent: React.ReactNode;
  partnersContent?: React.ReactNode;
  boostContent?: React.ReactNode;
}

function MatchTabsContent({
  activeTab = 'record',
  recordContent,
  historyContent,
  partnersContent,
  boostContent
}: MatchTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['record', 'history', 'partners', 'boost'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);
  const [pendingMatchesCount, setPendingMatchesCount] = useState<number | null>(null);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState<number | null>(null);
  const [pendingChallengesCount, setPendingChallengesCount] = useState<number | null>(null);

  // Persistent read state
  const [viewedMatchesCount, setViewedMatchesCount] = useState(0);
  const [viewedPartnersCount, setViewedPartnersCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    // Initial load
    const savedMatches = parseInt(localStorage.getItem('padelxp_viewed_matches_count') || '0');
    const savedPartners = parseInt(localStorage.getItem('padelxp_viewed_partners_count') || '0');
    setViewedMatchesCount(savedMatches);
    setViewedPartnersCount(savedPartners);
  }, []);

  // Auto-adjustment: if actual count < viewed, lower the viewed count
  useEffect(() => {
    if (pendingMatchesCount !== null && pendingMatchesCount < viewedMatchesCount) {
      setViewedMatchesCount(pendingMatchesCount);
      localStorage.setItem('padelxp_viewed_matches_count', pendingMatchesCount.toString());
    }
  }, [pendingMatchesCount, viewedMatchesCount]);

  useEffect(() => {
    if (pendingInvitationsCount !== null && pendingChallengesCount !== null) {
      const totalPartners = pendingInvitationsCount + pendingChallengesCount;
      if (totalPartners < viewedPartnersCount) {
        setViewedPartnersCount(totalPartners);
        localStorage.setItem('padelxp_viewed_partners_count', totalPartners.toString());
      }
    }
  }, [pendingInvitationsCount, pendingChallengesCount, viewedPartnersCount]);

  // Mark as viewed when active
  useEffect(() => {
    if (currentTab === 'history' && pendingMatchesCount !== null) {
      setViewedMatchesCount(pendingMatchesCount);
      localStorage.setItem('padelxp_viewed_matches_count', pendingMatchesCount.toString());
      window.dispatchEvent(new Event('badge-sync'));
    } else if (currentTab === 'partners' && pendingInvitationsCount !== null && pendingChallengesCount !== null) {
      const total = pendingInvitationsCount + pendingChallengesCount;
      setViewedPartnersCount(total);
      localStorage.setItem('padelxp_viewed_partners_count', total.toString());
      window.dispatchEvent(new Event('badge-sync'));
    }
  }, [currentTab, pendingMatchesCount, pendingInvitationsCount, pendingChallengesCount]);

  useEffect(() => {
    if (tabFromUrl && ['record', 'history', 'partners', 'boost'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Fetch pending matches count for badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/matches/pending', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPendingMatchesCount(data.totalPending || 0);
        }
      } catch (error) {
        console.error('Error fetching pending matches count:', error);
      }
    };

    fetchPendingCount();

    // Refresh when coming back to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPendingCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for matchFullyConfirmed event to decrement badge
    const handleMatchConfirmed = () => {
      setPendingMatchesCount(prev => (prev !== null ? Math.max(0, prev - 1) : 0));
    };
    window.addEventListener('matchFullyConfirmed', handleMatchConfirmed);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('matchFullyConfirmed', handleMatchConfirmed);
    };
  }, []);

  // Load pending invitations and challenges for partners tab badge
  useEffect(() => {
    const loadPendingInvitationsCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count: matchInvitationsCount } = await supabase
          .from('match_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString());

        setPendingInvitationsCount(matchInvitationsCount || 0);
      } catch (error) {
        console.error('[MatchTabs] Error loading invitations count:', error);
      }
    };

    const loadPendingChallengesCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: challenges } = await supabase
          .from('team_challenges')
          .select('id, defender_player_1_id, defender_player_2_id, defender_1_status, defender_2_status, status')
          .or(`defender_player_1_id.eq.${user.id},defender_player_2_id.eq.${user.id}`)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString());

        const pendingCount = (challenges || []).filter((challenge: any) => {
          const isDefender1 = challenge.defender_player_1_id === user.id;
          const myStatus = isDefender1 ? challenge.defender_1_status : challenge.defender_2_status;
          return myStatus === 'pending';
        }).length;

        setPendingChallengesCount(pendingCount);
      } catch (error) {
        console.error('[MatchTabs] Error loading challenges count:', error);
      }
    };

    loadPendingInvitationsCount();
    loadPendingChallengesCount();

    // Listen for events
    const handleInvitationEvent = () => loadPendingInvitationsCount();
    const handleChallengeEvent = () => loadPendingChallengesCount();

    window.addEventListener("matchInvitationCreated", handleInvitationEvent);
    window.addEventListener("matchInvitationDeleted", handleInvitationEvent);
    window.addEventListener("teamChallengeCreated", handleChallengeEvent);
    window.addEventListener("teamChallengeUpdated", handleChallengeEvent);

    return () => {
      window.removeEventListener("matchInvitationCreated", handleInvitationEvent);
      window.removeEventListener("matchInvitationDeleted", handleInvitationEvent);
      window.removeEventListener("teamChallengeCreated", handleChallengeEvent);
      window.removeEventListener("teamChallengeUpdated", handleChallengeEvent);
    };
  }, [supabase]);

  const tabs = [
    { id: 'record' as TabType, label: 'Enregistrer' },
    {
      id: 'history' as TabType,
      label: 'Mes matchs',
      badge: (pendingMatchesCount !== null && pendingMatchesCount > viewedMatchesCount)
        ? (pendingMatchesCount - viewedMatchesCount)
        : 0
    },
    {
      id: 'partners' as TabType,
      label: 'Trouve tes partenaires',
      badge: (pendingInvitationsCount !== null && pendingChallengesCount !== null && (pendingInvitationsCount + pendingChallengesCount) > viewedPartnersCount)
        ? ((pendingInvitationsCount + pendingChallengesCount) - viewedPartnersCount)
        : 0
    },
    // { id: 'boost' as TabType, label: 'Boost' },
  ];

  return (
    <div className="w-full">
      {/* Onglets */}
      <div className="flex items-center justify-between w-full mb-4 sm:mb-6 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentTab(tab.id);
              // Mettre à jour l'URL sans recharger la page pour que le reload() garde l'onglet
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('tab', tab.id);
              window.history.replaceState(null, '', newUrl.toString());
            }}
            className={`px-1 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${currentTab === tab.id
              ? 'text-white border-b-2 border-padel-green'
              : 'text-white/60 hover:text-white/80'
              }`}
          >
            <div className="flex items-center justify-center gap-1.5 px-1 sm:px-2 h-full">
              <span className="text-center whitespace-normal leading-tight max-w-[80px] sm:max-w-none">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white flex-shrink-0">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            {currentTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-padel-green" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="mt-4 sm:mt-6">
        <div className={currentTab === 'record' ? 'block' : 'hidden'}>
          {recordContent}
        </div>
        <div className={currentTab === 'history' ? 'block' : 'hidden'}>
          {historyContent}
        </div>
        {partnersContent && (
          <div className={currentTab === 'partners' ? 'block' : 'hidden'}>
            {partnersContent}
          </div>
        )}
        {boostContent && (
          <div className={currentTab === 'boost' ? 'block' : 'hidden'}>
            {boostContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchTabs(props: MatchTabsProps) {
  return (
    <Suspense fallback={
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Enregistrer</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mes matchs</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Trouve tes partenaires</div>
          {/* <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Boost</div> */}
        </div>
        <div className="mt-4 sm:mt-6 flex items-center justify-center">
          <div className="text-white/60">Chargement...</div>
        </div>
      </div>
    }>
      <MatchTabsContent {...props} />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TabType = 'stats' | 'leaderboard' | 'padel' | 'partners';

interface PlayerProfileTabsProps {
  activeTab?: TabType;
  statsContent: React.ReactNode;
  leaderboardContent: React.ReactNode;
  padelContent?: React.ReactNode;
  partnersContent?: React.ReactNode;
}

function PlayerProfileTabsContent({
  activeTab = 'stats',
  statsContent,
  leaderboardContent,
  padelContent,
  partnersContent
}: PlayerProfileTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['stats', 'leaderboard', 'padel', 'partners'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0);
  const [pendingPartnershipRequestsCount, setPendingPartnershipRequestsCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadPendingInvitationsCount();
    loadPendingChallengesCount();
    loadPendingPartnershipRequestsCount();
    // Écouter les événements de création/suppression d'invitation (sans polling)
    const handleInvitationEvent = () => {
      loadPendingInvitationsCount();
    };
    const handleChallengeEvent = () => {
      loadPendingChallengesCount();
    };
    const handlePartnershipEvent = () => {
      loadPendingPartnershipRequestsCount();
    };
    window.addEventListener("matchInvitationCreated", handleInvitationEvent);
    window.addEventListener("matchInvitationDeleted", handleInvitationEvent);
    window.addEventListener("matchInvitationUpdated", handleInvitationEvent);
    window.addEventListener("teamChallengeCreated", handleChallengeEvent);
    window.addEventListener("teamChallengeUpdated", handleChallengeEvent);
    window.addEventListener("teamChallengeDeleted", handleChallengeEvent);
    window.addEventListener("profileUpdated", handlePartnershipEvent);
    return () => {
      window.removeEventListener("matchInvitationCreated", handleInvitationEvent);
      window.removeEventListener("matchInvitationDeleted", handleInvitationEvent);
      window.removeEventListener("matchInvitationUpdated", handleInvitationEvent);
      window.removeEventListener("teamChallengeCreated", handleChallengeEvent);
      window.removeEventListener("teamChallengeUpdated", handleChallengeEvent);
      window.removeEventListener("teamChallengeDeleted", handleChallengeEvent);
      window.removeEventListener("profileUpdated", handlePartnershipEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPendingInvitationsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Compter uniquement les invitations de paires reçues (pas les demandes de partenaires habituels)
      const { count: matchInvitationsCount, error: matchInvitationsError } = await supabase
        .from('match_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (matchInvitationsError) {
        console.error('[PlayerProfileTabs] Erreur count invitations', matchInvitationsError);
        return;
      }

      setPendingInvitationsCount(matchInvitationsCount || 0);
    } catch (error) {
      console.error('[PlayerProfileTabs] Erreur inattendue', error);
    }
  };

  const loadPendingChallengesCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Compter les défis reçus où l'utilisateur est un defender avec status pending
      const { data: challenges, error } = await supabase
        .from('team_challenges')
        .select('id, defender_player_1_id, defender_player_2_id, defender_1_status, defender_2_status, status')
        .or(`defender_player_1_id.eq.${user.id},defender_player_2_id.eq.${user.id}`)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('[PlayerProfileTabs] Erreur count challenges', error);
        return;
      }

      // Compter uniquement les défis où l'utilisateur n'a pas encore répondu (status pending pour lui)
      const pendingCount = (challenges || []).filter((challenge: any) => {
        const isDefender1 = challenge.defender_player_1_id === user.id;
        const myStatus = isDefender1 ? challenge.defender_1_status : challenge.defender_2_status;
        return myStatus === 'pending';
      }).length;

      setPendingChallengesCount(pendingCount);
    } catch (error) {
      console.error('[PlayerProfileTabs] Erreur chargement défis', error);
    }
  };

  const loadPendingPartnershipRequestsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Compter les invitations de partenaires habituels reçues
      const { count: partnershipInvitationsCount, error: partnershipInvitationsError } = await supabase
        .from('player_partnerships')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', user.id)
        .eq('status', 'pending');

      if (partnershipInvitationsError) {
        console.error('[PlayerProfileTabs] Erreur count partnership requests', partnershipInvitationsError);
        return;
      }

      setPendingPartnershipRequestsCount(partnershipInvitationsCount || 0);
    } catch (error) {
      console.error('[PlayerProfileTabs] Erreur chargement demandes partenaires', error);
    }
  };

  useEffect(() => {
    if (tabFromUrl && ['stats', 'leaderboard', 'padel', 'partners'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'stats' as TabType, label: 'Mes stats' },
    { id: 'leaderboard' as TabType, label: 'Classement global' },
    { id: 'partners' as TabType, label: 'Trouve tes partenaires', badge: pendingInvitationsCount + pendingChallengesCount },
    { id: 'padel' as TabType, label: 'Mon Profil', badge: pendingPartnershipRequestsCount },
  ];

  return (
    <div className="w-full">
      {/* Onglets */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
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
            className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${currentTab === tab.id
              ? 'text-white border-b-2 border-blue-400'
              : 'text-white/60 hover:text-white/80'
              }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </span>
            {currentTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu des onglets - GARDER TOUS MONTÉS pour les event listeners */}
      <div className="mt-4 sm:mt-6">
        <div style={{ display: currentTab === 'stats' ? 'block' : 'none' }}>
          {statsContent}
        </div>
        <div style={{ display: currentTab === 'leaderboard' ? 'block' : 'none' }}>
          {leaderboardContent}
        </div>
        {partnersContent && (
          <div style={{ display: currentTab === 'partners' ? 'block' : 'none' }}>
            {partnersContent}
          </div>
        )}
        {padelContent && (
          <div style={{ display: currentTab === 'padel' ? 'block' : 'none' }}>
            {padelContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayerProfileTabs(props: PlayerProfileTabsProps) {
  return (
    <Suspense fallback={
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mes stats</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Classement global</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Trouve tes partenaires</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mon Profil</div>
        </div>
        <div className="mt-4 sm:mt-6 flex items-center justify-center">
          <div className="text-white/60">Chargement...</div>
        </div>
      </div>
    }>
      <PlayerProfileTabsContent {...props} />
    </Suspense>
  );
}


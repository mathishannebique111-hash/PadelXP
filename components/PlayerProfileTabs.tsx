'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type TabType = 'stats' | 'leaderboard' | 'club' | 'badges';

interface PlayerProfileTabsProps {
  activeTab?: TabType;
  statsContent: React.ReactNode;
  leaderboardContent: React.ReactNode;
  clubContent: React.ReactNode;
  badgesContent: React.ReactNode;
}

export default function PlayerProfileTabs({ 
  activeTab = 'stats',
  statsContent,
  leaderboardContent,
  clubContent,
  badgesContent
}: PlayerProfileTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['stats', 'leaderboard', 'club', 'badges'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (tabFromUrl && ['stats', 'leaderboard', 'club', 'badges'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'stats' as TabType, label: 'Mes stats' },
    { id: 'leaderboard' as TabType, label: 'Classement global' },
    { id: 'club' as TabType, label: 'Mon club' },
    { id: 'badges' as TabType, label: 'Mes badges' },
  ];

  return (
    <div className="w-full">
      {/* Onglets */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${
              currentTab === tab.id
                ? 'text-white border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {tab.label}
            {currentTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="mt-4 sm:mt-6">
        {currentTab === 'stats' && <div>{statsContent}</div>}
        {currentTab === 'leaderboard' && <div>{leaderboardContent}</div>}
        {currentTab === 'club' && <div>{clubContent}</div>}
        {currentTab === 'badges' && <div>{badgesContent}</div>}
      </div>
    </div>
  );
}


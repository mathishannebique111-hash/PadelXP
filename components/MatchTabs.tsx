'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type TabType = 'record' | 'history';

interface MatchTabsProps {
  activeTab?: TabType;
  recordContent: React.ReactNode;
  historyContent: React.ReactNode;
}

export default function MatchTabs({ 
  activeTab = 'record',
  recordContent,
  historyContent 
}: MatchTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['record', 'history'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (tabFromUrl && ['record', 'history'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'record' as TabType, label: 'Enregistrer' },
    { id: 'history' as TabType, label: 'Mes matchs' },
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
        {currentTab === 'record' && <div>{recordContent}</div>}
        {currentTab === 'history' && <div>{historyContent}</div>}
      </div>
    </div>
  );
}


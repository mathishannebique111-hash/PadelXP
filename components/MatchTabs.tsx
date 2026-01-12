'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type TabType = 'record' | 'history' | 'badges';

interface MatchTabsProps {
  activeTab?: TabType;
  recordContent: React.ReactNode;
  historyContent: React.ReactNode;
  badgesContent?: React.ReactNode;
}

function MatchTabsContent({ 
  activeTab = 'record',
  recordContent,
  historyContent,
  badgesContent
}: MatchTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['record', 'history', 'badges'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (tabFromUrl && ['record', 'history', 'badges'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'record' as TabType, label: 'Enregistrer' },
    { id: 'history' as TabType, label: 'Mes matchs' },
    { id: 'badges' as TabType, label: 'Mes badges' },
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
        {badgesContent && currentTab === 'badges' && <div>{badgesContent}</div>}
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
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mes badges</div>
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


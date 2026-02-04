'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type TabType = 'club' | 'classement' | 'challenges' | 'tournaments';

interface ClubTabsProps {
    activeTab?: TabType;
    clubContent: React.ReactNode;
    leaderboardContent: React.ReactNode;
    challengesContent?: React.ReactNode;
    tournamentsContent?: React.ReactNode;
}

function ClubTabsContent({
    activeTab = 'club',
    clubContent,
    leaderboardContent,
    challengesContent,
    tournamentsContent
}: ClubTabsProps) {
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams?.get('tab') as TabType | null;
    const initialTab = tabFromUrl && ['club', 'classement', 'challenges', 'tournaments'].includes(tabFromUrl) ? tabFromUrl : activeTab;
    const [currentTab, setCurrentTab] = useState<TabType>(initialTab);

    useEffect(() => {
        if (tabFromUrl && ['club', 'classement', 'challenges', 'tournaments'].includes(tabFromUrl)) {
            setCurrentTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const tabs = [
        { id: 'club' as TabType, label: 'Mon club' },
        { id: 'classement' as TabType, label: 'Classement global' },
        { id: 'challenges' as TabType, label: 'Challenges' },
        { id: 'tournaments' as TabType, label: 'Tournois' },
    ];

    return (
        <div className="w-full">
            {/* Onglets */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setCurrentTab(tab.id);
                            const newUrl = new URL(window.location.href);
                            newUrl.searchParams.set('tab', tab.id);
                            window.history.replaceState(null, '', newUrl.toString());
                        }}
                        className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative whitespace-nowrap ${currentTab === tab.id
                            ? 'text-white border-b-2 border-padel-green'
                            : 'text-white/60 hover:text-white/80'
                            }`}
                    >
                        <span>{tab.label}</span>
                        {currentTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-padel-green" />
                        )}
                    </button>
                ))}
            </div>

            {/* Contenu des onglets */}
            <div className="mt-4 sm:mt-6">
                <div style={{ display: currentTab === 'club' ? 'block' : 'none' }}>
                    {clubContent}
                </div>
                <div style={{ display: currentTab === 'classement' ? 'block' : 'none' }}>
                    {leaderboardContent}
                </div>
                {challengesContent && (
                    <div style={{ display: currentTab === 'challenges' ? 'block' : 'none' }}>
                        {challengesContent}
                    </div>
                )}
                {tournamentsContent && (
                    <div style={{ display: currentTab === 'tournaments' ? 'block' : 'none' }}>
                        {tournamentsContent}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ClubTabs(props: ClubTabsProps) {
    return (
        <Suspense fallback={
            <div className="w-full">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
                    <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mon club</div>
                    <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Classement global</div>
                    <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Challenges</div>
                    <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Tournois</div>
                </div>
                <div className="mt-4 sm:mt-6 flex items-center justify-center">
                    <div className="text-white/60">Chargement...</div>
                </div>
            </div>
        }>
            <ClubTabsContent {...props} />
        </Suspense>
    );
}


'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PadelLoader from "@/components/ui/PadelLoader";

type TabType = 'club' | 'classement' | 'challenges' | 'tournaments';

interface ClubTabsProps {
    activeTab?: TabType;
    clubContent: React.ReactNode;
    leaderboardContent: React.ReactNode;
    challengesContent?: React.ReactNode;
    tournamentsContent?: React.ReactNode;
    showClubTab?: boolean;
}

function ClubTabsContent({
    activeTab = 'club',
    clubContent,
    leaderboardContent,
    challengesContent,
    tournamentsContent,
    showClubTab = true
}: ClubTabsProps) {
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams?.get('tab') as TabType | null;

    // Determine the effective initial tab
    // If club tab is hidden and activeTab was 'club', fallback to 'classement'
    const effActiveTab = (!showClubTab && activeTab === 'club') ? 'classement' : activeTab;

    const initialTab = tabFromUrl && ['club', 'classement', 'challenges', 'tournaments'].includes(tabFromUrl)
        ? tabFromUrl
        : effActiveTab;

    const [currentTab, setCurrentTab] = useState<TabType>(initialTab);

    useEffect(() => {
        if (tabFromUrl && ['club', 'classement', 'challenges', 'tournaments'].includes(tabFromUrl)) {
            setCurrentTab(tabFromUrl);
        } else if (!showClubTab && currentTab === 'club') {
            setCurrentTab('classement');
        }
    }, [tabFromUrl, showClubTab]);

    const tabs = [
        { id: 'club' as TabType, label: 'Mon club' },
        { id: 'classement' as TabType, label: 'Classement global' },
        { id: 'challenges' as TabType, label: 'Challenges' },
        { id: 'tournaments' as TabType, label: 'Tournois' },
    ].filter(tab => showClubTab || tab.id !== 'club');

    return (
        <div className="w-full">
            {/* Onglets */}
            <div className={`grid ${showClubTab ? 'grid-cols-4' : 'grid-cols-3'} w-full mb-4 sm:mb-6 border-b border-white/10`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setCurrentTab(tab.id);
                            const newUrl = new URL(window.location.href);
                            newUrl.searchParams.set('tab', tab.id);
                            window.history.replaceState(null, '', newUrl.toString());
                        }}
                        className={`px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold transition-all duration-200 relative flex items-center justify-center ${currentTab === tab.id
                            ? 'text-white border-b-2 border-padel-green'
                            : 'text-white/60 hover:text-white/80'
                            }`}
                    >
                        <span className="text-center whitespace-normal leading-tight">{tab.label}</span>
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
                <div className="grid grid-cols-4 w-full mb-4 sm:mb-6 border-b border-white/10">
                    <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                        <span className="text-center whitespace-normal leading-tight">Mon club</span>
                    </div>
                    <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                        <span className="text-center whitespace-normal leading-tight">Classement global</span>
                    </div>
                    <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                        <span className="text-center whitespace-normal leading-tight">Challenges</span>
                    </div>
                    <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                        <span className="text-center whitespace-normal leading-tight">Tournois</span>
                    </div>
                </div>
                <div className="mt-8 flex items-center justify-center">
                    <PadelLoader />
                </div>
            </div>
        }>
            <ClubTabsContent {...props} />
        </Suspense>
    );
}


'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type TabType = 'book' | 'my-reservations';

interface BookingTabsProps {
    bookingContent: React.ReactNode;
    reservationsContent: React.ReactNode;
    activeTab?: TabType;
    pendingCount?: number;
}

function BookingTabsContent({
    bookingContent,
    reservationsContent,
    activeTab = 'book',
    pendingCount = 0
}: BookingTabsProps) {
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams?.get('tab') as TabType | null;
    const initialTab = tabFromUrl && ['book', 'my-reservations'].includes(tabFromUrl) ? tabFromUrl : activeTab;
    const [currentTab, setCurrentTab] = useState<TabType>(initialTab);

    useEffect(() => {
        if (tabFromUrl && ['book', 'my-reservations'].includes(tabFromUrl)) {
            setCurrentTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const tabs = [
        { id: 'book' as TabType, label: 'Réserver' },
        { id: 'my-reservations' as TabType, label: 'Mes réservations' },
    ];

    return (
        <div className="w-full">
            {/* Onglets */}
            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-0 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setCurrentTab(tab.id);
                            const newUrl = new URL(window.location.href);
                            newUrl.searchParams.set('tab', tab.id);
                            window.history.replaceState(null, '', newUrl.toString());
                        }}
                        className={`w-full sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold transition-all duration-200 relative whitespace-nowrap text-center ${currentTab === tab.id
                            ? 'text-white'
                            : 'text-white/60 hover:text-white/80'
                            }`}
                    >
                        <span>{tab.label}</span>
                        {tab.id === 'my-reservations' && pendingCount > 0 && (
                            <span className="absolute top-2 right-1 sm:right-2 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                        {currentTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-padel-green" />
                        )}
                    </button>
                ))}
            </div>

            {/* Contenu des onglets */}
            <div>
                <div style={{ display: currentTab === 'book' ? 'block' : 'none' }}>
                    {bookingContent}
                </div>
                <div style={{ display: currentTab === 'my-reservations' ? 'block' : 'none' }}>
                    {reservationsContent}
                </div>
            </div>
        </div>
    );
}

export default function BookingTabs(props: BookingTabsProps) {
    return (
        <Suspense fallback={
            <div className="w-full">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
                    <div className="px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold text-white/60">Réserver</div>
                    <div className="px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold text-white/60">Mes réservations</div>
                </div>
                <div className="mt-4 sm:mt-6 flex items-center justify-center">
                    <div className="text-white/60">Chargement...</div>
                </div>
            </div>
        }>
            <BookingTabsContent {...props} />
        </Suspense>
    );
}

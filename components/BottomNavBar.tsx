'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Swords, Users, Trophy } from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    navKey: string;
}

export default function BottomNavBar() {
    const pathname = usePathname();
    const [pendingMatchesCount, setPendingMatchesCount] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);

    const navItems: NavItem[] = [
        { href: '/home', label: 'Profil', icon: <Home size={20} />, navKey: 'home' },
        { href: '/match/new', label: 'Matchs', icon: <Swords size={20} />, navKey: 'match' },
        { href: '/club', label: 'Club', icon: <Users size={20} />, navKey: 'club' },
        { href: '/tournaments', label: 'Tournois', icon: <Trophy size={20} />, navKey: 'tournaments' },
    ];

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
    }, [pathname]);

    useEffect(() => {
        let newIndex = 0;
        if (pathname === '/home' || pathname?.startsWith('/home')) newIndex = 0;
        else if (pathname === '/match/new' || pathname?.startsWith('/match')) newIndex = 1;
        else if (pathname === '/club' || pathname?.startsWith('/club')) newIndex = 2;
        else if (pathname === '/tournaments' || pathname?.startsWith('/tournaments')) newIndex = 3;
        setActiveIndex(newIndex);
    }, [pathname]);

    // Calculate bubble position based on index
    const getBubblePosition = () => {
        const itemWidth = 25; // percentage per item
        const bubbleWidth = 22; // percentage for bubble
        const offset = (itemWidth - bubbleWidth) / 2;
        return `${activeIndex * itemWidth + offset}%`;
    };

    return (
        <div
            className="fixed z-[99999] left-0 right-0 flex justify-center px-6"
            style={{
                bottom: 'calc(var(--sab, 0px) + 4px)',
            }}
        >
            <nav className="relative flex items-center bg-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] px-1 py-1 max-w-xs w-full">
                {/* Animated bubble indicator */}
                <div
                    className="absolute bg-[#172554]/15 rounded-full transition-all duration-300 ease-out"
                    style={{
                        height: 'calc(100% - 6px)',
                        width: '22%',
                        left: getBubblePosition(),
                        top: '3px',
                    }}
                />

                {navItems.map((item, index) => {
                    const isActive = activeIndex === index;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center py-1.5 z-10"
                            style={{ flex: 1 }}
                        >
                            <div className="relative flex flex-col items-center text-[#172554]">
                                {item.icon}
                                {/* Badge for pending matches */}
                                {item.navKey === 'match' && pendingMatchesCount > 0 && (
                                    <span className="absolute -top-1 -right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                                        {pendingMatchesCount > 9 ? '9+' : pendingMatchesCount}
                                    </span>
                                )}
                                <span className={`text-[9px] font-semibold mt-0.5 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                    {item.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

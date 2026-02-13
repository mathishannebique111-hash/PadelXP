'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Swords, Users, LayoutGrid, Trophy } from 'lucide-react';
import { PushNotificationsService } from '@/lib/notifications/push-notifications';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    navKey: string;
}

export default function BottomNavBar() {
    const pathname = usePathname();
    const [counts, setCounts] = useState({ matches: 0, invitations: 0, notifications: 0 });
    const [viewedMatchesCount, setViewedMatchesCount] = useState(0);
    const [viewedPartnersCount, setViewedPartnersCount] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);

    const navItems: NavItem[] = [
        { href: '/home', label: 'Profil', icon: <Home size={20} />, navKey: 'home' },
        { href: '/match/new', label: 'Matchs', icon: <Swords size={20} />, navKey: 'match' },
        { href: '/club', label: 'Compétition', icon: <Trophy size={20} />, navKey: 'club' },
        // TEMPORAIRE: Activé pour tester le flux de paiement Stripe Connect
        { href: '/book', label: 'Réserver', icon: <LayoutGrid size={20} />, navKey: 'book' },
    ];

    const fetchCounts = async () => {
        try {
            const res = await fetch('/api/notifications/count', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setCounts(data);

                // Auto-adjust viewed counts if they are higher than actual (e.g. validé ailleurs)
                const storedMatches = parseInt(localStorage.getItem('padelxp_viewed_matches_count') || '0');
                if (data.matches < storedMatches) {
                    localStorage.setItem('padelxp_viewed_matches_count', data.matches.toString());
                    setViewedMatchesCount(data.matches);
                }

                const totalPartners = (data.invitations || 0) + (data.notifications || 0); // Approx logic matching MatchTabs
                const storedPartners = parseInt(localStorage.getItem('padelxp_viewed_partners_count') || '0');
                if (totalPartners < storedPartners) {
                    localStorage.setItem('padelxp_viewed_partners_count', totalPartners.toString());
                    setViewedPartnersCount(totalPartners);
                }

                // Mettre à jour le badge natif de l'application (Icone téléphone)
                const total = (data.total || 0);
                await PushNotificationsService.setBadge(total);
            }
        } catch (error) {
            console.error('Error fetching notification counts:', error);
        }
    };

    useEffect(() => {
        const loadViewed = () => {
            setViewedMatchesCount(parseInt(localStorage.getItem('padelxp_viewed_matches_count') || '0'));
            setViewedPartnersCount(parseInt(localStorage.getItem('padelxp_viewed_partners_count') || '0'));
        };
        loadViewed();

        fetchCounts();

        // Polling toutes les 30s pour garder à jour
        const interval = setInterval(fetchCounts, 30000);

        // Ecouter les événements pour mise à jour immédiate
        const handleUpdate = () => {
            fetchCounts();
            loadViewed(); // Also reload viewed in case MatchTabs updated it
        };

        window.addEventListener('matchFullyConfirmed', handleUpdate);
        window.addEventListener('matchInvitationCreated', handleUpdate);
        window.addEventListener('matchInvitationDeleted', handleUpdate);
        window.addEventListener('matchInvitationUpdated', handleUpdate);
        window.addEventListener('teamChallengeCreated', handleUpdate);
        window.addEventListener('teamChallengeUpdated', handleUpdate);
        window.addEventListener('badge-sync', loadViewed); // Sync from MatchTabs

        return () => {
            clearInterval(interval);
            window.removeEventListener('matchFullyConfirmed', handleUpdate);
            window.removeEventListener('matchInvitationCreated', handleUpdate);
            window.removeEventListener('matchInvitationDeleted', handleUpdate);
            window.removeEventListener('matchInvitationUpdated', handleUpdate);
            window.removeEventListener('teamChallengeCreated', handleUpdate);
            window.removeEventListener('teamChallengeUpdated', handleUpdate);
            window.removeEventListener('badge-sync', loadViewed);
        };
    }, []);

    // Gestion du "Dismiss" automatique à la visite
    useEffect(() => {
        // NOTE: Actually MatchTabs handles the "match" view.
        // But if we navigate directly via BottomNav to /home (Profil), we should mark Profil/partners as viewed here too.
        if (pathname === '/home' || pathname === '/player/profile') {
            // Profil affiche les invitations + notifs générales
            const total = counts.invitations + counts.notifications;
            if (total > viewedPartnersCount) {
                localStorage.setItem('padelxp_viewed_partners_count', total.toString());
                setViewedPartnersCount(total);
            }
        }
        // For '/match/new', MatchTabs handles it, but good to be safe:
        if (pathname?.startsWith('/match')) {
            if (counts.matches > viewedMatchesCount) {
                localStorage.setItem('padelxp_viewed_matches_count', counts.matches.toString());
                setViewedMatchesCount(counts.matches);
            }
        }
    }, [pathname, counts, viewedMatchesCount, viewedPartnersCount]);

    // Update active index
    useEffect(() => {
        let newIndex = -1; // Default to no active tab
        if (pathname === '/home' || pathname?.startsWith('/home')) newIndex = 0;
        else if (pathname === '/match/new' || pathname?.startsWith('/match')) newIndex = 1;
        else if (pathname === '/club' || pathname?.startsWith('/club')) newIndex = 2;
        else if (pathname === '/book' || pathname?.startsWith('/book') || pathname === '/reservations' || pathname?.startsWith('/reservations')) newIndex = 3;
        setActiveIndex(newIndex);
    }, [pathname]);

    // Calculate bubble position based on index and item count
    const getBubblePosition = () => {
        const totalItems = navItems.length;
        const itemWidth = 100 / totalItems;
        // Make bubble slightly smaller than the item width (e.g. 85-90% of item width)
        const bubblePercentage = itemWidth * 0.85;
        const offset = (itemWidth - bubblePercentage) / 2;
        return `${activeIndex * itemWidth + offset}%`;
    };

    const totalItems = navItems.length;
    const itemWidth = 100 / totalItems;
    const bubbleWidthPercentage = itemWidth * 0.85;

    return (
        <div
            className="fixed z-[99999] left-0 right-0 flex justify-center px-6"
            style={{
                bottom: 'calc(var(--sab, 0px) + 4px)',
            }}
        >
            <nav className="relative flex items-center bg-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] px-1 py-1 max-w-xs w-full">
                {activeIndex !== -1 && (
                    <div
                        className="absolute bg-[#172554]/15 rounded-full transition-all duration-300 ease-out"
                        style={{
                            height: 'calc(100% - 6px)',
                            width: `${bubbleWidthPercentage}%`,
                            left: getBubblePosition(),
                            top: '3px',
                        }}
                    />
                )}

                {navItems.map((item, index) => {
                    const isActive = activeIndex === index;

                    // Calculer si on affiche le badge
                    let showBadge = false;
                    let badgeCount = 0;

                    if (item.navKey === 'match') {
                        // Badge persistant tant qu'il y a des actions en attente
                        badgeCount = counts.matches;
                        showBadge = badgeCount > 0;
                    } else if (item.navKey === 'home') {
                        // Profil : Pas de badge pour l'instant car les notifications ne sont pas affichées sur cette page
                        // (Les invitations sont gérées dans l'onglet Matchs > Partenaires)
                        badgeCount = 0;
                        showBadge = false;
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            className="relative flex flex-col items-center justify-center py-1.5 z-10"
                            style={{ flex: 1 }}
                            onClick={() => {
                                // Ne pas effacer les badges ici, on laisse les pages gérer le "vu" par onglet
                            }}
                        >
                            <div className="relative flex flex-col items-center text-[#172554]">
                                {item.icon}
                                {showBadge && (
                                    <span className="absolute -top-1 -right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                                        {badgeCount > 9 ? '9+' : badgeCount}
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

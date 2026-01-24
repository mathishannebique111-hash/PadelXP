'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Swords, Users, Trophy } from 'lucide-react';
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
    const [dismissed, setDismissed] = useState<{ matches: boolean; invitations: boolean }>({
        matches: false,
        invitations: false
    });
    const [activeIndex, setActiveIndex] = useState(0);

    const navItems: NavItem[] = [
        { href: '/home', label: 'Profil', icon: <Home size={20} />, navKey: 'home' },
        { href: '/match/new', label: 'Matchs', icon: <Swords size={20} />, navKey: 'match' },
        { href: '/club', label: 'Club', icon: <Users size={20} />, navKey: 'club' },
        { href: '/tournaments', label: 'Tournois', icon: <Trophy size={20} />, navKey: 'tournaments' },
    ];

    const fetchCounts = async () => {
        try {
            const res = await fetch('/api/notifications/count', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setCounts(data);

                // Mettre à jour le badge natif de l'application (Icone téléphone)
                const total = (data.total || 0);
                await PushNotificationsService.setBadge(total);
            }
        } catch (error) {
            console.error('Error fetching notification counts:', error);
        }
    };

    useEffect(() => {
        fetchCounts();

        // Polling toutes les 30s pour garder à jour
        const interval = setInterval(fetchCounts, 30000);

        // Ecouter les événements pour mise à jour immédiate
        const handleUpdate = () => fetchCounts();

        window.addEventListener('matchFullyConfirmed', handleUpdate);
        window.addEventListener('matchInvitationCreated', handleUpdate);
        window.addEventListener('matchInvitationDeleted', handleUpdate);
        window.addEventListener('matchInvitationUpdated', handleUpdate);
        window.addEventListener('teamChallengeCreated', handleUpdate);
        window.addEventListener('teamChallengeUpdated', handleUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('matchFullyConfirmed', handleUpdate);
            window.removeEventListener('matchInvitationCreated', handleUpdate);
            window.removeEventListener('matchInvitationDeleted', handleUpdate);
            window.removeEventListener('matchInvitationUpdated', handleUpdate);
            window.removeEventListener('teamChallengeCreated', handleUpdate);
            window.removeEventListener('teamChallengeUpdated', handleUpdate);
        };
    }, []);

    // Gestion du "Dismiss" automatique à la visite
    useEffect(() => {
        if (pathname?.startsWith('/match')) {
            setDismissed(prev => ({ ...prev, matches: true }));
        } else if (pathname?.startsWith('/home') || pathname === '/player/profile') {
            // "Profil" contient souvent les invitations
            setDismissed(prev => ({ ...prev, invitations: true }));
        }
    }, [pathname]);

    // Update active index
    useEffect(() => {
        let newIndex = 0;
        if (pathname === '/home' || pathname?.startsWith('/home')) newIndex = 0;
        else if (pathname === '/match/new' || pathname?.startsWith('/match')) newIndex = 1;
        else if (pathname === '/club' || pathname?.startsWith('/club')) newIndex = 2;
        else if (pathname === '/tournaments' || pathname?.startsWith('/tournaments')) newIndex = 3;
        setActiveIndex(newIndex);
    }, [pathname]);

    // Reset dismissed si le compteur augmente (optionnel, nécessite tracking previous count)
    // Pour l'instant, disons que si on recharge l'app, ça réapparait tant que c'est pending.
    // C'est un comportement acceptable : "Tant que tu n'as pas traité, je te le rappelle au prochain lancement".
    // Mais PENDANT la session, si tu as visité, ça disparaît.

    const getBubblePosition = () => {
        const itemWidth = 25;
        const bubbleWidth = 22;
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

                    // Calculer si on affiche le badge
                    let showBadge = false;
                    let badgeCount = 0;

                    if (item.navKey === 'match') {
                        badgeCount = counts.matches;
                        showBadge = badgeCount > 0 && !dismissed.matches;
                    } else if (item.navKey === 'home') {
                        // Profil affiche les invitations + notifs générales
                        badgeCount = counts.invitations + counts.notifications;
                        showBadge = badgeCount > 0 && !dismissed.invitations;
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center py-1.5 z-10"
                            style={{ flex: 1 }}
                            onClick={() => {
                                // Forcer le dismiss immédiat au clic
                                if (item.navKey === 'match') setDismissed(prev => ({ ...prev, matches: true }));
                                if (item.navKey === 'home') setDismissed(prev => ({ ...prev, invitations: true }));
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

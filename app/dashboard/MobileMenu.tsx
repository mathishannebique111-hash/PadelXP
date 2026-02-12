'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ClientLogout from './ClientLogout';
import { useUnreadClubMessages } from '@/lib/hooks/useUnreadClubMessages';
import { NotificationBadge } from '@/components/NotificationBadge';
import {
  Home,
  Users,
  Trophy,
  History,
  Globe,
  Target,
  Medal,
  UserCog,
  CreditCard,
  Download,
  HelpCircle,
  Settings,
  Calendar
} from 'lucide-react';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { hasUnread } = useUnreadClubMessages();

  // Fermer le menu quand on change de page
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Empêcher le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const menuItems = [
    { href: '/dashboard', label: 'Accueil', icon: Home },
    { href: '/dashboard/membres', label: 'Membres', icon: Users },
    { href: '/dashboard/classement', label: 'Classement', icon: Trophy },
    { href: '/dashboard/historique', label: 'Historique des matchs', icon: History },
    { href: '/dashboard/page-club', label: 'Page publique du club', icon: Globe },
    { href: '/dashboard/challenges', label: 'Challenges', icon: Target },
    { href: '/dashboard/tournaments', label: 'Ligues', icon: Medal },
    { href: '/dashboard/roles', label: 'Rôles et accès', icon: UserCog },
    { href: '/dashboard/reservations', label: 'Réservations & Tarifs', icon: Calendar },
    { href: '/dashboard/facturation', label: 'Abonnement & essai', icon: CreditCard },
    { href: '/dashboard/import-export', label: 'Import / Export', icon: Download },
    { href: '/dashboard/aide', label: 'Aide & Support', icon: HelpCircle },
  ];

  return (
    <>
      {/* Bouton hamburger - visible uniquement sur mobile */}
      <button
        onClick={() => {
          setIsOpen(prev => !prev);
        }}
        className="md:hidden fixed top-[22px] left-4 z-[100] flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all duration-300 cursor-pointer"
        aria-label="Menu"
        type="button"
      >
        <div className="flex flex-col gap-1.5 w-6">
          <span
            className={`block h-0.5 w-full bg-white transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''
              }`}
          />
          <span
            className={`block h-0.5 w-full bg-white transition-all duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'
              }`}
          />
          <span
            className={`block h-0.5 w-full bg-white transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
          />
        </div>
      </button>

      {/* Overlay sombre - visible uniquement sur mobile quand le menu est ouvert */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-[90] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu latéral */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 md:w-64 bg-black/95 border-r border-white/10 z-[95] transition-transform duration-300 ease-in-out ${
          // Sur mobile : menu caché par défaut, s'ouvre avec le bouton
          // Sur desktop : toujours visible (pas de transform)
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="p-4 pt-20 md:pt-6 space-y-4 text-sm flex-1 h-full overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const isAideSupport = item.href === '/dashboard/aide';
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300 ${isActive ? 'from-blue-500/20 to-indigo-600/20 border-blue-400/40' : ''
                  }`}
              >
                <span className="flex items-center gap-3 font-semibold">
                  <span className="relative flex-shrink-0">
                    <IconComponent className="w-4 h-4 text-white/80" />
                    {/* Badge de notification pour Aide & Support */}
                    {isAideSupport && (
                      <NotificationBadge show={hasUnread} />
                    )}
                  </span>
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}

          {/* Boutons Réglages et Déconnexion */}
          <div className="pt-2 flex items-center gap-2">
            <Link
              href="/dashboard/parametres"
              onClick={() => setIsOpen(false)}
              title="Réglages"
              className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.05] active:scale-100 transition-all duration-300 ${pathname === '/dashboard/parametres' ? 'from-blue-500/20 to-indigo-600/20 border-blue-400/40 text-white' : ''
                }`}
            >
              <Settings className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <ClientLogout />
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}


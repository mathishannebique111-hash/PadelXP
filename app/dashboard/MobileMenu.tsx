'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ClientLogout from './ClientLogout';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
    { href: '/dashboard', label: 'Accueil', icon: '🏠' },
    { href: '/dashboard/membres', label: 'Membres', icon: '👥' },
    { href: '/dashboard/classement', label: 'Classement', icon: '🏆' },
    { href: '/dashboard/historique', label: 'Historique des matchs', icon: '📊' },
    { href: '/dashboard/page-club', label: 'Page publique du club', icon: '🌐' },
    { href: '/dashboard/challenges', label: 'Challenges', icon: '⚔️' },
    { href: '/dashboard/medias', label: 'Médias', icon: '📸' },
    { href: '/dashboard/roles', label: 'Rôles et accès', icon: '👑' },
    { href: '/dashboard/facturation', label: 'Facturation & essai', icon: '💳' },
    { href: '/dashboard/import-export', label: 'Import / Export', icon: '📥' },
    { href: '/dashboard/aide', label: 'Aide & Support', icon: '❓' },
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
            className={`block h-0.5 w-full bg-white transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-full bg-white transition-all duration-300 ${
              isOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`block h-0.5 w-full bg-white transition-all duration-300 ${
              isOpen ? '-rotate-45 -translate-y-2' : ''
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
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300 ${
                  isActive ? 'from-blue-500/20 to-indigo-600/20 border-blue-400/40' : ''
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
          <div className="pt-2">
            <ClientLogout />
          </div>
        </nav>
      </aside>
    </>
  );
}


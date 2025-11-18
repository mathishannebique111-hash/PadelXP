'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import LogoutButton from './LogoutButton';

type NavKey = "home" | "match" | "history" | "badges" | "club" | "challenges" | "reviews" | "boost";

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  navKey: NavKey;
}

export default function PlayerSidebar() {
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

  // Helper function to get icon path with proper encoding
  const getIconPath = (filename: string, version: number = 6) => {
    // Encode spaces for Next.js Image component
    const encoded = filename.replace(/\s/g, '%20');
    return `/images/${encoded}?v=${version}`;
  };

  const menuItems: MenuItem[] = [
    { href: '/home', label: 'Profil', icon: getIconPath('Profil.png'), navKey: 'home' },
    { href: '/match/new', label: 'Enregistrer un match', icon: getIconPath('Enregistrer un match.png', 8), navKey: 'match' },
    { href: '/matches/history', label: 'Historique des matchs', icon: getIconPath('Historique des matchs.png'), navKey: 'history' },
    { href: '/badges', label: 'Badges', icon: getIconPath('Badges.png', 7), navKey: 'badges' },
    { href: '/club', label: 'Mon club', icon: getIconPath('Club.png', 8), navKey: 'club' },
    { href: '/challenges', label: 'Challenges', icon: getIconPath('Challenges.png'), navKey: 'challenges' },
    { href: '/reviews', label: 'Avis', icon: getIconPath('Avis.png'), navKey: 'reviews' },
    { href: '/boost', label: 'Boost', icon: getIconPath('Boost.png'), navKey: 'boost' },
  ];

  // Déterminer la page active
  const getCurrentPage = (): NavKey | undefined => {
    if (pathname === '/home') return 'home';
    if (pathname === '/match/new') return 'match';
    if (pathname === '/matches/history') return 'history';
    if (pathname === '/badges') return 'badges';
    if (pathname === '/club') return 'club';
    if (pathname === '/challenges') return 'challenges';
    if (pathname === '/reviews') return 'reviews';
    if (pathname === '/boost') return 'boost';
    return undefined;
  };

  const currentPage = getCurrentPage();

  return (
    <>
      {/* Bouton hamburger - visible sur tous les formats */}
      <button
        onClick={() => {
          setIsOpen(prev => !prev);
        }}
        className="fixed top-4 left-4 z-[100] flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all duration-300 cursor-pointer backdrop-blur"
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

      {/* Overlay sombre - visible quand le menu est ouvert */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[90] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu latéral - toujours caché par défaut, s'ouvre avec le bouton */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-black/95 border-r border-white/10 z-[95] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="p-4 pt-20 space-y-2 text-sm flex-1 h-full overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentPage === item.navKey;
            const isMatchIcon = item.navKey === 'match';
            // Images avec des problèmes d'affichage ou qui nécessitent un traitement spécial
            const problematicIcons = ['challenges', 'badges', 'match', 'club'];
            const isProblematic = problematicIcons.includes(item.navKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-white/5 to-white/5 text-white/90 border border-white/10 hover:from-blue-500/20 hover:to-indigo-600/20 hover:border-blue-400/40 hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-100 transition-all duration-300 ${
                  isActive ? 'from-blue-500/20 to-indigo-600/20 border-blue-400/40 shadow-[0_6px_24px_rgba(37,99,235,0.35)]' : ''
                }`}
              >
                <div
                  className="w-5 h-5 flex-shrink-0 flex items-center justify-center"
                  style={{
                    transform: isMatchIcon ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s ease-in-out'
                  }}
                >
                  <Image 
                    key={`${item.navKey}-${item.icon}`}
                    src={item.icon} 
                    alt={item.label} 
                    width={20} 
                    height={20} 
                    className="w-5 h-5 object-contain" 
                    unoptimized
                    style={{ 
                      // Simplifier les filtres pour les images problématiques
                      filter: isProblematic 
                        ? 'brightness(0) invert(1)' 
                        : 'brightness(0) invert(1) grayscale(100%) contrast(1.1) saturate(0%)',
                      opacity: 1,
                      imageRendering: 'crisp-edges'
                    }}
                    onError={(e) => {
                      console.error(`Failed to load icon for ${item.label}:`, item.icon);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log(`Successfully loaded icon for ${item.label}:`, item.icon);
                    }}
                  />
                </div>
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-4 mt-4 border-t border-white/10">
            <LogoutButton variant="dark" />
          </div>
        </nav>
      </aside>
    </>
  );
}


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

  // FORCER l'affichage immédiatement, y compris avant l'hydratation complète
  // Utiliser plusieurs timers pour garantir l'affichage même si l'un échoue
  useEffect(() => {
    console.log('[PlayerSidebar] Component mounted - TOUJOURS VISIBLE (même pour nouveaux joueurs)');
    
    // Fonction pour forcer l'affichage du bouton
    const forceButtonDisplay = () => {
      const button = document.querySelector('[data-hamburger-button]') as HTMLElement;
      if (button) {
        button.style.cssText = `
          position: fixed !important;
          top: 1rem !important;
          left: 1rem !important;
          width: 3rem !important;
          height: 3rem !important;
          min-width: 3rem !important;
          min-height: 3rem !important;
          z-index: 99999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        `;
        console.log('[PlayerSidebar] Button display forced');
      }
    };
    
    // Forcer immédiatement
    forceButtonDisplay();
    
    // Forcer après des délais multiples pour garantir l'affichage même avec des problèmes de timing
    const timers = [
      setTimeout(forceButtonDisplay, 0),
      setTimeout(forceButtonDisplay, 50),
      setTimeout(forceButtonDisplay, 100),
      setTimeout(forceButtonDisplay, 200),
      setTimeout(forceButtonDisplay, 500),
    ];
    
    // Vérifier aussi sur le prochain frame
    requestAnimationFrame(forceButtonDisplay);
    requestAnimationFrame(() => requestAnimationFrame(forceButtonDisplay));
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

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
    // Encode only spaces for Next.js Image component (keep other characters as-is)
    const encoded = filename.replace(/\s/g, '%20');
    return `/images/${encoded}?v=${version}`;
  };

  const menuItems: MenuItem[] = [
    { href: '/home', label: 'Profil', icon: getIconPath('Profil.png'), navKey: 'home' },
    { href: '/match/new', label: 'Enregistrer un match', icon: getIconPath('Enregistrer un match.png', 8), navKey: 'match' },
    { href: '/matches/history', label: 'Historique des matchs', icon: getIconPath('Historique des matchs joueur.png', 12), navKey: 'history' },
    { href: '/badges', label: 'Badges', icon: getIconPath('Badge.png', 11), navKey: 'badges' },
    { href: '/club', label: 'Mon club', icon: getIconPath('Mon club.png', 10), navKey: 'club' },
    { href: '/challenges', label: 'Challenges', icon: getIconPath('Objectif page avis.png', 9), navKey: 'challenges' },
    { href: '/reviews', label: 'Avis', icon: getIconPath('Avis.png', 9), navKey: 'reviews' },
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
      {/* Bouton hamburger - TOUJOURS visible sur TOUS les formats (desktop au mobile) - FORCER L'AFFICHAGE */}
      {/* S'affiche même avant l'hydratation pour garantir la visibilité dès le SSR */}
      {/* Utiliser suppressHydrationWarning pour éviter les warnings lors de l'hydratation */}
      <button
        data-hamburger-button
        suppressHydrationWarning
        onClick={() => {
          setIsOpen(prev => !prev);
        }}
        className="flex items-center justify-center rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all duration-300 cursor-pointer backdrop-blur"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          width: '3rem',
          height: '3rem',
          minWidth: '3rem',
          minHeight: '3rem',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          visibility: 'visible',
          opacity: 1,
        } as React.CSSProperties}
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
          className="fixed inset-0 bg-black/60 transition-opacity duration-300"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99998,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu latéral - toujours caché par défaut, s'ouvre avec le bouton */}
      {/* TOUJOURS présent dans le DOM pour garantir l'affichage même pour nouveaux joueurs */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-black/95 border-r border-white/10 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: '18rem',
          zIndex: 99999,
          visibility: 'visible',
          display: 'block',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="p-4 pt-20 space-y-2 text-sm flex-1 h-full overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentPage === item.navKey;
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
                  className={`flex-shrink-0 flex items-center justify-center ${item.navKey === 'club' ? 'w-[18px] h-[18px]' : 'w-5 h-5'}`}
                >
                  <Image 
                    key={`${item.navKey}-${item.icon}`}
                    src={item.icon} 
                    alt={item.label} 
                    width={item.navKey === 'club' ? 18 : 20}
                    height={item.navKey === 'club' ? 18 : 20}
                    className={`object-contain ${item.navKey === 'club' ? 'w-[18px] h-[18px]' : 'w-5 h-5'}`}
                    unoptimized
                    style={{ 
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


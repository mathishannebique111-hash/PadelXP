'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';

export default function PlayerSidebar() {
  const pathname = usePathname();
  const isSettingsActive = pathname === '/settings';

  return (
    <>
      {/* Settings button - now part of the header flex container */}
      <Link
        href="/settings"
        prefetch={true}
        className={`relative z-[150] flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 transition-all duration-300 cursor-pointer ${isSettingsActive
          ? 'text-white'
          : 'text-white/80 hover:text-white'
          }`}
        aria-label="Réglages"
      >
        <Settings className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
      </Link>
    </>
  );
}

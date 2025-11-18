// Layout pour toutes les pages du compte joueur
// Ce fichier assure une typographie cohérente sur toutes les pages
import { Suspense } from 'react';
import PlayerSidebar from '@/components/PlayerSidebar';
import PlayerClubLogo from '@/components/PlayerClubLogo';

export default function PlayerAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <PlayerSidebar />
      </Suspense>
      <Suspense fallback={null}>
        <PlayerClubLogo />
      </Suspense>
      {children}
    </>
  );
}



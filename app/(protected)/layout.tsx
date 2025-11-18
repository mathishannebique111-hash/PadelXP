// Layout pour toutes les pages du compte joueur
// Ce fichier assure une typographie cohérente sur toutes les pages
import { Suspense } from 'react';
import PlayerSidebar from '@/components/PlayerSidebar';

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
      {children}
    </>
  );
}



'use client';

import { ReactNode } from 'react';

interface SafeScrollContainerProps {
  children: ReactNode;
  className?: string;
  topPadding?: string; // Valeur par défaut pour padding-top
  bottomPadding?: string; // Valeur par défaut pour padding-bottom
}

export default function SafeScrollContainer({ 
  children,
  className = '',
  topPadding = '1rem',
  bottomPadding = '1rem'
}: SafeScrollContainerProps) {
  return (
    <div className={`min-h-screen overflow-y-auto ${className}`}>
      <div 
        style={{
          paddingTop: `calc(env(safe-area-inset-top, 0px) + ${topPadding})`,
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomPadding})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}


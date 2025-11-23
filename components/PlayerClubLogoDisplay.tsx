"use client";

import React from "react";

interface PlayerClubLogoDisplayProps {
  publicLogoUrl: string | null;
  name: string | null;
  logoSize?: string;
}

export default function PlayerClubLogoDisplay({
  publicLogoUrl,
  name,
  logoSize = "6rem",
}: PlayerClubLogoDisplayProps) {
  return (
    <div 
      data-club-logo-container="true"
      className="absolute top-3 right-3 sm:top-4 sm:right-4 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24"
      style={{
        pointerEvents: (publicLogoUrl || name) ? 'auto' : 'none',
      } as React.CSSProperties}
    >
      {publicLogoUrl ? (
        <img
          src={publicLogoUrl}
          alt={name ? `Logo de ${name}` : "Logo du club"}
          className="h-full w-full object-contain"
          style={{
            objectFit: 'contain',
          }}
          onError={(e) => {
            console.error("[PlayerClubLogoDisplay] Erreur lors du chargement du logo:", {
              publicLogoUrl,
              name,
              error: e,
            });
          }}
        />
      ) : name ? (
        <div 
          className="rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center"
          style={{
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          <span className="text-white text-base font-bold text-center px-1" style={{ lineHeight: 1.1 }}>
            {name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
      ) : (
        <div 
          style={{
            width: '100%',
            height: '100%',
            visibility: 'visible',
            display: 'block',
            pointerEvents: 'none',
          } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
    </div>
  );
}


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
  logoSize = "7rem",
}: PlayerClubLogoDisplayProps) {
  return (
    <div 
      data-club-logo-container="true"
      style={{
        width: logoSize,
        height: logoSize,
        minWidth: logoSize,
        minHeight: logoSize,
        pointerEvents: (publicLogoUrl || name) ? 'auto' : 'none',
      } as React.CSSProperties}
    >
      {publicLogoUrl ? (
        <img
          src={publicLogoUrl}
          alt={name ? `Logo de ${name}` : "Logo du club"}
          className="h-full w-full object-contain"
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
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


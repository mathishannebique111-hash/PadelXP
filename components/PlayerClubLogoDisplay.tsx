"use client";

import React from "react";
import { logger } from '@/lib/logger';

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
  const resolvedSize = logoSize ?? "6rem";
  const containerStyle: React.CSSProperties = {
    width: resolvedSize,
    height: resolvedSize,
    minWidth: resolvedSize,
    minHeight: resolvedSize,
    maxWidth: resolvedSize,
    maxHeight: resolvedSize,
    pointerEvents: publicLogoUrl || name ? "auto" : "none",
  };

  const imageStyle: React.CSSProperties = {
    width: resolvedSize,
    height: resolvedSize,
    minWidth: resolvedSize,
    minHeight: resolvedSize,
    maxWidth: resolvedSize,
    maxHeight: resolvedSize,
    objectFit: "contain",
  };

  return (
    <div 
      data-club-logo-container="true"
      suppressHydrationWarning
      style={containerStyle}
    >
      {publicLogoUrl ? (
        <img
          src={publicLogoUrl}
          alt={name ? `Logo de ${name}` : "Logo du club"}
          className="h-full w-full object-contain"
          style={imageStyle}
          onError={(e) => {
            logger.error("[PlayerClubLogoDisplay] Erreur lors du chargement du logo:", {
              publicLogoUrl,
              name,
              error: e,
            });
          }}
        />
      ) : name ? (
        <div 
          className="rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center"
          style={imageStyle}
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


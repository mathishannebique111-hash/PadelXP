"use client";

import React from "react";

type Props = {
  className?: string;
};

export default function PadelRacketLogo({ className }: Props) {
  return (
    <svg
      viewBox="0 0 80 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
    >
      <defs>
        {/* Gradient pour les ombres subtiles */}
        <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.1)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
        </linearGradient>
      </defs>

      {/* Groupe global: tête + manche, incliné à 60° (manche collé) */}
      <g transform="rotate(60 40 60)">
        {/* Contour principal de la tête */}
        <ellipse
          cx="40"
          cy="40"
          rx="28"
          ry="32"
          fill="white"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.9"
        />
        
        {/* Ombrage subtil sur la tête */}
        <ellipse
          cx="40"
          cy="38"
          rx="27"
          ry="31"
          fill="url(#shadowGradient)"
          opacity="0.35"
        />

        {/* Grille de perforations plus visibles */}
        <g fill="rgba(0,0,0,0.6)" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5">
          {/* Rangée 1 */}
          <circle cx="32" cy="28" r="2.1" />
          <circle cx="40" cy="28" r="2.1" />
          <circle cx="48" cy="28" r="2.1" />
          
          {/* Rangée 2 */}
          <circle cx="28" cy="34" r="2.1" />
          <circle cx="36" cy="34" r="2.1" />
          <circle cx="44" cy="34" r="2.1" />
          <circle cx="52" cy="34" r="2.1" />
          
          {/* Rangée 3 */}
          <circle cx="30" cy="40" r="2.1" />
          <circle cx="38" cy="40" r="2.1" />
          <circle cx="46" cy="40" r="2.1" />
          <circle cx="54" cy="40" r="2.1" />
          
          {/* Rangée 4 */}
          <circle cx="32" cy="46" r="2.0" />
          <circle cx="40" cy="46" r="2.0" />
          <circle cx="48" cy="46" r="2.0" />
          
          {/* Rangée 5 */}
          <circle cx="34" cy="52" r="1.9" />
          <circle cx="42" cy="52" r="1.9" />
          <circle cx="50" cy="52" r="1.9" />
        </g>

        {/* Zone de transition vers le manche (collée, sans espace) */}
        <path
          d="M32 60 Q40 66 48 60 L48 66 Q40 70 32 66 Z"
          fill="white"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.9"
        />

        {/* Manche avec grip strié, collé à la tête */}
        {/* Contour du manche */}
        <rect
          x="34"
          y="66"
          width="12"
          height="45"
          rx="6"
          fill="white"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.9"
        />
        
        {/* Ombrage léger sur le manche */}
        <rect
          x="34.5"
          y="67"
          width="11"
          height="43"
          rx="5.5"
          fill="url(#shadowGradient)"
          opacity="0.25"
        />

        {/* Texture striée/rainurée */}
        <g stroke="rgba(0,0,0,0.16)" strokeWidth="0.6">
          <line x1="35" y1="72" x2="45" y2="72" />
          <line x1="35" y1="78" x2="45" y2="78" />
          <line x1="35" y1="84" x2="45" y2="84" />
          <line x1="35" y1="90" x2="45" y2="90" />
          <line x1="35" y1="96" x2="45" y2="96" />
          <line x1="35" y1="102" x2="45" y2="102" />
          <line x1="35" y1="108" x2="45" y2="108" />
        </g>

        {/* Ombrage plus prononcé en bas du grip */}
        <ellipse
          cx="40"
          cy="110"
          rx="6"
          ry="2"
          fill="rgba(0,0,0,0.18)"
        />
      </g>
    </svg>
  );
}

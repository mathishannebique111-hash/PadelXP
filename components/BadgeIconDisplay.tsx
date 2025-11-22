"use client";

import React from "react";
import Image from "next/image";

type Props = {
  icon: string;
  className?: string;
  size?: number;
  title?: string;
};

export default function BadgeIconDisplay({ icon, className = "", size = 32, title }: Props) {
  // Mapper les badges spécifiques par titre d'abord
  const getIconSrcByTitle = (badgeTitle?: string) => {
    if (!badgeTitle) return null;
    
    if (badgeTitle === "Première victoire") {
      return "/images/Badge Première victoire.png";
    }
    if (badgeTitle === "Marathonien") {
      return "/images/Badge Marathonien.png";
    }
    if (badgeTitle === "Centurion") {
      return "/images/Badge Centurion.png";
    }
    if (badgeTitle === "En progression") {
      return "/images/Badge En progression.png";
    }
    if (badgeTitle === "Top Scorer") {
      return "/images/Badge Top Scorer.png";
    }
    if (badgeTitle === "Diamant") {
      return "/images/Badge Diamant.png";
    }
    if (badgeTitle === "Amour du padel") {
      return "/images/Badge Amour du padel.png";
    }
    if (badgeTitle === "Contributeur") {
      return "/images/Badge Contributeur.png";
    }
    return null;
  };

  // Mapper les emojis vers les images
  const getIconSrc = (emoji: string, badgeTitle?: string) => {
    if (emoji === "🏆" || emoji.includes("🏆")) {
      return "/images/Trophée page badges.png";
    }
    if (emoji === "🔥" || emoji.includes("🔥")) {
      return "/images/Flamme page badges.png";
    }
    if (emoji === "💬" || emoji.includes("💬")) {
      // Si le titre est "Contributeur", utiliser le badge Contributeur, sinon utiliser le commentaire
      if (badgeTitle === "Contributeur") {
        return "/images/Badge Contributeur.png";
      }
      return "/images/Commentaire page avis.png";
    }
    if (emoji === "🎯" || emoji.includes("🎯")) {
      return "/images/Objectif page avis.png";
    }
    if (emoji === "🎾" || emoji.includes("🎾")) {
      return "/images/Enregistrer un match.png";
    }
    // Pour les autres emojis, retourner null pour utiliser l'emoji directement
    return null;
  };

  // Vérifier d'abord par titre, puis par icône
  const iconSrcByTitle = getIconSrcByTitle(title);
  const iconSrc = iconSrcByTitle || getIconSrc(icon, title);

  if (iconSrc) {
    return (
      <Image
        src={iconSrc}
        alt={icon}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  // Si pas d'image correspondante, afficher l'emoji
  return <span className={className} style={{ fontSize: size }}>{icon}</span>;
}


"use client";

import React from "react";
import Image from "next/image";
import * as LucideIcons from "lucide-react";

type Props = {
  icon: string;
  className?: string;
  size?: number;
  title?: string;
  color?: string;
};

export default function BadgeIconDisplay({ icon, className = "", size = 32, title, color: customColor }: Props) {
  // Mapper les titres de badges vers des icônes Lucide
  const getLucideIconFromTitle = (badgeTitle?: string) => {
    if (!badgeTitle) return null;
    const t = badgeTitle.toLowerCase();

    if (t.includes("partenaire")) return "Users";
    if (t.includes("vainqueur") || t.includes("victoire")) return "Trophy";
    if (t.includes("match")) return "Swords";
    if (t.includes("point")) return "Star";
    if (t.includes("niveau")) return "TrendingUp";
    if (t.includes("série") || t.includes("streak") || t.includes("flamme")) return "Flame";
    if (t.includes("marathon")) return "Activity";
    if (t.includes("centurion")) return "Crown";
    if (t.includes("score")) return "Target";
    if (t.includes("diamant")) return "Gem";
    if (t.includes("amour")) return "Heart";
    if (t.includes("contrib")) return "MessageSquare";
    if (t.includes("première")) return "Medal";

    return null;
  };

  // Mapper les couleurs par type d'icône ou titre
  const getIconColor = (iconName: string, badgeTitle?: string) => {
    if (iconName === "Trophy" || badgeTitle === "Première victoire") return "#FBBF24"; // Ambre/Or
    if (iconName === "Flame") return "#F97316"; // Orange
    if (iconName === "Timer" || iconName === "Activity") return "#3B82F6"; // Bleu
    if (iconName === "Star") return "#EAB308"; // Jaune
    if (iconName === "Target") return "#EF4444"; // Rouge
    if (iconName === "TrendingUp") return "#10B981"; // Vert
    if (iconName === "Milestone") return "#8B5CF6"; // Violet
    if (iconName === "Gem") return "#06B6D4"; // Cyan
    if (iconName === "Crown") return "#A855F7"; // Pourpre
    if (iconName === "Heart") return "#EC4899"; // Rose
    if (iconName === "MessageSquare") return "#6366F1"; // Indigo
    if (iconName === "Medal") return "#FBBF24"; // Ambre/Or
    if (iconName === "Zap") return "#FACC15"; // Jaune vif
    if (iconName === "Users") return "#60A5FA"; // Bleu clair
    if (iconName === "Calendar") return "#94A3B8"; // Ardoise
    if (iconName === "Award") return "#F59E0B"; // Ambre
    if (iconName === "Dumbbell") return "#64748B"; // Gris acier
    if (iconName === "Sparkles") return "#EAB308"; // Jaune doré
    return "currentColor";
  };

  // Tenter de récupérer l'icône Lucide
  // Si c'est un emoji, on le mappe vers un nom d'icône Lucide
  const getLucideIconName = (nameOrEmoji: string) => {
    const emojiMap: Record<string, string> = {
      "🏆": "Trophy",
      "🔥": "Flame",
      "🎾": "Ball",
      "🎯": "Target",
      "💬": "MessageSquare",
      "📈": "TrendingUp",
      "💎": "Gem",
      "🏅": "Medal",
      "🎖️": "Medal",
      "💯": "Zap",
      "⚡": "Zap",
      "🤝": "Users",
      "📅": "Calendar",
      "🗓️": "Calendar",
      "🔝": "ChevronUp",
      "👑": "Crown",
      "✨": "Sparkles",
      "💪": "Dumbbell",
      "🥇": "Award",
      "🥈": "Award",
      "🥉": "Award",
      "🎮": "Gamepad2",
    };
    return emojiMap[nameOrEmoji] || nameOrEmoji;
  };

  const lucideIconName = getLucideIconFromTitle(title) || getLucideIconName(icon);
  const LucideIcon = (LucideIcons as any)[lucideIconName];

  if (LucideIcon) {
    const finalColor = customColor || getIconColor(lucideIconName, title);
    return (
      <LucideIcon
        size={size}
        className={className}
        style={{ color: finalColor }}
        strokeWidth={2.5}
      />
    );
  }

  // Fallback : Mapper les badges spécifiques par titre pour les anciennes images
  const getIconSrcByTitle = (badgeTitle?: string) => {
    if (!badgeTitle) return null;

    if (badgeTitle === "Première victoire") return "/images/Badge Première victoire.png";
    // if (badgeTitle === "Marathonien") return "/images/Badge Marathonien.png";
    if (badgeTitle === "Centurion") return "/images/Badge Centurion.png";
    if (badgeTitle === "En progression") return "/images/Badge En progression.png";
    if (badgeTitle === "Top Scorer") return "/images/Badge Top Scorer.png";
    if (badgeTitle === "Diamant") return "/images/Badge Diamant.png";
    if (badgeTitle === "Amour du padel") return "/images/Badge Amour du padel.png";
    if (badgeTitle === "Contributeur") return "/images/Badge Contributeur.png";
    return null;
  };

  // Fallback : Mapper les emojis vers les images
  const getIconSrc = (emoji: string, badgeTitle?: string) => {
    if (emoji === "🏆" || emoji.includes("🏆")) return "/images/Trophée page badges.png";
    if (emoji === "🔥" || emoji.includes("🔥")) return "/images/Flamme page badges.png";
    if (emoji === "💬" || emoji.includes("💬")) {
      if (badgeTitle === "Contributeur") return "/images/Badge Contributeur.png";
      return "/images/Commentaire page avis.png";
    }
    if (emoji === "🎯" || emoji.includes("🎯")) return "/images/Objectif page avis.png";
    if (emoji === "🎾" || emoji.includes("🎾")) return "/images/Enregistrer un match.png";
    return null;
  };

  const iconSrc = getIconSrcByTitle(title) || getIconSrc(icon, title);

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

  // Si vraiment rien ne correspond, afficher le texte brut (emoji)
  return <span className={className} style={{ fontSize: size }}>{icon}</span>;
}

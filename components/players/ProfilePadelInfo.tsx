"use client";

import { Target, Hand, Users, Zap, TrendingUp } from "lucide-react";

interface Player {
  hand: string | null;
  preferred_side: string | null;
  frequency: string | null;
  best_shot: string | null;
  niveau_padel?: number | null;
  level: string | null;
}

interface Props {
  player: Player;
}

const handLabels: Record<string, string> = {
  right: "Droitier",
  left: "Gaucher",
};

const sideLabels: Record<string, string> = {
  left: "Gauche",
  right: "Droite",
  indifferent: "Indifférent",
};

const frequencyLabels: Record<string, string> = {
  monthly: "1x / mois",
  weekly: "1x / semaine",
  "2-3weekly": "2-3x / semaine",
  "3+weekly": "+ de 3x / semaine",
};

const shotLabels: Record<string, string> = {
  smash: "Smash",
  vibora: "Vibora",
  lob: "Lob",
  defense: "Défense",
};

const levelLabels: Record<string, string> = {
  beginner: "Je débute",
  leisure: "Loisir",
  regular: "Régulier",
  competition: "Compétition",
};

export default function ProfilePadelInfo({ player }: Props) {
  // Construire les cartes uniquement pour les données disponibles
  const infoCards = [];

  if (player.hand) {
    infoCards.push({
      icon: Hand,
      label: "Main forte",
      value: handLabels[player.hand] || player.hand,
      color: "blue",
    });
  }

  if (player.preferred_side) {
    infoCards.push({
      icon: Target,
      label: "Côté préféré",
      value: sideLabels[player.preferred_side] || player.preferred_side,
      color: "purple",
    });
  }

  if (player.frequency) {
    infoCards.push({
      icon: Users,
      label: "Fréquence de jeu",
      value: frequencyLabels[player.frequency] || player.frequency,
      color: "green",
    });
  }

  if (player.best_shot) {
    infoCards.push({
      icon: Zap,
      label: "Coup signature",
      value: shotLabels[player.best_shot] || player.best_shot,
      color: "orange",
    });
  }

  if (player.niveau_padel) {
    infoCards.push({
      icon: TrendingUp,
      label: "Niveau évalué",
      value: `${player.niveau_padel.toFixed(1)}/10`,
      color: "red",
    });
  }

  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    green: "bg-green-500/10 border-green-500/30 text-green-400",
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    red: "bg-red-500/10 border-red-500/30 text-red-400",
  };

  // Ne rien afficher si aucune donnée n'est disponible
  if (infoCards.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-bold text-white mb-4">
        Profil Padel
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {infoCards.map((info, index) => {
          const Icon = info.icon;
          return (
            <div
              key={index}
              className={`border rounded-xl p-4 ${
                colorClasses[info.color as keyof typeof colorClasses]
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className="flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs opacity-80 mb-1">{info.label}</p>
                  <p className="text-sm md:text-base font-semibold truncate">
                    {info.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

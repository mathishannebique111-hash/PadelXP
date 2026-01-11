"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Target,
  Hand,
  Users,
  Zap,
  Shield,
  Star,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Player {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  niveau_padel?: number | null;
  niveau_categorie?: string | null;
  hand: string | null;
  preferred_side: string | null;
  frequency: string | null;
  best_shot: string | null;
  level: string | null; // Niveau de l'onboarding (beginner, leisure, regular, competition)
  created_at: string;
}

interface Props {
  player: Player;
  currentUserId: string;
  compatibilityScore?: number | null;
  compatibilityTags?: string[];
}

// Labels pour les valeurs
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

export default function PlayerProfileView({
  player,
  currentUserId,
  compatibilityScore,
  compatibilityTags,
}: Props) {
  const router = useRouter();

  const playerName =
    player.first_name && player.last_name
      ? `${player.first_name} ${player.last_name}`
      : player.display_name || "Joueur";

  const firstName = player.first_name || player.display_name?.split(" ")[0] || "Joueur";

  const initials =
    player.first_name && player.last_name
      ? `${player.first_name[0]}${player.last_name[0]}`
      : player.display_name?.[0]?.toUpperCase() || "J";

  // Formater les valeurs pour l'affichage
  const mainForte = player.hand ? handLabels[player.hand] || player.hand : "Non renseigné";
  const cotePrefere = player.preferred_side
    ? sideLabels[player.preferred_side] || player.preferred_side
    : "Non renseigné";
  const frequenceJeu = player.frequency
    ? frequencyLabels[player.frequency] || player.frequency
    : "Non renseigné";
  const coupSignature = player.best_shot
    ? shotLabels[player.best_shot] || player.best_shot
    : "Non renseigné";
  const niveauOnboarding = player.level
    ? levelLabels[player.level] || player.level
    : "Non renseigné";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* HEADER FIXE - Mobile optimized */}
      <div className="sticky top-0 z-20 bg-slate-950 safe-area-top">
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="p-2 -ml-2 rounded-lg active:bg-slate-800/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={22} className="text-gray-300" />
          </button>
        </div>
      </div>

      {/* HERO SECTION - MISE EN VALEUR DU JOUEUR */}
      <div className="px-4 pt-4 pb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* Card principale avec effet de profondeur */}
          <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-3xl p-5 md:p-8 shadow-2xl border-2 border-slate-700/80">
            {/* Badge "Vérifié" si niveau évalué - Mobile optimized */}
            {player.niveau_padel && (
              <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-blue-500/20 border border-blue-400/40 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 flex items-center gap-1">
                <Shield size={12} className="text-blue-400 md:hidden" />
                <Shield size={14} className="text-blue-400 hidden md:block" />
                <span className="text-xs font-semibold text-blue-300">Vérifié</span>
              </div>
            )}

            {/* Avatar + Infos principales - Mobile centered */}
            <div className="flex flex-col items-center text-center">
              {/* Avatar avec anneau de niveau - Taille mobile */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full blur-xl opacity-20"></div>
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-700 overflow-hidden border-4 border-slate-800 shadow-xl">
                  {player.avatar_url ? (
                    <Image
                      src={player.avatar_url}
                      alt={playerName}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl md:text-3xl font-black bg-gradient-to-br from-blue-500 to-indigo-600">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Nom - Taille mobile */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                {playerName}
              </h1>

              {/* Badge niveau - VERSION MOBILE COMPACTE */}
              {player.niveau_padel && player.niveau_categorie ? (
                <div className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 shadow-lg shadow-blue-500/10 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm md:text-base shadow-lg">
                      {Math.floor(player.niveau_padel)}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] md:text-xs text-blue-300/80 font-medium leading-tight">
                        Niveau
                      </p>
                      <p className="text-xs md:text-sm font-bold text-blue-200 leading-tight">
                        {player.niveau_categorie}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-xs md:text-sm text-gray-500 italic mb-3">
                  Niveau non évalué
                </span>
              )}

              {/* Date d'inscription - Mobile mini */}
              <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-gray-500">
                <Calendar size={11} className="md:hidden" />
                <Calendar size={12} className="hidden md:block" />
                <span>
                  Membre depuis{" "}
                  {new Date(player.created_at).toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* SCORE DE COMPATIBILITÉ - Mobile optimized */}
            {compatibilityScore !== null &&
              compatibilityScore !== undefined &&
              compatibilityScore > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-5 p-3.5 md:p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm font-semibold text-green-300">
                      Compatibilité avec vous
                    </span>
                    <span className="text-xl md:text-2xl font-black text-green-400">
                      {compatibilityScore}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${compatibilityScore}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    />
                  </div>
                  {compatibilityTags && compatibilityTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {compatibilityTags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[11px] md:text-xs px-2 md:px-2.5 py-1 bg-green-500/20 text-green-300 rounded-full font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

            {/* BOUTONS D'ACTION - Mobile first (44px min) */}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                className="flex-1 py-3.5 md:py-4 px-4 bg-gradient-to-r from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all min-h-[44px]"
              >
                <MessageCircle size={18} className="md:hidden" />
                <MessageCircle size={20} className="hidden md:block" />
                <span>Proposer une partie</span>
              </button>
              <button
                type="button"
                className="py-3.5 md:py-4 px-4 bg-slate-700/50 border border-slate-600 active:bg-slate-700 text-gray-300 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all min-h-[44px] min-w-[44px]"
              >
                <Users size={18} className="md:hidden" />
                <Users size={20} className="hidden md:block" />
                <span className="hidden md:inline">Favoris</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* PROFIL PADEL - Version mobile épurée */}
      {(player.hand || player.preferred_side || player.frequency || player.best_shot || player.level) && (
        <div className="px-4 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-800/50"
          >
            <h2 className="text-base md:text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target size={18} className="text-white md:hidden" />
              <Target size={20} className="text-white hidden md:block" />
              <span>Profil Padel</span>
            </h2>

            {/* Grid mobile 1 colonne, desktop 2 colonnes */}
            <div className="space-y-3">
              {/* Main forte + Côté - 2 colonnes sur mobile aussi */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {player.hand && (
                  <InfoCard
                    icon={Hand}
                    label="Main forte"
                    value={mainForte}
                  />
                )}
                {player.preferred_side && (
                  <InfoCard
                    icon={Target}
                    label="Côté préféré"
                    value={cotePrefere}
                  />
                )}
              </div>

              {/* Fréquence - Pleine largeur */}
              {player.frequency && (
                <InfoCard
                  icon={Users}
                  label="Fréquence de jeu"
                  value={frequenceJeu}
                  full
                />
              )}

              {/* Coups signature - Pleine largeur */}
              {player.best_shot && (
                <InfoCard
                  icon={Zap}
                  label="Coup signature"
                  value={coupSignature}
                  full
                />
              )}

              {/* Niveau (onboarding) - Pleine largeur */}
              {player.level && (
                <InfoCard
                  icon={Shield}
                  label="Niveau"
                  value={niveauOnboarding}
                  full
                />
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* SECTION "POURQUOI JOUER ENSEMBLE" - Mobile optimized */}
      {player.niveau_padel && (
        <div className="px-4 pb-24 md:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-500/5 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 md:p-5"
          >
            <h3 className="text-sm md:text-base font-bold text-blue-300 mb-3 flex items-center gap-2">
              <Star size={16} className="md:hidden" />
              <Star size={18} className="hidden md:block" />
              <span>Pourquoi jouer avec {firstName} ?</span>
            </h3>
            <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span>
                <span>
                  Niveau évalué :{" "}
                  <strong className="text-white">
                    {player.niveau_padel.toFixed(1)}/10
                  </strong>
                </span>
              </li>
              {player.frequency && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span>
                  <span>
                    Joue <strong className="text-white">{frequenceJeu}</strong>
                  </span>
                </li>
              )}
              {player.best_shot && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span>
                  <span>
                    Spécialiste{" "}
                    <strong className="text-white">{coupSignature}</strong>
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span>
                <span>Même club que vous</span>
              </li>
            </ul>
          </motion.div>
        </div>
      )}

      {/* Desktop: Max width container */}
      <style jsx global>{`
        @media (min-width: 768px) {
          .px-4 {
            max-width: 768px;
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </div>
  );
}

// COMPOSANT INFO CARD - Mobile-first (blanc uniquement)
function InfoCard({
  icon: Icon,
  label,
  value,
  full = false,
}: {
  icon: any;
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div
      className={`${full ? "col-span-2" : ""} border border-white/20 bg-white/5 rounded-xl p-3 md:p-3.5`}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <Icon size={16} className="text-white flex-shrink-0 md:hidden" />
        <Icon
          size={18}
          className="text-white flex-shrink-0 hidden md:block"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] md:text-xs text-gray-400 mb-0.5 leading-tight">
            {label}
          </p>
          <p className="text-xs md:text-sm font-bold text-white truncate capitalize leading-tight">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

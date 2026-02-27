"use client";

import { useState, useCallback, useEffect } from "react";
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
  Loader2,
  MapPin,
  Crown,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import AddPhoneModal from "@/components/AddPhoneModal";
import { showToast } from "@/components/ui/Toast";
import { recordProfileView } from "@/app/actions/profile-views";

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
  username?: string | null;
  postal_code?: string | null;
  city?: string | null;
  is_premium?: boolean | null;
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
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Récupérer le paramètre 'from' pour savoir d'où vient l'utilisateur
  const fromTab = searchParams?.get('from');
  const [isInviting, setIsInviting] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<{ sent: boolean; received: boolean; senderName?: string; isAccepted?: boolean } | null>(null);

  const playerName =
    player.first_name && player.last_name
      ? `${player.first_name} ${player.last_name}`
      : player.display_name || "Joueur";

  const firstName =
    player.first_name || player.display_name?.split(" ")[0] || "Joueur";

  const initials =
    player.first_name && player.last_name
      ? `${player.first_name[0]}${player.last_name[0]}`
      : player.display_name?.[0]?.toUpperCase() || "J";

  // Formater les valeurs pour l'affichage
  const mainForte = player.hand
    ? handLabels[player.hand] || player.hand
    : "Non renseigné";
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

  const hasCompatibility =
    compatibilityScore !== null && compatibilityScore !== undefined;

  const compatibilityColor =
    hasCompatibility && typeof compatibilityScore === "number"
      ? compatibilityScore >= 70
        ? "green"
        : compatibilityScore >= 40
          ? "orange"
          : "red"
      : "green";

  const compatibilityCardClass = "bg-white/5 border border-white/20";

  const compatibilityBarClass =
    compatibilityColor === "green"
      ? "bg-emerald-500"
      : compatibilityColor === "orange"
        ? "bg-gradient-to-r from-orange-500 to-orange-400"
        : "bg-gradient-to-r from-red-500 to-red-400";

  const compatibilityTextClass =
    compatibilityColor === "green"
      ? "text-emerald-400"
      : compatibilityColor === "orange"
        ? "text-orange-400"
        : "text-red-400";

  const compatibilityLabelClass = "text-white";

  // Vérifier le statut des invitations au chargement
  useEffect(() => {
    const checkInvitationStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Vérifier si une invitation a été envoyée (pending ou accepted)
        const { data: sentInvitation } = await supabase
          .from("match_invitations")
          .select("id, status")
          .eq("sender_id", user.id)
          .eq("receiver_id", player.id)
          .in("status", ["pending", "accepted"])
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        // Vérifier si une invitation a été reçue (pending ou accepted)
        const { data: receivedInvitation } = await supabase
          .from("match_invitations")
          .select("sender_id, status")
          .eq("receiver_id", user.id)
          .eq("sender_id", player.id)
          .in("status", ["pending", "accepted"])
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        // Récupérer le profil de l'expéditeur si une invitation a été reçue
        let senderName: string | undefined = undefined;
        if (receivedInvitation) {
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, display_name")
            .eq("id", player.id)
            .maybeSingle();

          if (senderProfile) {
            senderName = senderProfile.first_name && senderProfile.last_name
              ? `${senderProfile.first_name} ${senderProfile.last_name}`
              : senderProfile.display_name || senderProfile.first_name || playerName;
          } else {
            senderName = playerName;
          }
        }

        const isAccepted = (sentInvitation?.status === "accepted") || (receivedInvitation?.status === "accepted");

        setInvitationStatus({
          sent: !!sentInvitation,
          received: !!receivedInvitation,
          senderName,
          isAccepted,
        });
      } catch (error) {
        console.error("[PlayerProfileView] Erreur vérification invitations", error);
      }
    };

    checkInvitationStatus();

    // Écouter les événements d'invitations
    const handleInvitationEvent = (event?: Event) => {
      // Si c'est une suppression et que c'est pour ce joueur, réinitialiser le statut immédiatement
      if (event && 'detail' in event && (event as CustomEvent).detail) {
        const detail = (event as CustomEvent).detail as { invitationId?: string; receiverId?: string };
        // Si l'invitation supprimée concerne ce joueur (en tant que receiver), réinitialiser le statut
        if (detail.receiverId === player.id) {
          setInvitationStatus({ sent: false, received: false, isAccepted: false });
          return;
        }
      }
      checkInvitationStatus();
    };

    window.addEventListener("matchInvitationCreated", handleInvitationEvent);
    window.addEventListener("matchInvitationUpdated", handleInvitationEvent);
    window.addEventListener("matchInvitationDeleted", handleInvitationEvent as EventListener);

    return () => {
      window.removeEventListener("matchInvitationCreated", handleInvitationEvent);
      window.removeEventListener("matchInvitationUpdated", handleInvitationEvent);
      window.removeEventListener("matchInvitationDeleted", handleInvitationEvent as EventListener);
    };
  }, [player.id, playerName, supabase]);

  // Enregistrer la visite du profil
  useEffect(() => {
    if (player.id && currentUserId && player.id !== currentUserId) {
      recordProfileView(player.id);
    }
  }, [player.id, currentUserId]);

  const createMatchInvitation = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Vérifier si une invitation existe déjà
      const { data: existing } = await supabase
        .from("match_invitations")
        .select("id, status")
        .eq("sender_id", user.id)
        .eq("receiver_id", player.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (existing) {
        showToast("Invitation déjà envoyée", "error");
        return;
      }

      // Créer l'invitation (expire après 24h)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase.from("match_invitations").insert({
        sender_id: user.id,
        receiver_id: player.id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        console.error("[PlayerProfileView] Erreur création invitation", error);
        showToast("Invitation déjà envoyée", "error");
        return;
      }

      showToast(`Invitation envoyée à ${firstName} ! Valable 24h.`, "success");

      // Mettre à jour le statut local
      setInvitationStatus({ sent: true, received: false });

      // Déclencher un événement pour recharger les composants d'invitations
      window.dispatchEvent(new CustomEvent("matchInvitationCreated"));
    } catch (e) {
      console.error("[PlayerProfileView] Erreur création invitation", e);
      showToast("Erreur réseau lors de l'envoi de l'invitation.", "error");
    }
  }, [player.id, firstName, supabase, router]);

  const handleProposeMatch = useCallback(async () => {
    try {
      setIsInviting(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[PlayerProfileView] Erreur chargement profil", error);
      }

      if (!profile?.phone_number) {
        setShowPhoneModal(true);
        return;
      }

      await createMatchInvitation();
    } finally {
      setIsInviting(false);
    }
  }, [supabase, router, createMatchInvitation]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background avec overlay - Utiliser celui du layout pour éviter les décalages de couleur */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />

      {/* Halos vert et bleu animés */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* HEADER FIXE - Mobile optimized */}
      <div className="sticky top-0 z-20 safe-area-top">
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => {
              // Retourner à l'onglet d'origine si spécifié, sinon /home
              if (fromTab === 'leaderboard') {
                router.push("/club?tab=classement");
              } else if (fromTab === 'partners') {
                router.push("/match/new?tab=partners");
              } else {
                router.push("/home");
              }
            }}
            className="p-2 -ml-2 rounded-lg active:bg-slate-800/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={22} className="text-gray-300" />
          </button>
        </div>
      </div>

      {/* HERO SECTION - MISE EN VALEUR DU JOUEUR */}
      <div className="relative z-10 px-4 pt-4 pb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* Card principale avec effet de profondeur */}
          <div className={`relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl p-5 md:p-8 shadow-2xl border-2 ${player.is_premium ? 'border-amber-500/50 shadow-amber-500/10' : 'border-slate-700/80'}`}>
            {/* Puce Membre Premium - Version Luxe - Plus compacte sur mobile */}
            {player.is_premium && (
              <div className="absolute top-3 right-2 md:top-4 md:right-4 z-10">
                <div className="relative group">
                  <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-full group-hover:bg-amber-500/30 transition-all"></div>
                  <div className="relative bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black text-[8px] md:text-[9px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-1 md:gap-1.5 border border-amber-300/30 whitespace-nowrap">
                    <Crown size={9} fill="currentColor" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
                    <span className="tracking-[0.05em]">MEMBRE PREMIUM</span>
                  </div>
                </div>
              </div>
            )}

            {/* Avatar + Infos principales - Mobile centered */}
            <div className="flex flex-col items-center text-center">
              {/* Avatar avec anneau de niveau - Taille mobile */}
              <div className="relative mb-4">
                <div className={`absolute inset-0 bg-gradient-to-br ${player.is_premium ? 'from-amber-500 to-orange-500' : 'from-blue-500 to-indigo-500'} rounded-full blur-xl opacity-20`}></div>
                <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-700 overflow-hidden border-4 ${player.is_premium ? 'border-amber-500/50' : 'border-slate-800'} shadow-xl`}>
                  {player.avatar_url ? (
                    <Image
                      src={player.avatar_url}
                      alt={playerName}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white text-2xl md:text-3xl font-black bg-gradient-to-br ${player.is_premium ? 'from-amber-400 to-amber-600' : 'from-blue-500 to-indigo-600'}`}>
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Nom - Taille mobile */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                {playerName}
              </h1>

              {/* Username - Affichage public */}
              {player.username && (
                <p className="text-sm md:text-base text-blue-300 font-medium mb-4">
                  {player.username}
                </p>
              )}

              {/* Localisation */}
              {(player.postal_code || player.city) && (
                <div className="flex items-center gap-1.5 text-xs text-blue-200/60 mb-4">
                  <MapPin size={12} className="text-padel-green" />
                  <span>
                    {player.postal_code || ''}{player.postal_code && player.city ? ' ' : ''}{player.city || ''}
                  </span>
                </div>
              )}

              {/* Badge niveau - VERSION MOBILE COMPACTE */}
              {player.niveau_padel && player.niveau_categorie ? (
                <div className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-2xl bg-white/5 border border-white/20 shadow-lg mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-white flex items-center justify-center font-black text-[#071554] text-sm md:text-base shadow-lg border border-white/10">
                      {Math.floor(player.niveau_padel)}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] md:text-xs text-blue-200/60 font-medium leading-tight">
                        Niveau
                      </p>
                      <p className="text-xs md:text-sm font-bold text-white leading-tight">
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
            {hasCompatibility && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`mt-5 p-3.5 md:p-4 rounded-2xl ${compatibilityCardClass}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs md:text-sm font-semibold ${compatibilityLabelClass}`}>
                    Compatibilité avec vous
                  </span>
                  <span
                    className={`text-xl md:text-2xl font-black ${compatibilityTextClass}`}
                  >
                    {compatibilityScore ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${compatibilityScore ?? 0}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className={`h-full ${compatibilityBarClass}`}
                  />
                </div>
                {compatibilityTags && compatibilityTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {compatibilityTags.map((tag, i) => {
                      const isSameSideOrHand = tag.toLowerCase().includes("même côté") ||
                        tag.toLowerCase().includes("mains similaires") ||
                        tag.toLowerCase().includes("même main");
                      return (
                        <span
                          key={i}
                          className={`text-[11px] md:text-xs px-2 md:px-2.5 py-1 rounded-full font-medium border border-padel-green/20 ${isSameSideOrHand
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-padel-green/10 text-padel-green"
                            }`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* BOUTONS D'ACTION - Mobile first (44px min) */}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  if (invitationStatus?.isAccepted) {
                    showToast("Une invitation de paire acceptée existe déjà avec ce joueur", "error");
                    return;
                  }
                  if (invitationStatus?.sent) {
                    showToast("Une proposition de paire a déjà été envoyée à ce joueur", "error");
                    return;
                  }
                  if (invitationStatus?.received) {
                    showToast(`Vous avez déjà une proposition de paire de ${invitationStatus.senderName || playerName}`, "error");
                    return;
                  }
                  handleProposeMatch();
                }}
                disabled={isInviting || invitationStatus?.sent || invitationStatus?.received || invitationStatus?.isAccepted}
                className="flex-1 py-3.5 md:py-4 px-4 bg-padel-green text-[#071554] rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-padel-green/20 active:scale-[0.98] transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  invitationStatus?.isAccepted
                    ? "Une invitation de paire acceptée existe déjà avec ce joueur"
                    : invitationStatus?.sent
                      ? "Une proposition de paire a déjà été envoyée à ce joueur"
                      : invitationStatus?.received
                        ? `Vous avez déjà une proposition de paire de ${invitationStatus.senderName || playerName}`
                        : undefined
                }
              >
                {isInviting ? (
                  <>
                    <Loader2 size={18} className="md:hidden animate-spin" />
                    <Loader2
                      size={20}
                      className="hidden md:block animate-spin"
                    />
                    <span>Envoi...</span>
                  </>
                ) : invitationStatus?.isAccepted ? (
                  <>
                    <MessageCircle size={18} className="md:hidden" />
                    <MessageCircle size={20} className="hidden md:block" />
                    <span>Acceptée</span>
                  </>
                ) : invitationStatus?.sent ? (
                  <>
                    <MessageCircle size={18} className="md:hidden" />
                    <MessageCircle size={20} className="hidden md:block" />
                    <span>Déjà envoyée</span>
                  </>
                ) : invitationStatus?.received ? (
                  <>
                    <MessageCircle size={18} className="md:hidden" />
                    <MessageCircle size={20} className="hidden md:block" />
                    <span>Reçue</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} className="md:hidden" />
                    <MessageCircle size={20} className="hidden md:block" />
                    <span>Inviter à jouer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div >

      {/* PROFIL PADEL - Version mobile épurée */}
      {
        (player.hand ||
          player.preferred_side ||
          player.frequency ||
          player.best_shot ||
          player.level) && (
          <div className="relative z-10 px-4 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-800/50"
            >
              <h2 className="text-base md:text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>Son profil padel</span>
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
        )
      }

      {/* SECTION "POURQUOI JOUER ENSEMBLE" - Mobile optimized */}
      {
        compatibilityTags && compatibilityTags.length > 0 && (
          <div className="relative z-10 px-4 pb-24 md:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-padel-green/5 backdrop-blur-sm border border-padel-green/20 rounded-2xl p-4 md:p-5"
            >
              <h3 className="text-sm md:text-base font-bold text-padel-green mb-3 flex items-center gap-2">
                <Star size={16} className="md:hidden fill-current" />
                <Star size={18} className="hidden md:block fill-current" />
                <span>Pourquoi jouer avec {firstName} ?</span>
              </h3>
              <ul className="space-y-2 md:space-y-2.5 text-xs md:text-sm text-gray-300">
                {compatibilityTags.map((tag, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-padel-green flex-shrink-0 mt-0.5">→</span>
                    <span>{tag}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        )
      }

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

      <AddPhoneModal
        isOpen={showPhoneModal}
        partnerFirstName={firstName}
        onClose={() => setShowPhoneModal(false)}
        onActivated={async () => {
          await createMatchInvitation();
        }}
      />
    </div >
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
      className={`${full ? "col-span-2" : ""
        } border border-white/20 bg-white/5 rounded-xl p-3 md:p-3.5`}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <Icon size={16} className="text-padel-green flex-shrink-0 md:hidden" />
        <Icon size={18} className="text-padel-green flex-shrink-0 hidden md:block" />
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


"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Loader2, User, MessageCircle, Clock, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { showToast } from "@/components/ui/Toast";
import AddPhoneModal from "@/components/AddPhoneModal";
import { openWhatsApp } from "@/lib/utils/whatsapp";

// Fonction pour calculer le temps restant avant expiration (48h)
const getTimeRemaining = (expiresAt: string, currentTime: Date): { hours: number; minutes: number; expired: boolean } | null => {
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - currentTime.getTime();

  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, expired: false };
};

interface TeamChallenge {
  id: string;
  challenger_player_1_id: string;
  challenger_player_2_id: string;
  defender_player_1_id: string;
  defender_player_2_id: string;
  status: "pending" | "accepted" | "refused";
  defender_1_status: "pending" | "accepted" | "refused";
  defender_2_status: "pending" | "accepted" | "refused";
  created_at: string;
  expires_at: string;
  challenger_1: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  challenger_2: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  defender_1: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  defender_2: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export default function ChallengesReceived() {
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingAcceptance, setPendingAcceptance] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [loadingPhones, setLoadingPhones] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // Récupérer le profil de l'utilisateur actuel
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          setCurrentUserProfile(profile);
        }
      }
    });
  }, []);

  useEffect(() => {
    loadChallenges();

    // Écouter les événements de mise à jour
    const handleChallengeEvent = () => {
      loadChallenges();
    };
    window.addEventListener("teamChallengeCreated", handleChallengeEvent);
    window.addEventListener("teamChallengeUpdated", handleChallengeEvent);
    window.addEventListener("teamChallengeDeleted", handleChallengeEvent);

    // Mettre à jour le temps toutes les secondes
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.removeEventListener("teamChallengeCreated", handleChallengeEvent);
      window.removeEventListener("teamChallengeUpdated", handleChallengeEvent);
      window.removeEventListener("teamChallengeDeleted", handleChallengeEvent);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les défis où l'utilisateur est un defender (pending ou accepted)
      const { data: challengesData, error: challengesError } = await supabase
        .from("team_challenges")
        .select("*")
        .or(`defender_player_1_id.eq.${user.id},defender_player_2_id.eq.${user.id}`)
        .in("status", ["pending", "accepted", "refused"])
        .order("created_at", { ascending: false });

      if (challengesError) {
        console.error("[ChallengesReceived] Erreur Supabase:", challengesError);
        throw challengesError;
      }

      if (!challengesData || challengesData.length === 0) {
        setChallenges([]);
        // S'assurer que currentUserId est défini même s'il n'y a pas de défis
        if (!currentUserId) setCurrentUserId(user.id);
        return;
      }

      // Définir currentUserId immédiatement pour éviter la race condition
      setCurrentUserId(user.id);

      // Récupérer les profils des challengers et des deux defenders
      const profileIds = new Set<string>();
      challengesData.forEach((challenge) => {
        profileIds.add(challenge.challenger_player_1_id);
        profileIds.add(challenge.challenger_player_2_id);
        profileIds.add(challenge.defender_player_1_id);
        profileIds.add(challenge.defender_player_2_id);
      });

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", Array.from(profileIds));

      if (profilesError) {
        console.error("[ChallengesReceived] Erreur récupération profils:", profilesError);
        throw profilesError;
      }

      const profilesMap = new Map(
        (profilesData || []).map((p) => [
          p.id,
          {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            avatar_url: p.avatar_url,
          },
        ])
      );

      const challengesWithProfiles: TeamChallenge[] = challengesData.map((challenge) => {
        const challenger1 = profilesMap.get(challenge.challenger_player_1_id) || {
          id: challenge.challenger_player_1_id,
          first_name: null,
          last_name: null,
          avatar_url: null,
        };
        const challenger2 = profilesMap.get(challenge.challenger_player_2_id) || {
          id: challenge.challenger_player_2_id,
          first_name: null,
          last_name: null,
          avatar_url: null,
        };
        const defender1 = profilesMap.get(challenge.defender_player_1_id) || {
          id: challenge.defender_player_1_id,
          first_name: null,
          last_name: null,
          avatar_url: null,
        };
        const defender2 = profilesMap.get(challenge.defender_player_2_id) || {
          id: challenge.defender_player_2_id,
          first_name: null,
          last_name: null,
          avatar_url: null,
        };

        return {
          ...challenge,
          challenger_1: challenger1,
          challenger_2: challenger2,
          defender_1: defender1,
          defender_2: defender2,
        };
      });

      setChallenges(challengesWithProfiles);
    } catch (error) {
      console.error("[ChallengesReceived] Erreur chargement", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChallenge = async (challengeId: string, challenge: TeamChallenge) => {
    try {
      setResponding(challengeId);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Vérifier que j'ai mon numéro
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle();

      if (!myProfile?.phone_number) {
        setPendingAcceptance(challengeId);
        setShowPhoneModal(true);
        setResponding(null);
        return;
      }

      // 2. Déterminer si je suis defender_1 ou defender_2
      const isDefender1 = challenge.defender_player_1_id === user.id;
      const statusField = isDefender1 ? "defender_1_status" : "defender_2_status";
      const partnerStatus = isDefender1
        ? challenge.defender_2_status
        : challenge.defender_1_status;

      // 3. Update mon statut
      const { error: updateError } = await supabase
        .from("team_challenges")
        .update({ [statusField]: "accepted" })
        .eq("id", challengeId);

      if (updateError) {
        console.error("[ChallengesReceived] Erreur update statut", updateError);
        showToast("Erreur lors de l'acceptation", "error");
        setResponding(null);
        return;
      }

      // 4. Vérifier si mon partenaire a DÉJÀ accepté
      if (partnerStatus === "accepted") {
        // Les deux ont accepté ! On passe le défi en 'accepted'
        await supabase
          .from("team_challenges")
          .update({ status: "accepted" })
          .eq("id", challengeId);

        showToast("Défi accepté ! 🔥", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("teamChallengeUpdated"));
        }
      } else {
        // Mon partenaire n'a pas encore répondu
        showToast(
          "Ton acceptation est enregistrée. En attente de ton partenaire.",
          "info"
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("teamChallengeUpdated"));
        }
      }

      setResponding(null);
      loadChallenges();
    } catch (error) {
      console.error("[ChallengesReceived] Erreur acceptation", error);
      showToast("Erreur lors de l'acceptation", "error");
      setResponding(null);
    }
  };

  const handlePhoneModalActivated = async () => {
    if (!pendingAcceptance) return;

    const challenge = challenges.find((c) => c.id === pendingAcceptance);
    if (!challenge) return;

    setShowPhoneModal(false);
    setPendingAcceptance(null);

    // Relancer l'acceptation
    await handleAcceptChallenge(pendingAcceptance, challenge);
  };

  const handleOpenWhatsApp = async (challenge: TeamChallenge) => {
    try {
      setLoadingPhones((prev) => new Set(prev).add(challenge.id));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le numéro du CAPITAINE adverse (challenger_player_1_id)
      const { data: phoneData, error: phoneError } = await supabase.rpc(
        "get_partner_phone",
        { partner_uuid: challenge.challenger_player_1_id }
      );

      if (phoneError) {
        console.error("[ChallengesReceived] Erreur RPC get_partner_phone:", phoneError);
        // Fallback : récupérer directement le numéro si le défi est accepté
        const { data: profileData } = await supabase
          .from("profiles")
          .select("phone_number")
          .eq("id", challenge.challenger_player_1_id)
          .maybeSingle();

        if (profileData?.phone_number) {
          openWhatsApp(
            profileData.phone_number,
            "Salut ! On s'organise pour notre match ? 🎾⚔️"
          );
          return;
        }
        showToast("Impossible de récupérer le numéro", "error");
        return;
      }

      if (phoneData && phoneData.length > 0 && phoneData[0].phone) {
        openWhatsApp(
          phoneData[0].phone,
          "Salut ! On s'organise pour notre match ? 🎾⚔️"
        );
      } else {
        showToast("Le joueur n'a pas encore activé WhatsApp.", "info");
      }
    } catch (error) {
      console.error("[ChallengesReceived] Erreur WhatsApp", error);
      showToast("Erreur lors de l'ouverture de WhatsApp", "error");
    } finally {
      setLoadingPhones((prev) => {
        const next = new Set(prev);
        next.delete(challenge.id);
        return next;
      });
    }
  };

  const handleRefuseChallenge = async (challengeId: string) => {
    try {
      setResponding(challengeId);

      const { error } = await supabase
        .from("team_challenges")
        .update({ status: "refused" })
        .eq("id", challengeId);

      if (error) {
        console.error("[ChallengesReceived] Erreur refus", error);
        showToast("Erreur lors du refus", "error");
        return;
      }

      showToast("Défi refusé", "success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("teamChallengeUpdated"));
      }
      loadChallenges();
    } catch (error) {
      console.error("[ChallengesReceived] Erreur refus", error);
      showToast("Erreur lors du refus", "error");
    } finally {
      setResponding(null);
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    try {
      setDeleting(challengeId);

      const { error } = await supabase
        .from("team_challenges")
        .delete()
        .eq("id", challengeId);

      if (error) {
        console.error("[ChallengesReceived] Erreur suppression", error);
        showToast("Erreur lors de la suppression", "error");
        return;
      }

      showToast("Défi supprimé", "success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("teamChallengeDeleted"));
      }
      loadChallenges();
    } catch (error) {
      console.error("[ChallengesReceived] Erreur suppression", error);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(null);
    }
  };

  const getChallengerNames = (challenge: TeamChallenge): string => {
    const name1 =
      challenge.challenger_1.first_name && challenge.challenger_1.last_name
        ? `${challenge.challenger_1.first_name} ${challenge.challenger_1.last_name}`
        : challenge.challenger_1.first_name ||
        challenge.challenger_1.last_name ||
        "Joueur 1";
    const name2 =
      challenge.challenger_2.first_name && challenge.challenger_2.last_name
        ? `${challenge.challenger_2.first_name} ${challenge.challenger_2.last_name}`
        : challenge.challenger_2.first_name ||
        challenge.challenger_2.last_name ||
        "Joueur 2";
    return `${name1} et ${name2}`;
  };


  const visibleChallenges = challenges.filter((challenge) => {
    // Afficher les défis non expirés OU les défis refusés (pour pouvoir les supprimer)
    const timeRemaining = getTimeRemaining(challenge.expires_at, currentTime);
    const isNotExpired = timeRemaining && !timeRemaining.expired;
    const isRefused = challenge.status === "refused";
    return isNotExpired || isRefused;
  });

  if (loading && challenges.length === 0) {
    return null;
  }

  if (visibleChallenges.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 md:p-4 lg:p-6 border border-orange-500/30">
        <div className="mb-2 sm:mb-3 md:mb-4">
          <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2">
            <MessageCircle className="text-orange-400 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            Défis reçus
          </h3>
        </div>

        <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
          {visibleChallenges
            .map((challenge) => {
              if (!currentUserId) return null;

              const isDefender1 = challenge.defender_player_1_id === currentUserId;
              const myStatus = isDefender1
                ? challenge.defender_1_status
                : challenge.defender_2_status;
              const partnerStatus = isDefender1
                ? challenge.defender_2_status
                : challenge.defender_1_status;
              const partnerProfile = isDefender1
                ? challenge.defender_2
                : challenge.defender_1;
              const partnerName =
                partnerProfile.first_name && partnerProfile.last_name
                  ? `${partnerProfile.first_name} ${partnerProfile.last_name}`
                  : partnerProfile.first_name || partnerProfile.last_name || "Joueur";

              const timeRemaining = getTimeRemaining(challenge.expires_at, currentTime);

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-orange-500/20 p-2.5 sm:p-3 md:p-4 relative"
                >
                  {/* Compteur en haut à droite */}
                  {timeRemaining && !timeRemaining.expired && (
                    <div className="absolute top-3 right-3 bg-orange-500/20 border border-orange-500/30 rounded-lg px-2 py-1 z-10">
                      <p className="text-[10px] text-orange-400 font-bold whitespace-nowrap flex items-center gap-1">
                        <Clock size={10} />
                        {timeRemaining.hours}h {timeRemaining.minutes}m
                      </p>
                    </div>
                  )}

                  {/* Layout côte à côte : Challengers à gauche, Defenders à droite */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {/* Challengers (gauche) */}
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-2">Vous êtes défiés par :</p>
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        {challenge.challenger_1.avatar_url ? (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 flex-shrink-0">
                            <Image
                              src={challenge.challenger_1.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-500/20 flex items-center justify-center border border-gray-500/30 flex-shrink-0">
                            <User size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-xs sm:text-sm truncate">
                            {challenge.challenger_1.first_name} {challenge.challenger_1.last_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        {challenge.challenger_2.avatar_url ? (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 flex-shrink-0">
                            <Image
                              src={challenge.challenger_2.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-500/20 flex items-center justify-center border border-gray-500/30 flex-shrink-0">
                            <User size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-xs sm:text-sm truncate">
                            {challenge.challenger_2.first_name} {challenge.challenger_2.last_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Defenders avec statuts (droite) */}
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-2">Votre équipe :</p>
                      {/* Moi */}
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        {(isDefender1 ? challenge.defender_1.avatar_url : challenge.defender_2.avatar_url) || currentUserProfile?.avatar_url ? (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 flex-shrink-0">
                            <Image
                              src={(isDefender1 ? challenge.defender_1.avatar_url : challenge.defender_2.avatar_url) || currentUserProfile?.avatar_url || ""}
                              alt=""
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-500/20 flex items-center justify-center border border-gray-500/30 flex-shrink-0">
                            <User size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-xs sm:text-sm truncate">
                            {isDefender1
                              ? (challenge.defender_1.first_name && challenge.defender_1.last_name
                                ? `${challenge.defender_1.first_name} ${challenge.defender_1.last_name}`
                                : challenge.defender_1.first_name || challenge.defender_1.last_name || currentUserProfile?.first_name || "Vous")
                              : (challenge.defender_2.first_name && challenge.defender_2.last_name
                                ? `${challenge.defender_2.first_name} ${challenge.defender_2.last_name}`
                                : challenge.defender_2.first_name || challenge.defender_2.last_name || currentUserProfile?.first_name || "Vous")}
                          </p>
                        </div>
                        {myStatus === "accepted" ? (
                          <CheckCircle2 size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Clock size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      {/* Mon partenaire */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        {partnerProfile.avatar_url ? (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 flex-shrink-0">
                            <Image
                              src={partnerProfile.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-500/20 flex items-center justify-center border border-gray-500/30 flex-shrink-0">
                            <User size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-xs sm:text-sm truncate">
                            {partnerName}
                          </p>
                        </div>
                        {partnerStatus === "accepted" ? (
                          <CheckCircle2 size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Clock size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bouton WhatsApp si défi accepté */}
                  {challenge.status === "accepted" && (
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(challenge)}
                      disabled={loadingPhones.has(challenge.id)}
                      className="w-full py-2.5 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-emerald-500/30"
                    >
                      {loadingPhones.has(challenge.id) ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <MessageCircle size={16} />
                          Contactez le capitaine adverse sur WhatsApp
                        </>
                      )}
                    </button>
                  )}

                  {/* Actions (Refuser/Accepter) - uniquement si pending */}
                  {challenge.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRefuseChallenge(challenge.id)}
                        disabled={!!responding || myStatus === "accepted"}
                        className="flex-1 py-2 sm:py-2.5 px-2 sm:px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 min-h-[40px] sm:min-h-[44px]"
                      >
                        <XCircle size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-[11px] sm:text-xs">Refuser</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptChallenge(challenge.id, challenge)}
                        disabled={!!responding || myStatus === "accepted"}
                        className="flex-1 py-2 sm:py-2.5 px-2 sm:px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 min-h-[40px] sm:min-h-[44px]"
                      >
                        {responding === challenge.id ? (
                          <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin flex-shrink-0" />
                        ) : (
                          <CheckCircle2 size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                        )}
                        <span className="text-[11px] sm:text-xs">Accepter</span>
                      </button>
                    </div>
                  )}

                  {/* Bouton supprimer pour les défis refusés */}
                  {challenge.status === "refused" && (
                    <div className="flex gap-2">
                      <span className="flex-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                        <XCircle size={12} />
                        Refusé
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteChallenge(challenge.id)}
                        disabled={deleting === challenge.id}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[40px]"
                      >
                        {deleting === challenge.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        <span>Supprimer</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
        </div>
      </div>

      <AddPhoneModal
        isOpen={showPhoneModal}
        onClose={() => {
          setShowPhoneModal(false);
          setPendingAcceptance(null);
        }}
        onActivated={handlePhoneModalActivated}
      />
    </>
  );
}

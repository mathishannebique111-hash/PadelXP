"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Loader2, User, MessageCircle, Trash2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { showToast } from "@/components/ui/Toast";
import { openWhatsApp } from "@/lib/utils/whatsapp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Fonction pour calculer le temps restant avant expiration (48h)
const getTimeRemaining = (expiresAt: string, currentTime: Date): { hours: number; minutes: number; expired: boolean } | null => {
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - currentTime.getTime();

  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, expired: false };
};

export default function ChallengesSent() {
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loadingPhones, setLoadingPhones] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [challengeToDelete, setChallengeToDelete] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
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

      // Récupérer les défis où l'utilisateur est un challenger
      const { data: challengesData, error: challengesError } = await supabase
        .from("team_challenges")
        .select("*")
        .or(`challenger_player_1_id.eq.${user.id},challenger_player_2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (challengesError) {
        console.error("[ChallengesSent] Erreur Supabase:", challengesError);
        throw challengesError;
      }

      if (!challengesData || challengesData.length === 0) {
        setChallenges([]);
        return;
      }

      // Récupérer les profils
      const profileIds = new Set<string>();
      challengesData.forEach((challenge) => {
        profileIds.add(challenge.challenger_player_2_id);
        profileIds.add(challenge.defender_player_1_id);
        profileIds.add(challenge.defender_player_2_id);
      });

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", Array.from(profileIds));

      if (profilesError) {
        console.error("[ChallengesSent] Erreur récupération profils:", profilesError);
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
          challenger_2: challenger2,
          defender_1: defender1,
          defender_2: defender2,
        };
      });

      setChallenges(challengesWithProfiles);
    } catch (error) {
      console.error("[ChallengesSent] Erreur chargement", error);
    } finally {
      setLoading(false);
    }
  };

  const getResponseCount = (challenge: TeamChallenge): number => {
    let count = 0;
    if (challenge.defender_1_status === "accepted") count++;
    if (challenge.defender_2_status === "accepted") count++;
    return count;
  };

  const handleDeleteClick = (challengeId: string) => {
    setChallengeToDelete(challengeId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!challengeToDelete) return;

    try {
      setDeleting(challengeToDelete);

      const { error } = await supabase
        .from("team_challenges")
        .delete()
        .eq("id", challengeToDelete);

      if (error) {
        console.error("[ChallengesSent] Erreur suppression", error);
        showToast("Erreur lors de la suppression", "error");
        return;
      }

      showToast("Défi supprimé", "success");
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("teamChallengeDeleted"));
        }, 100);
      }
      loadChallenges();
      setDeleteDialogOpen(false);
      setChallengeToDelete(null);
    } catch (error) {
      console.error("[ChallengesSent] Erreur suppression", error);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleOpenWhatsApp = async (challenge: TeamChallenge) => {
    try {
      setLoadingPhones((prev) => new Set(prev).add(challenge.id));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le numéro du capitaine adverse (defender_player_1_id)
      const { data: phoneData, error: phoneError } = await supabase.rpc(
        "get_partner_phone",
        { partner_uuid: challenge.defender_player_1_id }
      );

      if (phoneError) {
        console.error("[ChallengesSent] Erreur RPC get_partner_phone:", phoneError);
        // Fallback : récupérer directement le numéro si le défi est accepté
        if (challenge.status === "accepted") {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("phone_number")
            .eq("id", challenge.defender_player_1_id)
            .maybeSingle();

          if (profileData?.phone_number) {
            openWhatsApp(
              profileData.phone_number,
              "Salut ! On s'organise pour notre match ? 🎾⚔️"
            );
            return;
          }
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
      console.error("[ChallengesSent] Erreur WhatsApp", error);
      showToast("Erreur lors de l'ouverture de WhatsApp", "error");
    } finally {
      setLoadingPhones((prev) => {
        const next = new Set(prev);
        next.delete(challenge.id);
        return next;
      });
    }
  };

  const getStatusBadge = (challenge: TeamChallenge) => {
    if (challenge.status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-medium border border-emerald-500/30">
          <CheckCircle2 size={10} className="sm:w-3 sm:h-3" />
          <span className="whitespace-nowrap">Accepté</span>
        </span>
      );
    }
    if (challenge.status === "refused") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-medium border border-red-500/30">
          <XCircle size={10} className="sm:w-3 sm:h-3" />
          <span className="whitespace-nowrap">Refusé</span>
        </span>
      );
    }
    const count = getResponseCount(challenge);
    return (
      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs font-medium border border-yellow-500/30">
        <span className="whitespace-nowrap">En attente ({count}/2)</span>
      </span>
    );
  };

  if (loading && challenges.length === 0) {
    return null;
  }

  if (challenges.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-blue-500/30">
        <div className="mb-2">
          <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
            <MessageCircle className="text-blue-400 w-4 h-4" />
            Défis envoyés
          </h3>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {challenges
            .filter((challenge) => {
              const timeRemaining = getTimeRemaining(challenge.expires_at, currentTime);
              return timeRemaining && !timeRemaining.expired;
            })
            .map((challenge) => {
            const defender1Name =
              challenge.defender_1.first_name && challenge.defender_1.last_name
                ? `${challenge.defender_1.first_name} ${challenge.defender_1.last_name}`
                : challenge.defender_1.first_name ||
                  challenge.defender_1.last_name ||
                  "Joueur 1";
            const defender2Name =
              challenge.defender_2.first_name && challenge.defender_2.last_name
                ? `${challenge.defender_2.first_name} ${challenge.defender_2.last_name}`
                : challenge.defender_2.first_name ||
                  challenge.defender_2.last_name ||
                  "Joueur 2";

            const timeRemaining = getTimeRemaining(challenge.expires_at, currentTime);

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-blue-500/20 p-2.5 sm:p-3 relative"
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

                {/* Status badge */}
                <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {getStatusBadge(challenge)}
                  </div>
                  {challenge.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(challenge.id)}
                      disabled={deleting === challenge.id}
                      className="p-1.5 sm:p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {deleting === challenge.id ? (
                        <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Defenders */}
                <div className="mb-3 sm:mb-4">
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-2">Vous avez défié :</p>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    {challenge.defender_1.avatar_url ? (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 flex-shrink-0">
                        <Image
                          src={challenge.defender_1.avatar_url}
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
                        {defender1Name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {challenge.defender_2.avatar_url ? (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 flex-shrink-0">
                        <Image
                          src={challenge.defender_2.avatar_url}
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
                        {defender2Name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action button if accepted */}
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
                        Contacter le capitaine adverse sur WhatsApp
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:max-w-md bg-slate-900 border-slate-700 text-white p-4 sm:p-6 mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base md:text-lg">Supprimer le défi</DialogTitle>
            <DialogDescription className="text-[11px] sm:text-xs md:text-sm text-gray-300 mt-1 sm:mt-2">
              Êtes-vous sûr de vouloir supprimer ce défi ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end mt-4 sm:mt-0">
            <button
              type="button"
              onClick={() => {
                setDeleteDialogOpen(false);
                setChallengeToDelete(null);
              }}
              className="w-full sm:w-auto group relative flex justify-center py-2 sm:py-2.5 px-4 border border-slate-600 text-xs sm:text-sm font-medium rounded-lg text-white bg-transparent hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 min-h-[40px] sm:min-h-[44px]"
              disabled={!!deleting}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto group relative flex justify-center py-2 sm:py-2.5 px-4 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[40px] sm:min-h-[44px]"
              disabled={!!deleting}
            >
              {deleting ? (
                <Loader2 className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" />
              ) : (
                "Supprimer"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

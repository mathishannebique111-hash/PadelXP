 "use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Eye, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import AddPhoneModal from "@/components/AddPhoneModal";
import { showToast } from "@/components/ui/Toast";

interface SuggestedPlayer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  niveau_padel?: number | null;
  niveau_categorie?: string | null;
  compatibilityScore: number | null;
  compatibilityTags: string[];
}

export default function PartnerSuggestions() {
  const router = useRouter();
  const supabase = createClient();
  const [suggestions, setSuggestions] = useState<SuggestedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isInvitingId, setIsInvitingId] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingInvitePlayer, setPendingInvitePlayer] =
    useState<SuggestedPlayer | null>(null);
  const [invitationStatuses, setInvitationStatuses] = useState<Map<string, { sent: boolean; received: boolean; senderName?: string; isAccepted?: boolean }>>(new Map());

  const checkInvitationStatuses = useCallback(async (players: SuggestedPlayer[]) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const playerIds = players.map(p => p.id);
      
      // Vérifier les invitations envoyées (sender_id = user, receiver_id = player) - pending ou accepted
      const { data: sentInvitations } = await supabase
        .from("match_invitations")
        .select("receiver_id, status")
        .eq("sender_id", user.id)
        .in("receiver_id", playerIds)
        .in("status", ["pending", "accepted"])
        .gt("expires_at", new Date().toISOString());
      
      // Vérifier les invitations reçues (sender_id = player, receiver_id = user) - pending ou accepted
      const { data: receivedInvitations } = await supabase
        .from("match_invitations")
        .select("sender_id, status")
        .eq("receiver_id", user.id)
        .in("sender_id", playerIds)
        .in("status", ["pending", "accepted"])
        .gt("expires_at", new Date().toISOString());
      
      // Récupérer les profils des expéditeurs pour obtenir leurs noms
      const senderIds = receivedInvitations?.map(inv => inv.sender_id) || [];
      let senderProfilesMap = new Map();
      if (senderIds.length > 0) {
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, display_name")
          .in("id", senderIds);
        
        if (senderProfiles) {
          senderProfilesMap = new Map(senderProfiles.map(p => [p.id, p]));
        }
      }
      
      const statusMap = new Map<string, { sent: boolean; received: boolean; senderName?: string }>();
      
      players.forEach(player => {
        const sentInv = sentInvitations?.find(inv => inv.receiver_id === player.id);
        const receivedInv = receivedInvitations?.find(inv => inv.sender_id === player.id);
        const sent = !!sentInv;
        const received = !!receivedInv;
        const isAccepted = (sentInv?.status === "accepted") || (receivedInv?.status === "accepted");
        
        const senderProfile = received ? senderProfilesMap.get(player.id) : null;
        const senderName = senderProfile ? (
          senderProfile.first_name && senderProfile.last_name
            ? `${senderProfile.first_name} ${senderProfile.last_name}`
            : senderProfile.display_name || senderProfile.first_name || "ce joueur"
        ) : undefined;
        
        statusMap.set(player.id, { sent, received, senderName, isAccepted });
      });
      
      setInvitationStatuses(statusMap);
    } catch (error) {
      console.error("[PartnerSuggestions] Erreur vérification invitations", error);
    }
  }, [supabase]);

  const fetchSuggestions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Utiliser stale-while-revalidate pour un chargement instantané
      const response = await fetch(
        `/api/partners/suggestions`,
        {
          method: "GET",
          credentials: "include",
          // Cache avec stale-while-revalidate pour un chargement quasi-instantané
          headers: {
            "Cache-Control": "max-age=10, stale-while-revalidate=60",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError("Vous devez être connecté");
          setSuggestions([]);
          setLoading(false);
          return;
        }
        if (response.status === 429) {
          setError("Trop de requêtes. Veuillez patienter quelques instants.");
          setSuggestions([]);
          setLoading(false);
          return;
        }
        console.error('[PartnerSuggestions] Erreur fetch suggestions:', response.status, response.statusText);
        setError(`Erreur ${response.status}`);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const fetchedSuggestions = data.suggestions || [];
      setSuggestions(fetchedSuggestions);
      setHasLoadedOnce(true);
      
      // Vérifier les invitations existantes pour chaque suggestion
      if (fetchedSuggestions.length > 0) {
        await checkInvitationStatuses(fetchedSuggestions);
      }
    } catch (err) {
      console.error("[PartnerSuggestions] Erreur:", err);
      setError("Erreur lors du chargement des suggestions");
      setSuggestions([]);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [checkInvitationStatuses]);

  const createMatchInvitation = useCallback(
    async (receiverId: string) => {
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
          .eq("receiver_id", receiverId)
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
          receiver_id: receiverId,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        });

        if (error) {
          console.error("[PartnerSuggestions] Erreur création invitation", error);
          showToast("Invitation déjà envoyée", "error");
          return;
        }

        showToast("Invitation envoyée ! Valable 24h.", "success");
        
        // Mettre à jour le statut local
        setInvitationStatuses(prev => {
          const next = new Map(prev);
          next.set(receiverId, { sent: true, received: false });
          return next;
        });
        
        fetchSuggestions();
        // Déclencher un événement pour recharger les composants d'invitations
        window.dispatchEvent(new CustomEvent("matchInvitationCreated"));
      } catch (e) {
        console.error("[PartnerSuggestions] Erreur création invitation", e);
        showToast("Erreur réseau lors de l'envoi de l'invitation.", "error");
      }
    },
    [supabase, router, fetchSuggestions]
  );

  const handleInviteClick = useCallback(
    async (player: SuggestedPlayer) => {
      try {
        setIsInvitingId(player.id);

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
          console.error("[PartnerSuggestions] Erreur chargement profil", error);
        }

        if (!profile?.phone_number) {
          // Demander d'abord le numéro avant de créer l'invitation
          setPendingInvitePlayer(player);
          setShowPhoneModal(true);
          return;
        }

        await createMatchInvitation(player.id);
      } finally {
        setIsInvitingId(null);
      }
    },
    [supabase, router, createMatchInvitation]
  );

  // Charger les suggestions au montage
  useEffect(() => {
    fetchSuggestions();
    
    // Écouter les événements de mise à jour de profil pour rafraîchir les suggestions
    const handleProfileUpdate = () => {
      fetchSuggestions();
    };
    
    // Écouter les événements d'invitations pour mettre à jour les statuts
    const handleInvitationEvent = (event?: Event) => {
      if (suggestions.length > 0) {
        // Si c'est une suppression, mettre à jour immédiatement le statut pour le joueur concerné
        if (event && 'detail' in event && (event as CustomEvent).detail) {
          const detail = (event as CustomEvent).detail as { invitationId?: string; receiverId?: string };
          if (detail.receiverId) {
            setInvitationStatuses((prev) => {
              const next = new Map(prev);
              next.delete(detail.receiverId!);
              return next;
            });
          }
        }
        // Recharger tous les statuts
        checkInvitationStatuses(suggestions);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('profileUpdated', handleProfileUpdate);
      window.addEventListener('matchInvitationCreated', handleInvitationEvent);
      window.addEventListener('matchInvitationUpdated', handleInvitationEvent);
      window.addEventListener('matchInvitationDeleted', handleInvitationEvent as EventListener);
      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate);
        window.removeEventListener('matchInvitationCreated', handleInvitationEvent);
        window.removeEventListener('matchInvitationUpdated', handleInvitationEvent);
        window.removeEventListener('matchInvitationDeleted', handleInvitationEvent as EventListener);
      };
    }
  }, [fetchSuggestions, suggestions, checkInvitationStatuses]);

  // Recharger automatiquement quand un match est soumis ou qu'un questionnaire est complété
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId1: NodeJS.Timeout;
    let timeoutId2: NodeJS.Timeout;

    const handleMatchSubmitted = () => {
      // Délai réduit pour une mise à jour plus rapide
      timeoutId1 = setTimeout(() => {
        fetchSuggestions();
      }, 1000);
    };

    const handleQuestionnaireCompleted = () => {
      // Délai réduit pour une mise à jour plus rapide
      timeoutId2 = setTimeout(() => {
        fetchSuggestions();
      }, 1000);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "matchSubmitted" && e.newValue === "true") {
        handleMatchSubmitted();
      }
      if (e.key === "questionnaireCompleted" && e.newValue === "true") {
        handleQuestionnaireCompleted();
      }
    };

    window.addEventListener("matchSubmitted", handleMatchSubmitted);
    window.addEventListener("questionnaireCompleted", handleQuestionnaireCompleted);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("matchSubmitted", handleMatchSubmitted);
      window.removeEventListener("questionnaireCompleted", handleQuestionnaireCompleted);
      window.removeEventListener("storage", handleStorageChange);
      if (timeoutId1) clearTimeout(timeoutId1);
      if (timeoutId2) clearTimeout(timeoutId2);
    };
  }, [fetchSuggestions]);

  // Polling périodique réduit - les événements prennent le relais pour les mises à jour immédiates
  // On utilise stale-while-revalidate donc le cache permet un chargement instantané
  useEffect(() => {
    const interval = setInterval(() => {
      // Recharger seulement si pas en cours de chargement
      setLoading((currentLoading) => {
        if (!currentLoading) {
          fetchSuggestions();
        }
        return currentLoading;
      });
    }, 120000); // 2 minutes - les événements gèrent les mises à jour immédiates

    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  // Afficher le chargement seulement lors du premier chargement
  // Si on a déjà chargé une fois et qu'il n'y a pas de suggestions, afficher le message d'état vide
  if (loading && !hasLoadedOnce) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-bold text-white">
            Partenaires suggérés
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-gray-400">
            Chargement...
          </span>
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <div className="text-center py-4">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="text-xs text-blue-400 active:text-blue-300"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <h3 className="text-base md:text-lg font-bold text-white mb-2">
          Partenaires suggérés
        </h3>
        <p className="text-xs md:text-sm text-gray-400">
          Aucun partenaire correspondant à votre profil n'a été trouvé pour le moment.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-bold text-white">
            Partenaires suggérés
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestions.map((player, index) => {
          const playerName =
            player.first_name && player.last_name
              ? `${player.first_name} ${player.last_name}`
              : player.display_name || "Joueur";

          const initials =
            player.first_name && player.last_name
              ? `${player.first_name[0]}${player.last_name[0]}`
              : player.display_name?.[0]?.toUpperCase() || "J";
          
          const invitationStatus = invitationStatuses.get(player.id);
          const hasSentInvitation = invitationStatus?.sent || false;
          const hasReceivedInvitation = invitationStatus?.received || false;
          const isAccepted = invitationStatus?.isAccepted || false;
          const senderName = invitationStatus?.senderName;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-3">
                {player.avatar_url ? (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                    <Image
                      src={player.avatar_url}
                      alt={playerName}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 flex items-center justify-center text-white/40 flex-shrink-0 border-2 border-white/20">
                    <User size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate text-sm md:text-base">
                    {playerName}
                  </p>
                  {player.niveau_padel && (
                    <p className="text-xs text-gray-400">
                      Niveau {player.niveau_padel.toFixed(1)}/10
                    </p>
                  )}
                  {player.compatibilityScore !== null && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full ${
                            player.compatibilityScore >= 70
                              ? "bg-gradient-to-r from-green-500 to-emerald-500"
                              : player.compatibilityScore >= 50
                              ? "bg-gradient-to-r from-orange-500 to-orange-400"
                              : "bg-gradient-to-r from-gray-500 to-gray-400"
                          }`}
                          style={{
                            width: `${player.compatibilityScore}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          player.compatibilityScore >= 70
                            ? "text-green-400"
                            : player.compatibilityScore >= 50
                            ? "text-orange-400"
                            : "text-gray-400"
                        }`}
                      >
                        {player.compatibilityScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags de compatibilité */}
              {player.compatibilityTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {player.compatibilityTags.slice(0, 2).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/players/${player.id}?from=partners`)}
                  className="flex-1 py-2 px-3 border border-white/20 text-gray-300 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 active:bg-slate-700/50 min-h-[44px]"
                >
                  <Eye size={14} />
                  <span>Voir le profil</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isAccepted) {
                      showToast("Une invitation de paire acceptée existe déjà avec ce joueur", "error");
                      return;
                    }
                    if (hasSentInvitation) {
                      showToast("Une proposition de paire a déjà été envoyée à ce joueur", "error");
                      return;
                    }
                    if (hasReceivedInvitation) {
                      showToast(`Vous avez déjà une proposition de paire de ${senderName || "ce joueur"}`, "error");
                      return;
                    }
                    handleInviteClick(player);
                  }}
                  disabled={isInvitingId === player.id || hasSentInvitation || hasReceivedInvitation || isAccepted}
                  className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  title={
                    isAccepted
                      ? "Une invitation de paire acceptée existe déjà avec ce joueur"
                      : hasSentInvitation
                      ? "Une proposition de paire a déjà été envoyée à ce joueur"
                      : hasReceivedInvitation
                      ? `Vous avez déjà une proposition de paire de ${senderName || "ce joueur"}`
                      : undefined
                  }
                >
                  {isInvitingId === player.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Envoi...</span>
                    </>
                  ) : isAccepted ? (
                    <>
                      <MessageCircle size={14} />
                      <span>Acceptée</span>
                    </>
                  ) : hasSentInvitation ? (
                    <>
                      <MessageCircle size={14} />
                      <span>Déjà envoyée</span>
                    </>
                  ) : hasReceivedInvitation ? (
                    <>
                      <MessageCircle size={14} />
                      <span>Reçue</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle size={14} />
                      <span>Inviter à jouer</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
        </div>
      </div>

      <AddPhoneModal
        isOpen={showPhoneModal}
        partnerFirstName={
          pendingInvitePlayer?.first_name ||
          pendingInvitePlayer?.display_name?.split(" ")[0]
        }
        onClose={() => {
          setShowPhoneModal(false);
          setPendingInvitePlayer(null);
        }}
        onActivated={async () => {
          if (pendingInvitePlayer) {
            await createMatchInvitation(pendingInvitePlayer.id);
          }
        }}
      />
    </>
  );
}


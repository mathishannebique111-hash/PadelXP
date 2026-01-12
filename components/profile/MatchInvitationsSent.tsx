"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Clock, CheckCircle2, XCircle, MessageCircle, Loader2, User, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { showToast } from "@/components/ui/Toast";

interface MatchInvitation {
  id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "refused" | "expired";
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  receiver: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    niveau_padel: number | null;
  };
}

export default function MatchInvitationsSent() {
  const [invitations, setInvitations] = useState<MatchInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPhones, setLoadingPhones] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    loadInvitations();
    
    // Écouter les événements de création/mise à jour/suppression d'invitation
    const handleInvitationEvent = () => {
      loadInvitations();
    };
    window.addEventListener("matchInvitationCreated", handleInvitationEvent);
    window.addEventListener("matchInvitationUpdated", handleInvitationEvent);
    window.addEventListener("matchInvitationDeleted", handleInvitationEvent);
    
    return () => {
      window.removeEventListener("matchInvitationCreated", handleInvitationEvent);
      window.removeEventListener("matchInvitationUpdated", handleInvitationEvent);
      window.removeEventListener("matchInvitationDeleted", handleInvitationEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("match_invitations")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (invitationsError) {
        console.error("[MatchInvitationsSent] Erreur Supabase:", invitationsError);
        throw invitationsError;
      }

      if (!invitationsData || invitationsData.length === 0) {
        setInvitations([]);
        return;
      }

      // Récupérer les profils des receivers
      const receiverIds = invitationsData.map((inv) => inv.receiver_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, niveau_padel")
        .in("id", receiverIds);

      if (profilesError) {
        console.error("[MatchInvitationsSent] Erreur récupération profils:", profilesError);
        throw profilesError;
      }

      console.log("[MatchInvitationsSent] Profils récupérés:", profilesData);
      console.log("[MatchInvitationsSent] IDs receivers:", receiverIds);

      // Combiner les données
      const invitationsWithProfiles = invitationsData.map((invitation) => {
        const profile = profilesData?.find((p) => p.id === invitation.receiver_id);
        console.log(`[MatchInvitationsSent] Invitation ${invitation.id} - Profile trouvé:`, profile);
        return {
          ...invitation,
          receiver: profile || {
            id: invitation.receiver_id,
            first_name: null,
            last_name: null,
            avatar_url: null,
            niveau_padel: null,
          },
        };
      });

      console.log("[MatchInvitationsSent] Invitations avec profils:", invitationsWithProfiles);
      setInvitations(invitationsWithProfiles);
    } catch (error) {
      console.error("[MatchInvitationsSent] Erreur chargement", error);
      showToast("Impossible de charger les invitations envoyées", "error");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return "Expirée";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h restantes`;
    return `${minutes}min restantes`;
  };

  const getStatusBadge = (invitation: MatchInvitation) => {
    const isExpired =
      invitation.status === "pending" &&
      new Date(invitation.expires_at) < new Date();

    if (isExpired || invitation.status === "expired") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-600/50 border border-slate-500/50 px-2.5 py-1 text-[10px] font-medium text-slate-300">
          <Clock className="w-3 h-3" />
          Expirée
        </span>
      );
    }

    switch (invitation.status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-[10px] font-medium text-amber-200">
            <Clock className="w-3 h-3" />
            En attente ({getTimeRemaining(invitation.expires_at)})
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Acceptée
          </span>
        );
      case "refused":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/40 px-2.5 py-1 text-[10px] font-medium text-red-200">
            <XCircle className="w-3 h-3" />
            Refusée
          </span>
        );
      default:
        return null;
    }
  };

  const handleOpenWhatsApp = async (receiverId: string) => {
    try {
      setLoadingPhones((prev) => new Set(prev).add(receiverId));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log("[MatchInvitationsSent] Récupération téléphone pour:", receiverId);
      console.log("[MatchInvitationsSent] User ID:", user.id);
      
      // Vérifier d'abord si une invitation acceptée existe
      const { data: invitationCheck } = await supabase
        .from("match_invitations")
        .select("id, status")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${receiverId},receiver_id.eq.${receiverId}`)
        .limit(1);
      
      console.log("[MatchInvitationsSent] Vérification invitation:", invitationCheck);
      
      const { data, error } = await supabase.rpc("get_partner_phone", {
        partner_uuid: receiverId,
      });

      if (error) {
        console.error("[MatchInvitationsSent] Erreur RPC get_partner_phone:", error);
        throw error;
      }

      console.log("[MatchInvitationsSent] Données reçues:", data);
      
      // Si la fonction RPC ne retourne rien mais qu'une invitation acceptée existe,
      // récupérer directement le numéro du profil
      if ((!data || data.length === 0) && invitationCheck && invitationCheck.length > 0) {
        console.log("[MatchInvitationsSent] RPC vide mais invitation acceptée trouvée, récupération directe du profil");
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("phone_number, whatsapp_enabled")
          .eq("id", receiverId)
          .maybeSingle();
        
        console.log("[MatchInvitationsSent] Profil récupéré:", profileData);
        
        if (profileError) {
          console.error("[MatchInvitationsSent] Erreur récupération profil:", profileError);
        } else if (profileData?.phone_number) {
          const phone = profileData.phone_number.replace(/[^0-9]/g, "");
          const message = encodeURIComponent(
            "Salut ! Organisons notre match de padel 🎾"
          );
          const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }

      // La fonction retourne un tableau avec { phone, whatsapp_enabled }
      if (Array.isArray(data) && data.length > 0) {
        const phoneData = data[0] as { phone: string; whatsapp_enabled: boolean };
        if (phoneData.phone) {
          const phone = phoneData.phone.replace(/[^0-9]/g, "");
          const message = encodeURIComponent(
            "Salut ! Organisons notre match de padel 🎾"
          );
          const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }

      // Si on arrive ici, le numéro n'a pas été trouvé
      console.warn("[MatchInvitationsSent] Aucun numéro trouvé pour:", receiverId);
      showToast(
        "Le joueur n'a pas encore activé WhatsApp.",
        "info"
      );
    } catch (error) {
      console.error("[MatchInvitationsSent] Erreur WhatsApp", error);
      showToast("Impossible d'ouvrir WhatsApp.", "error");
    } finally {
      setLoadingPhones((prev) => {
        const next = new Set(prev);
        next.delete(receiverId);
        return next;
      });
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(invitationId));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("match_invitations")
        .delete()
        .eq("id", invitationId)
        .eq("sender_id", user.id); // Sécurité : on ne peut supprimer que ses propres invitations

      if (error) {
        console.error("[MatchInvitationsSent] Erreur suppression", error);
        throw error;
      }

      showToast("Invitation supprimée", "success");
      
      // Recharger les invitations
      await loadInvitations();
      
      // Déclencher un événement pour que le receiver voie aussi la suppression
      window.dispatchEvent(new CustomEvent("matchInvitationDeleted"));
    } catch (error) {
      console.error("[MatchInvitationsSent] Erreur suppression invitation", error);
      showToast("Impossible de supprimer l'invitation", "error");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
      <div className="flex items-center gap-2 mb-4">
        <Send className="w-5 h-5 text-blue-400" />
        <h3 className="text-base md:text-lg font-bold text-white">
          Propositions de partie envoyées
        </h3>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => {
          const receiver = invitation.receiver || {};
          const receiverName =
            receiver.first_name && receiver.last_name
              ? `${receiver.first_name} ${receiver.last_name}`
              : receiver.first_name || receiver.last_name || "Joueur";

          return (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-2">
                {receiver.avatar_url ? (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                    <Image
                      src={receiver.avatar_url}
                      alt={receiverName}
                      width={48}
                      height={48}
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
                    {receiverName}
                  </p>
                  {receiver.niveau_padel && (
                    <p className="text-xs text-gray-400">
                      Niveau {receiver.niveau_padel.toFixed(1)}/10
                    </p>
                  )}
                </div>
                {getStatusBadge(invitation)}
              </div>

              {invitation.status === "accepted" && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(invitation.receiver_id)}
                    disabled={loadingPhones.has(invitation.receiver_id)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
                  >
                    {loadingPhones.has(invitation.receiver_id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                    <span>
                      Envoyez un message à {receiverName} pour organiser votre match !
                    </span>
                  </button>
                </div>
              )}

              {invitation.status !== "accepted" && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteInvitation(invitation.id)}
                    disabled={deletingIds.has(invitation.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-500/15 border border-red-400/40 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
                    title="Supprimer l'invitation"
                  >
                    {deletingIds.has(invitation.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
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
  );
}

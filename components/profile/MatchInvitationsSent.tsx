"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Clock, CheckCircle2, XCircle, MessageCircle, Loader2, User, Trash2 } from "lucide-react";
import Image from "next/image";
import { showToast } from "@/components/ui/Toast";
import { openWhatsApp } from "@/lib/utils/whatsapp";

interface MatchInvitation {
  id: string;
  sender_id: string;
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

    // Écouter les événements de création/mise à jour d'invitation
    // On n'écoute PAS matchInvitationDeleted car on met à jour l'état local directement
    const handleInvitationEvent = () => {
      loadInvitations();
    };
    window.addEventListener("matchInvitationCreated", handleInvitationEvent);
    window.addEventListener("matchInvitationUpdated", handleInvitationEvent);

    return () => {
      window.removeEventListener("matchInvitationCreated", handleInvitationEvent);
      window.removeEventListener("matchInvitationUpdated", handleInvitationEvent);
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

      // Récupérer les invitations (uniquement celles qui ne sont pas acceptées)
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("match_invitations")
        .select("id, sender_id, receiver_id, status, created_at, expires_at, responded_at")
        .eq("sender_id", user.id)
        .neq("status", "accepted")
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

  const getTimeRemaining = (expiresAt: string): { hours: number; minutes: number; expired: boolean } | null => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, expired: false };
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
        const timeRemaining = getTimeRemaining(invitation.expires_at);
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-[10px] font-medium text-amber-200">
            <Clock className="w-3 h-3" />
            En attente {timeRemaining && !timeRemaining.expired ? `(${timeRemaining.hours}h ${timeRemaining.minutes}m)` : ''}
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
          openWhatsApp(
            profileData.phone_number,
            "Salut ! Organisons notre match de padel 🎾"
          );
          return;
        }
      }

      // La fonction retourne un tableau avec { phone, whatsapp_enabled }
      if (Array.isArray(data) && data.length > 0) {
        const phoneData = data[0] as { phone: string; whatsapp_enabled: boolean };
        if (phoneData.phone) {
          openWhatsApp(
            phoneData.phone,
            "Salut ! Organisons notre match de padel 🎾"
          );
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
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("[MatchInvitationsSent] Erreur authentification", userError);
        showToast("Vous devez être connecté", "error");
        return;
      }

      console.log("[MatchInvitationsSent] Tentative suppression invitation:", invitationId);
      console.log("[MatchInvitationsSent] User ID:", user.id);

      // Récupérer l'ID du receiver avant suppression pour l'événement
      const invitationToDelete = invitations.find(inv => inv.id === invitationId);
      const receiverId = invitationToDelete?.receiver_id;

      if (!invitationToDelete) {
        console.warn("[MatchInvitationsSent] Invitation non trouvée dans l'état local");
        showToast("Invitation non trouvée", "error");
        return;
      }

      console.log("[MatchInvitationsSent] Invitation à supprimer:", {
        id: invitationToDelete.id,
        sender_id: invitationToDelete.sender_id || 'N/A',
        receiver_id: invitationToDelete.receiver_id,
        status: invitationToDelete.status
      });

      // Vérifier que l'utilisateur est bien le sender
      if (invitationToDelete.sender_id && invitationToDelete.sender_id !== user.id) {
        console.error("[MatchInvitationsSent] L'utilisateur n'est pas le sender de cette invitation");
        showToast("Vous ne pouvez supprimer que vos propres invitations", "error");
        return;
      }

      // Supprimer l'invitation via l'API pour éviter les problèmes de RLS
      const response = await fetch(`/api/invitations/delete?id=${invitationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        console.error("[MatchInvitationsSent] Erreur suppression API:", errorData);
        showToast(errorData.error || "Impossible de supprimer l'invitation", "error");
        return;
      }

      const result = await response.json();
      console.log("[MatchInvitationsSent] Suppression réussie via API:", result);

      // Mettre à jour l'état local APRÈS confirmation de la suppression
      setInvitations((prev) => {
        const filtered = prev.filter((inv) => inv.id !== invitationId);
        console.log("[MatchInvitationsSent] État local mis à jour. Invitations restantes:", filtered.length);
        return filtered;
      });

      // Déclencher l'événement pour synchroniser les autres composants
      window.dispatchEvent(new CustomEvent("matchInvitationDeleted", {
        detail: { invitationId, receiverId }
      }));

      showToast("Invitation supprimée", "success");
    } catch (error) {
      console.error("[MatchInvitationsSent] Erreur exception suppression invitation", error);
      showToast("Impossible de supprimer l'invitation", "error");
      await loadInvitations(); // Recharger pour récupérer l'état correct
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
      <div className="flex items-center gap-2 mb-4">
        <Send className="w-5 h-5 text-blue-400" />
        <h3 className="text-base md:text-lg font-bold text-white">
          Propositions de paire envoyées
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
            <div
              key={invitation.id}
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
                      Niveau {receiver.niveau_padel.toFixed(2)}/10
                    </p>
                  )}
                </div>
                {getStatusBadge(invitation)}
              </div>

              {invitation.status !== "accepted" && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteInvitation(invitation.id)}
                    disabled={deletingIds.has(invitation.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-500/15 border border-red-400/40 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/25 disabled:opacity-50"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

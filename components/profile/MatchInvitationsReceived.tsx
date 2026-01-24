"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, CheckCircle2, XCircle, Loader2, MessageCircle, User, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { showToast } from "@/components/ui/Toast";
import AddPhoneModal from "@/components/AddPhoneModal";
import WhatsAppModal from "@/components/profile/WhatsAppModal";
import { openWhatsApp } from "@/lib/utils/whatsapp";

interface MatchInvitation {
  id: string;
  sender_id: string;
  status: "pending" | "accepted" | "refused" | "expired";
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  sender: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    niveau_padel: number | null;
  };
}

interface PendingAcceptance {
  invitationId: string;
  senderId: string;
}

export default function MatchInvitationsReceived() {
  const [invitations, setInvitations] = useState<MatchInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppData, setWhatsAppData] = useState<{
    playerName: string;
    phoneNumber: string;
  } | null>(null);
  const [pendingAcceptance, setPendingAcceptance] =
    useState<PendingAcceptance | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [refusedInvitations, setRefusedInvitations] = useState<MatchInvitation[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadInvitations();

    // Écouter les événements de création/suppression d'invitation (sans polling)
    const handleInvitationEvent = () => {
      loadInvitations();
    };
    window.addEventListener("matchInvitationCreated", handleInvitationEvent);
    window.addEventListener("matchInvitationDeleted", handleInvitationEvent);

    return () => {
      window.removeEventListener("matchInvitationCreated", handleInvitationEvent);
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
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      // Récupérer aussi les invitations refusées (pour permettre de les supprimer)
      const { data: refusedData, error: refusedError } = await supabase
        .from("match_invitations")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "refused")
        .order("created_at", { ascending: false })
        .limit(10);

      if (invitationsError) {
        console.error("[MatchInvitationsReceived] Erreur Supabase:", invitationsError);
        throw invitationsError;
      }

      // Traiter les invitations pending
      const allSenderIds = [
        ...((invitationsData || []).map((inv: any) => inv.sender_id)),
        ...((refusedData || []).map((inv: any) => inv.sender_id)),
      ];

      const uniqueSenderIds = [...new Set(allSenderIds)];

      let profilesData: any[] = [];
      if (uniqueSenderIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url, niveau_padel")
          .in("id", uniqueSenderIds);

        if (profilesError) {
          console.error("[MatchInvitationsReceived] Erreur récupération profils:", profilesError);
          throw profilesError;
        }
        profilesData = data || [];
      }

      // Combiner les données pour les invitations pending
      if (invitationsData && invitationsData.length > 0) {
        const invitationsWithProfiles = invitationsData.map((invitation: any) => {
          const profile = profilesData?.find((p: any) => p.id === invitation.sender_id);
          return {
            ...invitation,
            sender: profile || {
              id: invitation.sender_id,
              first_name: null,
              last_name: null,
              avatar_url: null,
              niveau_padel: null,
            },
          };
        });
        setInvitations(invitationsWithProfiles);
      } else {
        setInvitations([]);
      }

      // Combiner les données pour les invitations refusées
      if (refusedData && refusedData.length > 0) {
        const refusedWithProfiles = refusedData.map((invitation: any) => {
          const profile = profilesData?.find((p: any) => p.id === invitation.sender_id);
          return {
            ...invitation,
            sender: profile || {
              id: invitation.sender_id,
              first_name: null,
              last_name: null,
              avatar_url: null,
              niveau_padel: null,
            },
          };
        });
        setRefusedInvitations(refusedWithProfiles);
      } else {
        setRefusedInvitations([]);
      }
    } catch (error) {
      console.error("[MatchInvitationsReceived] Erreur chargement", error);
      showToast("Impossible de charger les invitations reçues", "error");
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

  const handleRefuse = async (invitationId: string) => {
    try {
      setResponding(invitationId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("match_invitations")
        .update({
          status: "refused",
          responded_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (error) throw error;

      // Supprimer la notification visuelle associée
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "match_invitation_received")
        .filter("data->>invitation_id", "eq", invitationId);

      showToast("Invitation refusée", "info");
      await loadInvitations();
      window.dispatchEvent(new CustomEvent("matchInvitationUpdated"));
    } catch (error) {
      console.error("[MatchInvitationsReceived] Erreur refus", error);
      showToast("Impossible de refuser l'invitation", "error");
    } finally {
      setResponding(null);
    }
  };

  const handleDeleteRefused = async (invitationId: string) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(invitationId));

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showToast("Vous devez être connecté", "error");
        return;
      }

      // Supprimer l'invitation via l'API
      const response = await fetch(`/api/invitations/delete?id=${invitationId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        showToast(errorData.error || "Impossible de supprimer", "error");
        return;
      }

      // Mettre à jour l'état local
      setRefusedInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));

      window.dispatchEvent(new CustomEvent("matchInvitationDeleted", {
        detail: { invitationId }
      }));

      showToast("Invitation supprimée", "success");
    } catch (error) {
      console.error("[MatchInvitationsReceived] Erreur suppression", error);
      showToast("Impossible de supprimer l'invitation", "error");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleAccept = async (invitationId: string, senderId: string) => {
    try {
      setResponding(invitationId);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Vérifier si le receiver a un numéro
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.phone_number) {
        setPendingAcceptance({ invitationId, senderId });
        setShowPhoneModal(true);
        return;
      }

      // 2. Accepter l'invitation
      const { error: updateError } = await supabase
        .from("match_invitations")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // Supprimer la notification visuelle associée
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "match_invitation_received")
        .filter("data->>invitation_id", "eq", invitationId);

      // 3. Récupérer le numéro et le nom du sender
      const { data: phoneData, error: phoneError } = await supabase.rpc(
        "get_partner_phone",
        { partner_uuid: senderId }
      );

      if (phoneError) {
        console.error("[MatchInvitationsReceived] Erreur récupération téléphone", phoneError);
      }

      // 4. Récupérer le nom du sender
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", senderId)
        .maybeSingle();

      const senderName =
        senderProfile?.first_name && senderProfile?.last_name
          ? `${senderProfile.first_name} ${senderProfile.last_name}`
          : senderProfile?.first_name || senderProfile?.last_name || "le joueur";

      // 5. Ouvrir le modal WhatsApp si le numéro est disponible
      if (
        Array.isArray(phoneData) &&
        phoneData.length > 0 &&
        (phoneData[0] as any).phone
      ) {
        const phone = (phoneData[0] as any).phone.replace(/[^0-9]/g, "");
        setWhatsAppData({
          playerName: senderName,
          phoneNumber: phone,
        });
        setShowWhatsAppModal(true);
        showToast("Invitation acceptée !", "success");
      } else {
        showToast(
          "Invitation acceptée. Le joueur n'a pas encore activé WhatsApp.",
          "info"
        );
      }

      await loadInvitations();
      window.dispatchEvent(new CustomEvent("matchInvitationUpdated"));
    } catch (error) {
      console.error("[MatchInvitationsReceived] Erreur acceptation", error);
      showToast("Impossible d'accepter l'invitation", "error");
    } finally {
      setResponding(null);
    }
  };

  const handlePhoneModalActivated = async () => {
    if (pendingAcceptance) {
      // Le numéro vient d'être ajouté, on peut maintenant accepter et ouvrir WhatsApp
      const { invitationId, senderId } = pendingAcceptance;
      setPendingAcceptance(null);

      try {
        setResponding(invitationId);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Accepter l'invitation
        const { error: updateError } = await supabase
          .from("match_invitations")
          .update({
            status: "accepted",
            responded_at: new Date().toISOString(),
          })
          .eq("id", invitationId);

        if (updateError) throw updateError;

        // Supprimer la notification visuelle associée
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", user.id)
          .eq("type", "match_invitation_received")
          .filter("data->>invitation_id", "eq", invitationId);

        // Récupérer le numéro et le nom du sender
        const { data: phoneData, error: phoneError } = await supabase.rpc(
          "get_partner_phone",
          { partner_uuid: senderId }
        );

        if (phoneError) {
          console.error("[MatchInvitationsReceived] Erreur récupération téléphone", phoneError);
        }

        // Récupérer le nom du sender
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", senderId)
          .maybeSingle();

        const senderName =
          senderProfile?.first_name && senderProfile?.last_name
            ? `${senderProfile.first_name} ${senderProfile.last_name}`
            : senderProfile?.first_name || senderProfile?.last_name || "le joueur";

        // Ouvrir le modal WhatsApp
        if (
          Array.isArray(phoneData) &&
          phoneData.length > 0 &&
          (phoneData[0] as any).phone
        ) {
          const phone = (phoneData[0] as any).phone.replace(/[^0-9]/g, "");
          setWhatsAppData({
            playerName: senderName,
            phoneNumber: phone,
          });
          setShowWhatsAppModal(true);
          showToast("Invitation acceptée !", "success");
        } else {
          showToast(
            "Invitation acceptée. Le joueur n'a pas encore activé WhatsApp.",
            "info"
          );
        }

        await loadInvitations();
        window.dispatchEvent(new CustomEvent("matchInvitationUpdated"));
      } catch (error) {
        console.error("[MatchInvitationsReceived] Erreur acceptation", error);
        showToast("Impossible d'accepter l'invitation", "error");
      } finally {
        setResponding(null);
      }
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

  if (invitations.length === 0 && refusedInvitations.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base md:text-lg font-bold text-white">
              Invitations à jouer
            </h3>
          </div>
          {invitations.length > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
              {invitations.length}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {invitations.map((invitation) => {
            const sender = invitation.sender || {};
            const senderName =
              sender.first_name && sender.last_name
                ? `${sender.first_name} ${sender.last_name}`
                : sender.first_name || sender.last_name || "Joueur";

            return (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-emerald-500/30 relative overflow-hidden"
              >
                {/* Compteur de temps restant en haut à droite */}
                {(() => {
                  const timeRemaining = getTimeRemaining(invitation.expires_at);
                  return timeRemaining && !timeRemaining.expired ? (
                    <div className="absolute top-3 right-3 bg-orange-500/20 border border-orange-500/30 rounded-lg px-2 py-1 z-10">
                      <p className="text-[10px] text-orange-400 font-bold whitespace-nowrap">
                        {timeRemaining.hours}h {timeRemaining.minutes}m
                      </p>
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center gap-3 mb-3">
                  {sender.avatar_url ? (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                      <Image
                        src={sender.avatar_url}
                        alt={senderName}
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
                      {senderName}
                    </p>
                    {sender.niveau_padel && (
                      <p className="text-xs text-gray-400">
                        Niveau {sender.niveau_padel.toFixed(1)}/10
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRefuse(invitation.id)}
                    disabled={responding === invitation.id}
                    className="flex-1 py-2 px-3 border border-red-500/40 bg-red-500/10 text-red-200 rounded-lg text-xs md:text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    {responding === invitation.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>Refuser</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAccept(invitation.id, invitation.sender_id)
                    }
                    disabled={responding === invitation.id}
                    className="flex-1 py-2 px-3 bg-emerald-500 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    {responding === invitation.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Accepter</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Section des invitations refusées */}
      {refusedInvitations.length > 0 && (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-base md:text-lg font-bold text-white">
              Invitations refusées
            </h3>
          </div>

          <div className="space-y-3">
            {refusedInvitations.map((invitation) => {
              const sender = invitation.sender || {};
              const senderName =
                sender.first_name && sender.last_name
                  ? `${sender.first_name} ${sender.last_name}`
                  : sender.first_name || sender.last_name || "Joueur";

              return (
                <div
                  key={invitation.id}
                  className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-red-500/20"
                >
                  <div className="flex items-center gap-3">
                    {sender.avatar_url ? (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                        <Image
                          src={sender.avatar_url}
                          alt={senderName}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-700 flex items-center justify-center text-white/40 flex-shrink-0 border-2 border-white/20">
                        <User size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate text-sm md:text-base">
                        {senderName}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs text-red-300">
                        <XCircle className="w-3 h-3" />
                        Refusée
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRefused(invitation.id)}
                      disabled={deletingIds.has(invitation.id)}
                      className="p-2 rounded-lg bg-red-500/15 border border-red-400/40 text-red-200 hover:bg-red-500/25 disabled:opacity-50 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Supprimer"
                    >
                      {deletingIds.has(invitation.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddPhoneModal
        isOpen={showPhoneModal}
        partnerFirstName={
          invitations.find((i) => i.sender_id === pendingAcceptance?.senderId)
            ?.sender.first_name || undefined
        }
        onClose={() => {
          setShowPhoneModal(false);
          setPendingAcceptance(null);
        }}
        onActivated={handlePhoneModalActivated}
      />

      <WhatsAppModal
        isOpen={showWhatsAppModal}
        playerName={whatsAppData?.playerName || ""}
        phoneNumber={whatsAppData?.phoneNumber || ""}
        onClose={() => {
          setShowWhatsAppModal(false);
          setWhatsAppData(null);
        }}
        onOpenWhatsApp={() => {
          if (whatsAppData?.phoneNumber) {
            openWhatsApp(
              whatsAppData.phoneNumber,
              "Salut ! C'est parti pour notre match de padel 🎾"
            );
          }
        }}
      />
    </>
  );
}

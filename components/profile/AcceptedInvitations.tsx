"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Loader2, User, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { showToast } from "@/components/ui/Toast";
import { openWhatsApp } from "@/lib/utils/whatsapp";

interface AcceptedInvitation {
  id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  responded_at: string | null;
  partner: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    niveau_padel: number | null;
  };
}

export default function AcceptedInvitations() {
  const [invitations, setInvitations] = useState<AcceptedInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPhones, setLoadingPhones] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const supabase = createClient();

  useEffect(() => {
    loadInvitations();

    // Mettre à jour le temps actuel toutes les secondes pour le compteur (sans recharger les données)
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Écouter les événements de mise à jour (création / acceptation / suppression)
    const handleInvitationEvent = () => {
      loadInvitations();
    };
    window.addEventListener("matchInvitationUpdated", handleInvitationEvent);
    window.addEventListener("matchInvitationDeleted", handleInvitationEvent);

    return () => {
      clearInterval(timeInterval);
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

      // Calculer la date limite (24h avant maintenant)
      const limitDate = new Date();
      limitDate.setHours(limitDate.getHours() - 24);
      const limitDateISO = limitDate.toISOString();

      // Récupérer les invitations acceptées où l'utilisateur est sender OU receiver
      // et qui ont été acceptées il y a moins de 24h
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("match_invitations")
        .select("*")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte("responded_at", limitDateISO) // responded_at >= il y a 24h
        .order("responded_at", { ascending: false })
        .limit(10);

      if (invitationsError) {
        console.error("[AcceptedInvitations] Erreur Supabase:", invitationsError);
        throw invitationsError;
      }

      if (!invitationsData || invitationsData.length === 0) {
        setInvitations([]);
        return;
      }

      // Pour chaque invitation, déterminer qui est le partenaire
      const partnerIds = invitationsData.map((inv) =>
        inv.sender_id === user.id ? inv.receiver_id : inv.sender_id
      );

      // Récupérer les profils des partenaires
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, niveau_padel")
        .in("id", partnerIds);

      if (profilesError) {
        console.error("[AcceptedInvitations] Erreur récupération profils:", profilesError);
        throw profilesError;
      }

      // Combiner les données
      const invitationsWithProfiles = invitationsData.map((invitation) => {
        const partnerId =
          invitation.sender_id === user.id
            ? invitation.receiver_id
            : invitation.sender_id;
        const profile = profilesData?.find((p) => p.id === partnerId);
        return {
          ...invitation,
          partner: profile || {
            id: partnerId,
            first_name: null,
            last_name: null,
            avatar_url: null,
            niveau_padel: null,
          },
        };
      });

      setInvitations(invitationsWithProfiles);
    } catch (error) {
      console.error("[AcceptedInvitations] Erreur chargement", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (respondedAt: string | null): string => {
    if (!respondedAt) return "";
    
    const responded = new Date(respondedAt);
    // L'invitation expire 24h après l'acceptation
    const expiresAt = new Date(responded.getTime() + 24 * 60 * 60 * 1000);
    const diff = expiresAt.getTime() - currentTime.getTime();

    if (diff <= 0) return "Expirée";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h restantes`;
    return `${minutes}min restantes`;
  };

  const handleOpenWhatsApp = async (partnerId: string) => {
    try {
      setLoadingPhones((prev) => new Set(prev).add(partnerId));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log("[AcceptedInvitations] Récupération téléphone pour:", partnerId);
      console.log("[AcceptedInvitations] User ID:", user.id);
      
      // Vérifier d'abord si une invitation acceptée existe
      const { data: invitationCheck } = await supabase
        .from("match_invitations")
        .select("id, status")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`)
        .limit(1);
      
      console.log("[AcceptedInvitations] Vérification invitation:", invitationCheck);
      
      const { data, error } = await supabase.rpc("get_partner_phone", {
        partner_uuid: partnerId,
      });

      if (error) {
        console.error("[AcceptedInvitations] Erreur RPC get_partner_phone:", error);
        throw error;
      }

      console.log("[AcceptedInvitations] Données reçues:", data);
      
      // Si la fonction RPC ne retourne rien mais qu'une invitation acceptée existe,
      // récupérer directement le numéro du profil
      if ((!data || data.length === 0) && invitationCheck && invitationCheck.length > 0) {
        console.log("[AcceptedInvitations] RPC vide mais invitation acceptée trouvée, récupération directe du profil");
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("phone_number, whatsapp_enabled")
          .eq("id", partnerId)
          .maybeSingle();
        
        console.log("[AcceptedInvitations] Profil récupéré:", profileData);
        
        if (profileError) {
          console.error("[AcceptedInvitations] Erreur récupération profil:", profileError);
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
      console.warn("[AcceptedInvitations] Aucun numéro trouvé pour:", partnerId);
      showToast(
        "Le joueur n'a pas encore activé WhatsApp.",
        "info"
      );
    } catch (error) {
      console.error("[AcceptedInvitations] Erreur WhatsApp", error);
      showToast("Impossible d'ouvrir WhatsApp.", "error");
    } finally {
      setLoadingPhones((prev) => {
        const next = new Set(prev);
        next.delete(partnerId);
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
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-emerald-500/30">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <h3 className="text-base md:text-lg font-bold text-white">
          Invitation de paire acceptée
        </h3>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => {
          const partner = invitation.partner || {};
          const partnerName =
            partner.first_name && partner.last_name
              ? `${partner.first_name} ${partner.last_name}`
              : partner.first_name || partner.last_name || "Joueur";

          return (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-emerald-500/20 relative"
            >
              {/* Compteur de temps restant en haut à droite */}
              {invitation.responded_at && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-[10px] font-medium text-amber-200">
                    <Clock className="w-3 h-3" />
                    {getTimeRemaining(invitation.responded_at)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-3">
                {partner.avatar_url ? (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                    <Image
                      src={partner.avatar_url}
                      alt={partnerName}
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
                    {partnerName}
                  </p>
                  {partner.niveau_padel && (
                    <p className="text-xs text-gray-400">
                      Niveau {partner.niveau_padel.toFixed(1)}/10
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenWhatsApp(partner.id)}
                disabled={loadingPhones.has(partner.id)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
              >
                {loadingPhones.has(partner.id) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                <span>
                  Envoyez un message à {partnerName} pour organiser votre match !
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

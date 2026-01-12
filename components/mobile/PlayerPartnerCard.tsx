'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, UserPlus, X, Check, Eye, MessageCircle, User, XCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { PlayerSearchResult } from '@/lib/utils/player-utils';

interface Partner {
  id: string;
  partner_id: string;
  status: string;
  partner: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    niveau_padel?: number;
  };
}

interface PendingRequest {
  id: string;
  player_id: string;
  status: string;
  created_at?: string;
  partner: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface PlayerPartnerCardProps {
  hasLevel?: boolean;
  pendingRequestSender?: { first_name: string; last_name: string } | null;
}

export function PlayerPartnerCard({ hasLevel = true, pendingRequestSender = null }: PlayerPartnerCardProps) {
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequest, setSentRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
  const [addingPartner, setAddingPartner] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadPartnerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // 1. Récupérer TOUTES les relations via API (bypass RLS)
        const response = await fetch('/api/partnerships/list');
        if (!response.ok) {
          console.error('[PlayerPartnerCard] Erreur fetch partnerships:', response.status, response.statusText);
          // Ne pas faire planter l'application, juste logger l'erreur
          setPartner(null);
          setPendingRequests([]);
          setSentRequest(null);
          return;
        }
        const { partnerships } = await response.json();

        console.log('[PlayerPartnerCard] Partnerships fetched via API:', partnerships);

        // La suite attend un tableau fusionné, l'API retourne déjà le tableau complet
        // On n'a plus besoin de fusionner asPlayer et asPartner manuellement

        // 2. Filtrer
        // A. Partenaire accepté (status = accepted) - peu importe qui a initié
        const accepted = partnerships.find((p: any) => p.status === 'accepted');

        // B. Demande envoyée (status = pending ET je suis l'initiateur)
        const sent = partnerships.find((p: any) => p.status === 'pending' && p.player_id === user.id);

        // C. Demandes reçues (status = pending ET je suis le destinataire)
        const received = partnerships.filter((p: any) => p.status === 'pending' && p.partner_id === user.id);

        console.log('[PlayerPartnerCard] Filtered - Accepted:', accepted, 'Sent:', sent, 'Received:', received);

        // 3. Récupérer les profils nécessaires
        const profileIdsToFetch = new Set<string>();

        if (accepted) {
          // L'autre personne est le partner_id SI je suis player_id, sinon c'est player_id
          const friendId = accepted.player_id === user.id ? accepted.partner_id : accepted.player_id;
          profileIdsToFetch.add(friendId);
        }
        if (sent) profileIdsToFetch.add(sent.partner_id);
        received.forEach((r: any) => profileIdsToFetch.add(r.player_id));

        console.log('[PlayerPartnerCard] Profile IDs to fetch:', Array.from(profileIdsToFetch));

        let profilesMap = new Map();
        if (profileIdsToFetch.size > 0) {
          // Utiliser l'API pour éviter les problèmes de RLS
          const responseProfiles = await fetch('/api/profiles/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(profileIdsToFetch) })
          });

          if (responseProfiles.ok) {
            const { profiles } = await responseProfiles.json();
            if (profiles) {
              profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
              console.log('[PlayerPartnerCard] Profiles fetched via API:', profiles);
            }
          } else {
            console.error('[PlayerPartnerCard] Failed to fetch profiles:', await responseProfiles.text());
          }
        }

        // 4. Mettre à jour les états

        // Etat Partner
        if (accepted) {
          const friendId = accepted.player_id === user.id ? accepted.partner_id : accepted.player_id;
          const profile = profilesMap.get(friendId);
          if (profile) {
            setPartner({
              id: accepted.id,
              partner_id: friendId, // On garde la convention que "partner" dans l'objet est l'autre
              status: 'accepted',
              partner: {
                id: profile.id,
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                avatar_url: profile.avatar_url || undefined,
                niveau_padel: profile.niveau_padel || undefined
              }
            } as any);
          } else {
            setPartner(null);
          }
        } else {
          setPartner(null);
        }

        // Etat Sent Request
        if (sent && !accepted) {
          const profile = profilesMap.get(sent.partner_id);
          console.log('[PlayerPartnerCard] Processing sent request. Sent:', sent, 'Profile:', profile);

          // Créer l'objet même si le profil n'est pas trouvé (fallback)
          const sentRequestObj = {
            id: sent.id,
            player_id: user.id,
            status: 'pending',
            partner: {
              first_name: profile?.first_name || 'Joueur',
              last_name: profile?.last_name || '',
              avatar_url: profile?.avatar_url || undefined
            }
          };
          console.log('[PlayerPartnerCard] Setting sent request:', sentRequestObj);
          setSentRequest(sentRequestObj);
        } else {
          console.log('[PlayerPartnerCard] Not setting sent request. Sent:', sent, 'Accepted:', accepted);
          setSentRequest(null);
        }

        // Etat Received Requests
        if (received.length > 0) {
          const requestsWithProfile = received.map((req: any) => {
            const profile = profilesMap.get(req.player_id);
            return {
              ...req,
              created_at: req.created_at,
              partner: {
                first_name: profile?.first_name || 'Joueur',
                last_name: profile?.last_name || '',
                avatar_url: profile?.avatar_url || undefined
              }
            };
          });
          console.log('[PlayerPartnerCard] Setting pending requests:', requestsWithProfile);
          setPendingRequests(requestsWithProfile as any);
        } else {
          console.log('[PlayerPartnerCard] No pending requests');
          setPendingRequests([]);
        }

        // ... subscription ...

      } catch (error) {
        console.error('[PlayerPartnerCard] Erreur chargement', error);
        // En cas d'erreur, réinitialiser les états pour éviter un état incohérent
        if (isMounted) {
          setPartner(null);
          setPendingRequests([]);
          setSentRequest(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // ...
    const init = async () => {
      await loadPartnerData();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Subscription pour les changements (sent OR received)
      channel = supabase
        .channel('player-partnerships-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'player_partnerships',
            filter: `player_id=eq.${user.id}`
          },
          () => loadPartnerData()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'player_partnerships',
            filter: `partner_id=eq.${user.id}`
          },
          () => loadPartnerData()
        )
        .subscribe();
    };

    init();

    // Écouter les événements profileUpdated pour recharger les données
    const handleProfileUpdate = () => {
      if (isMounted) {
        loadPartnerData();
      }
    };
    
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  const openCancelDialog = (requestId: string) => {
    setRequestToCancel(requestId);
    setCancelDialogOpen(true);
  };

  const handleRespond = useCallback(async (partnershipId: string, action: 'accepted' | 'declined') => {
    setResponding(partnershipId);
    try {
      const response = await fetch('/api/partnerships/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnership_id: partnershipId,
          accept: action === 'accepted'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la réponse');
      }

      // Notifier pour recharger les données sans recharger la page
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
      
      setResponding(null);
    } catch (error) {
      console.error('[PlayerPartnerCard] Erreur réponse partenariat', error);
      alert('Impossible de traiter la demande');
      setResponding(null);
    }
  }, []);

  const activeRequestId = sentRequest ? sentRequest.id : (partner?.status === 'pending' ? partner.id : null);

  const confirmCancelRequest = async () => {
    if (!requestToCancel) return;

    setIsCancelling(true);
    try {
      const response = await fetch('/api/partnerships/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ partnership_id: requestToCancel })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l’annulation');
      }

      // Fermer le dialog et notifier pour recharger les données
      setCancelDialogOpen(false);
      setRequestToCancel(null);
      
      // Notifier pour recharger les données sans recharger la page
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
    } catch (err) {
      console.error("Erreur annulation", err);
      setErrorMessage("Impossible d'annuler la demande");
      setErrorDialogOpen(true);
      setIsCancelling(false);
    }
  };

  // Recherche de joueurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlayers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`/api/players/search?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      const responseData = await response.json();
      const data = responseData.players || responseData || [];
      setSearchResults(data);
      setShowDropdown(data.length > 0);
    } catch (error) {
      console.error('[PlayerPartnerCard] Erreur recherche joueurs', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setSelectedPlayer(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlayers(value);
    }, 200);
  };

  const handleSelectPlayer = (player: PlayerSearchResult) => {
    const displayName = player.display_name.replace(' 👤', '');
    setSearchValue(displayName);
    setSelectedPlayer(player);
    setShowDropdown(false);
  };

  const handleAddPartner = async () => {
    if (!selectedPlayer) {
      setErrorMessage('Veuillez sélectionner un joueur');
      setErrorDialogOpen(true);
      return;
    }

    setAddingPartner(true);
    try {
      const response = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: selectedPlayer.id })
      });

      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(error.error || "Erreur lors de l'ajout du partenaire");
        setErrorDialogOpen(true);
        return;
      }

      // Réinitialiser et fermer
      setSearchValue('');
      setSelectedPlayer(null);
      setSearchResults([]);
      setShowDropdown(false);
      setShowAddPartner(false);

      // Notifier pour recharger les données sans recharger la page
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
    } catch (error) {
      console.error('[PlayerPartnerCard] Erreur ajout partenaire', error);
      setErrorMessage('Erreur réseau');
      setErrorDialogOpen(true);
    } finally {
      setAddingPartner(false);
    }
  };

  // UI RENDER
  // ...

  // Filtrer les demandes expirées (24h) si le joueur a un partenaire
  const [filteredPendingRequests, setFilteredPendingRequests] = useState<PendingRequest[]>([]);
  
  // État pour le temps actuel (pour le compteur 24h)
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fonction pour calculer le temps restant avant expiration (24h)
  const getTimeRemaining = (createdAt: string | undefined): { hours: number; minutes: number; expired: boolean } | null => {
    if (!createdAt) return null;
    const created = new Date(createdAt);
    const now = currentTime;
    const diffMs = now.getTime() - created.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours >= 24) {
      return { hours: 0, minutes: 0, expired: true };
    }
    
    const remainingMs = (24 * 60 * 60 * 1000) - diffMs;
    const remainingHours = remainingMs / (1000 * 60 * 60);
    const hours = Math.floor(remainingHours);
    const remainingMinutes = (remainingHours - hours) * 60;
    const minutes = Math.floor(remainingMinutes);
    
    return { hours, minutes, expired: false };
  };
  
  useEffect(() => {
    if (partner && pendingRequests.length > 0) {
      const now = new Date();
      const validRequests = pendingRequests.filter((req) => {
        if (!req.created_at) return true; // Garder si pas de date
        const created = new Date(req.created_at);
        const diffMs = now.getTime() - created.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours < 24; // Garder seulement si moins de 24h
      });
      setFilteredPendingRequests(validRequests);
      
      // Supprimer automatiquement les demandes expirées
      if (validRequests.length < pendingRequests.length) {
        // Décliner automatiquement les demandes expirées
        pendingRequests.forEach((req) => {
          if (req.created_at) {
            const created = new Date(req.created_at);
            const diffMs = now.getTime() - created.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours >= 24) {
              // Décliner automatiquement les demandes expirées
              handleRespond(req.id, 'declined').catch(console.error);
            }
          }
        });
      }
    } else {
      setFilteredPendingRequests(pendingRequests);
    }
  }, [partner, pendingRequests, handleRespond]);

  // Mettre à jour le compteur toutes les secondes pour plus de précision
  useEffect(() => {
    if (partner && filteredPendingRequests.length > 0) {
      const interval = setInterval(() => {
        const now = new Date();
        setCurrentTime(now);
        // Vérifier et supprimer les demandes expirées
        filteredPendingRequests.forEach((req) => {
          if (req.created_at) {
            const created = new Date(req.created_at);
            const diffMs = now.getTime() - created.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours >= 24) {
              handleRespond(req.id, 'declined').catch(console.error);
            }
          }
        });
      }, 1000); // Mise à jour toutes les secondes
      return () => clearInterval(interval);
    }
  }, [partner, filteredPendingRequests, handleRespond]);

  // Utiliser filteredPendingRequests au lieu de pendingRequests si partner existe
  const displayRequests = partner ? filteredPendingRequests : pendingRequests;

  // Ne pas afficher le cadre si le joueur a déjà un partenaire habituel
  if (partner) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">Mon partenaire habituel</span>
          </div>
          {hasLevel && !partner && (
            <button
              onClick={() => setShowAddPartner(!showAddPartner)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {showAddPartner ? 'Annuler' : 'Ajouter'}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Message si pas de niveau */}
          {!hasLevel && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 font-normal space-y-2">
              {/* Message si demande reçue sans niveau */}
              {pendingRequestSender && (
                <p className="text-white/90">
                  Tu as reçu une demande de partenaire habituel de la part de {pendingRequestSender.first_name} {pendingRequestSender.last_name}
                </p>
              )}
              <p>Évalue ton niveau pour débloquer l'accès au partenaire habituel</p>
            </div>
          )}

          {/* Contenu normal si niveau évalué */}
          {hasLevel && (
            <>
          {/* 0. SECTION PARTENAIRE ACCEPTÉ */}
          {partner && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Votre partenaire habituel</p>
              <div className="bg-slate-800/80 rounded-xl p-4 border border-green-500/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                <div className="flex items-center gap-3">
                  {partner.partner.avatar_url ? (
                    <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                      <Image src={partner.partner.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white/40 flex-shrink-0 border-2 border-white/20">
                      <User size={24} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-white">
                      {partner.partner.first_name} {partner.partner.last_name}
                    </p>
                    <p className="text-xs text-green-400 font-medium">
                      Partenaire habituel
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1. SECTION INVITATIONS REÇUES */}
          {displayRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                {partner ? 'Demande reçue' : `Invitations reçues (${displayRequests.length})`}
              </p>
              {displayRequests.map((req) => {
                const timeRemaining = getTimeRemaining(req.created_at);
                return (
                  <div key={req.id} className="bg-slate-800/80 rounded-xl p-4 border border-blue-500/30 relative overflow-hidden">
                    {/* Compteur 24h en haut à droite si partenaire existe */}
                    {partner && timeRemaining && !timeRemaining.expired && (
                      <div className="absolute top-3 right-3 bg-orange-500/20 border border-orange-500/30 rounded-lg px-2 py-1 z-10">
                        <p className="text-[10px] text-orange-400 font-bold whitespace-nowrap">
                          {timeRemaining.hours}h {timeRemaining.minutes}m
                        </p>
                      </div>
                    )}
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <div className="flex items-center gap-3 mb-4">
                      {req.partner.avatar_url ? (
                        <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                          <Image src={req.partner.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white/40 flex-shrink-0 border-2 border-white/20">
                          <User size={24} />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-white">
                          {req.partner.first_name} {req.partner.last_name}
                        </p>
                        <p className="text-xs text-blue-400 font-medium">
                          Souhaite devenir votre partenaire habituel
                        </p>
                      </div>
                    </div>

                    {/* Message spécial si partenaire existe */}
                    {partner && (
                      <div className="mb-3 p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <p className="text-xs text-orange-300">
                          Vous avez reçu une demande de partenaire habituel mais vous ne pouvez pas l'accepter tant que vous avez déjà un partenaire habituel.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {/* Bouton Accepter - masqué si partenaire existe */}
                      {!partner && (
                        <button
                          onClick={() => handleRespond(req.id, 'accepted')}
                          disabled={!!responding}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {responding === req.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={16} />
                              Accepter
                            </>
                          )}
                        </button>
                      )}
                      {/* Bouton Refuser - toujours visible */}
                      <button
                        onClick={() => handleRespond(req.id, 'declined')}
                        disabled={!!responding}
                        className={`${partner ? 'flex-1' : 'px-3'} bg-slate-800 hover:bg-red-900/30 text-gray-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2`}
                      >
                        <X size={18} />
                        {partner && <span>Refuser</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. SECTION INVITATION ENVOYÉE */}
          {sentRequest && (
            <div className="space-y-2">
              {pendingRequests.length > 0 && <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Votre invitation envoyée</p>}
              <div className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  {sentRequest.partner.avatar_url ? (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                      <Image src={sentRequest.partner.avatar_url} alt="" width={56} height={56} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 flex items-center justify-center text-white/40 flex-shrink-0 border-2 border-white/20">
                      <User size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm md:text-base">
                      {sentRequest.partner.first_name} {sentRequest.partner.last_name}
                    </p>
                    <p className="text-xs text-blue-400 font-medium bg-blue-400/10 px-2 py-0.5 rounded-full inline-block mt-1">
                      Invitation envoyée
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openCancelDialog(sentRequest.id)}
                  className="w-full py-2 px-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 transition-colors min-h-[44px]"
                >
                  <X size={14} />
                  Annuler la demande
                </button>
              </div>
            </div>
          )}

          {/* 3. SEARCH / ADD PARTNER FORM */}
          {showAddPartner && (
            <div className="space-y-3 pt-2 border-t border-white/10" ref={wrapperRef}>
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-2">
                  Rechercher un joueur du même club
                </label>
                <input
                  type="text"
                  value={searchValue}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  placeholder="Nom du joueur..."
                  className="w-full rounded-lg border border-white/20 bg-slate-800 px-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/20 bg-slate-800 shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((player) => (
                      <button
                        key={`${player.type}-${player.id}`}
                        type="button"
                        onClick={() => handleSelectPlayer(player)}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 transition-colors border-b border-white/10 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{player.display_name}</span>
                          <span className="text-xs text-gray-400">
                            {player.type === 'user' ? 'Inscrit' : 'Invité'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searching && (
                  <div className="absolute right-3 top-10 text-gray-400 text-xs">
                    Recherche...
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddPartner(false);
                    setSearchValue('');
                    setSelectedPlayer(null);
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="flex-1 py-2 px-3 border border-white/20 text-gray-300 rounded-lg text-sm font-medium active:bg-slate-700/50 min-h-[44px]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddPartner}
                  disabled={!selectedPlayer || addingPartner}
                  className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg text-sm font-medium active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {addingPartner ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {!sentRequest && pendingRequests.length === 0 && !showAddPartner && (
            <div className="flex items-center gap-3 text-gray-400 py-2">
              <UserPlus size={20} />
              <p className="text-sm">Aucun partenaire pour le moment</p>
            </div>
          )}
            </>
          )}
        </div>
      </div>
      {/* Dialog de confirmation d'annulation */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Annuler la demande</DialogTitle>
            <DialogDescription className="text-gray-400">
              Êtes-vous sûr de vouloir annuler cette invitation ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setCancelDialogOpen(false)}
              className="group relative w-full flex justify-center py-2 px-4 border border-slate-600 text-sm font-medium rounded-lg text-white bg-transparent hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              disabled={isCancelling}
            >
              Retour
            </button>
            <button
              type="button"
              onClick={confirmCancelRequest}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="animate-spin h-5 w-5 text-white" />
              ) : (
                "Confirmer l'annulation"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog d'erreur - Design toast bleu */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-md bg-blue-500/90 border-blue-400/50 text-white p-0 overflow-hidden">
          <div className="relative flex items-center gap-3 px-4 py-3.5">
            <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
            <p className="flex-1 text-sm font-medium text-white pr-6">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => setErrorDialogOpen(false)}
              className="absolute top-2 right-2 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

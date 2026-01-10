"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Search, Loader2, Filter, Building2, Eye, Trash2, AlertTriangle, X } from "lucide-react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import Link from "next/link";

interface PlayerConversation {
  id: string;
  user_id: string;
  club_id: string;
  club_name: string;
  last_message_at: string;
  last_message_preview: string;
  is_read_by_admin: boolean;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  email: string;
}

interface ClubConversation {
  id: string;
  club_id: string;
  club_name: string;
  club_logo_url?: string;
  club_slug?: string;
  last_message_at: string;
  last_message_preview: string;
  is_read_by_admin: boolean;
}

type ConversationType = 'players' | 'clubs';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminMessagesPage() {
  const [conversationType, setConversationType] = useState<ConversationType>('players');
  const [playerConversations, setPlayerConversations] = useState<PlayerConversation[]>([]);
  const [clubConversations, setClubConversations] = useState<ClubConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    (PlayerConversation | ClubConversation)[]
  >([]);
  const [selectedConv, setSelectedConv] = useState<PlayerConversation | ClubConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const userIdRef = useRef<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<string>("all");
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await getCurrentUser();
      await loadClubs();
      await loadConversations(isMounted);
    };

    init();

    return () => {
      isMounted = false;
      if (conversationsChannelRef.current) {
        supabase.removeChannel(conversationsChannelRef.current);
        conversationsChannelRef.current = null;
      }
    };
  }, []);

  // S'assurer que userId est récupéré au montage et gardé à jour
  useEffect(() => {
    const fetchUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
        setUserId(user.id);
      }
    };
    if (!userId) {
      fetchUserId();
    }
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup des channels au démontage
  useEffect(() => {
    return () => {
      if (conversationsChannelRef.current) {
        supabase.removeChannel(conversationsChannelRef.current);
        conversationsChannelRef.current = null;
      }
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, []);

  const filterConversations = useCallback(() => {
    const conversationsToFilter = conversationType === 'players' 
      ? playerConversations 
      : clubConversations;
    
    let filtered = [...conversationsToFilter];

    // Filtre par club (uniquement pour les joueurs)
    if (conversationType === 'players' && selectedClub !== "all") {
      filtered = filtered.filter((c) => (c as PlayerConversation).club_id === selectedClub);
    }

    // Filtre par recherche
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        if (conversationType === 'players') {
          const pc = c as PlayerConversation;
          return (
            (pc.first_name?.toLowerCase() || "").includes(query) ||
            (pc.last_name?.toLowerCase() || "").includes(query) ||
            (pc.email?.toLowerCase() || "").includes(query) ||
            (pc.club_name?.toLowerCase() || "").includes(query)
          );
        } else {
          const cc = c as ClubConversation;
          return (cc.club_name?.toLowerCase() || "").includes(query);
        }
      });
    }

    setFilteredConversations(filtered);
  }, [conversationType, playerConversations, clubConversations, searchQuery, selectedClub]);

  useEffect(() => {
    filterConversations();
  }, [filterConversations]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userIdRef.current = user.id;
      setUserId(user.id);
    }
  };

  const loadClubs = async () => {
    const { data } = await supabase
      .from("clubs")
      .select("id, name")
      .order("name");

    if (data) setClubs(data);
  };

  const loadConversations = async (isMounted: boolean = true) => {
    try {
      if (conversationType === 'players') {
        // Charger les conversations joueurs
        const { data, error } = await supabase
          .from("admin_conversations_view")
          .select("*")
          .order("last_message_at", { ascending: false });

        if (error) {
          logger.error("[AdminMessages] Erreur chargement conversations joueurs:", error);
          return;
        }

        if (data && isMounted) {
          setPlayerConversations(data as PlayerConversation[]);
        }

        // S'abonner aux changements de conversations joueurs
        if (isMounted) {
          if (conversationsChannelRef.current) {
            supabase.removeChannel(conversationsChannelRef.current);
          }
          const channel = supabase
            .channel(`admin-player-conversations-${Date.now()}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "conversations",
              },
              () => {
                if (isMounted) {
                  loadConversations(isMounted);
                }
              }
            )
            .subscribe();
          conversationsChannelRef.current = channel;
        }
      } else {
        // Charger les conversations clubs
        const { data, error } = await supabase
          .from("admin_club_conversations_view")
          .select("*")
          .order("last_message_at", { ascending: false });

        if (error) {
          logger.error("[AdminMessages] Erreur chargement conversations clubs:", error);
          return;
        }

        if (data && isMounted) {
          setClubConversations(data as ClubConversation[]);
        }

        // S'abonner aux changements de conversations clubs
        if (isMounted) {
          if (conversationsChannelRef.current) {
            supabase.removeChannel(conversationsChannelRef.current);
          }
          const channel = supabase
            .channel(`admin-club-conversations-${Date.now()}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "club_conversations",
              },
              () => {
                if (isMounted) {
                  loadConversations(isMounted);
                }
              }
            )
            .subscribe();
          conversationsChannelRef.current = channel;
        }
      }
    } catch (error) {
      logger.error("[AdminMessages] Erreur chargement conversations:", error);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  // Recharger les conversations quand le type change
  useEffect(() => {
    setSelectedConv(null);
    setMessages([]);
    loadConversations(true);
  }, [conversationType]);

  const selectConversation = async (conv: PlayerConversation | ClubConversation) => {
    setSelectedConv(conv);

    // Nettoyer le channel de messages précédent
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }

    // Charger les messages via l'API admin appropriée selon le type
    const apiEndpoint = conversationType === 'players' 
      ? `/api/admin/messages?conversation_id=${conv.id}`
      : `/api/admin/club-messages?conversation_id=${conv.id}`;

    try {
      const response = await fetch(apiEndpoint, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error("[AdminMessages] Erreur chargement messages:", error);
        setMessages([]);
        return;
      }

      const data = await response.json();
      if (data.messages) {
        // Dédupliquer et trier les messages par date
        const uniqueMessages = data.messages
          .reduce((acc: Message[], msg: Message) => {
            if (!acc.find((m) => m.id === msg.id)) {
              acc.push(msg);
            }
            return acc;
          }, [] as Message[])
          .sort((a: Message, b: Message) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        setMessages(uniqueMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      logger.error("[AdminMessages] Erreur chargement messages:", error);
      setMessages([]);
      return;
    }

    // Marquer comme lu par l'admin
    const tableName = conversationType === 'players' ? "conversations" : "club_conversations";
    await supabase
      .from(tableName)
      .update({ is_read_by_admin: true })
      .eq("id", conv.id);

    // Mettre à jour localement
    if (conversationType === 'players') {
      setPlayerConversations((current) =>
        current.map((c) =>
          c.id === conv.id ? { ...c, is_read_by_admin: true } : c
        )
      );
    } else {
      setClubConversations((current) =>
        current.map((c) =>
          c.id === conv.id ? { ...c, is_read_by_admin: true } : c
        )
      );
    }

    // S'abonner aux nouveaux messages
    const messagesTable = conversationType === 'players' ? "messages" : "club_messages";
    const channel = supabase
      .channel(`admin-${conversationType}-conversation:${conv.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: messagesTable,
          filter: `conversation_id=eq.${conv.id}`,
        },
        (payload: { new: Message }) => {
          const newMessage = payload.new;
          setMessages((current) => {
            // Vérifier si le message n'existe pas déjà pour éviter les doublons
            const exists = current.some((m) => m.id === newMessage.id);
            if (exists) {
              return current;
            }
            // Ajouter et trier par date
            return [...current, newMessage].sort(
              (a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          // Marquer comme lu automatiquement
          supabase
            .from("conversations")
            .update({ is_read_by_admin: true })
            .eq("id", conv.id);
        }
      )
      .subscribe();

    messagesChannelRef.current = channel;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || sending) return;

    setSending(true);

    try {
      const requestBody = {
        content: newMessage.trim(),
        conversation_id: selectedConv.id, // snake_case comme attendu par l'API
      };

      logger.info(
        "[AdminMessages] Envoi message",
        { conversationId: selectedConv.id.substring(0, 8), contentLength: requestBody.content.length }
      );

      // Utiliser la bonne API selon le type de conversation
      const apiEndpoint = conversationType === 'players' 
        ? "/api/messages/send"
        : "/api/club-messages/send";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error(
          "[AdminMessages] Erreur réponse API",
          { status: response.status, error: errorData }
        );
        throw new Error(errorData.error || `Erreur ${response.status}: Erreur lors de l'envoi`);
      }

      const data = await response.json();
      
      if (!data.message) {
        logger.error("[AdminMessages] Réponse API sans message", { data });
        throw new Error("Réponse invalide de l'API");
      }

      logger.info(
        "[AdminMessages] Message envoyé avec succès",
        { messageId: data.message.id.substring(0, 8) }
      );

      // Ajouter le nouveau message immédiatement pour un feedback instantané
      setMessages((current) => {
        // Vérifier si le message n'est pas déjà présent (éviter les doublons)
        const exists = current.some((m) => m.id === data.message.id);
        if (exists) {
          return current;
        }
        // Ajouter et trier par date
        return [...current, data.message].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      setNewMessage("");
      
      // Recharger tous les messages pour s'assurer d'avoir l'historique complet et à jour
      // Cela garantit qu'on voit tous les messages même si le realtime a un délai
      // On utilise un délai plus court maintenant que la déduplication est en place
      if (selectedConv) {
        setTimeout(async () => {
          try {
            const reloadEndpoint = conversationType === 'players'
              ? `/api/admin/messages?conversation_id=${selectedConv.id}`
              : `/api/admin/club-messages?conversation_id=${selectedConv.id}`;
            
            const reloadResponse = await fetch(reloadEndpoint, {
              method: "GET",
              credentials: "include",
            });
            if (reloadResponse.ok) {
              const reloadData = await reloadResponse.json();
              if (reloadData.messages) {
                // Dédupliquer et trier lors du rechargement
                setMessages((current) => {
                  const allMessages = [...current, ...reloadData.messages];
                  const unique = allMessages.reduce((acc: Message[], msg: Message) => {
                    if (!acc.find((m: Message) => m.id === msg.id)) {
                      acc.push(msg);
                    }
                    return acc;
                  }, [] as Message[]);
                  return unique.sort(
                    (a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                });
              }
            } else {
              logger.warn("[AdminMessages] Échec rechargement messages", { status: reloadResponse.status });
            }
          } catch (reloadError) {
            logger.error("[AdminMessages] Erreur rechargement après envoi", { error: reloadError });
          }
        }, 300); // Délai réduit car la déduplication est maintenant en place
      }
    } catch (error) {
      logger.error(
        "[AdminMessages] Erreur envoi message",
        { 
          error: error instanceof Error ? error.message : String(error),
          conversationId: selectedConv?.id?.substring(0, 8)
        }
      );
      alert(
        error instanceof Error 
          ? `Erreur lors de l'envoi du message: ${error.message}` 
          : "Erreur lors de l'envoi du message. Veuillez réessayer."
      );
    } finally {
      setSending(false);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedConv) return;
    setShowDeleteModal(true);
  };

  const deleteConversation = async () => {
    if (!selectedConv) return;

    setDeleting(true);
    try {
      // Utiliser la bonne API selon le type de conversation
      const apiEndpoint = conversationType === 'players'
        ? `/api/admin/conversations/${selectedConv.id}`
        : `/api/admin/club-conversations/${selectedConv.id}`;

      const response = await fetch(apiEndpoint, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }

      // Retirer la conversation de la liste
      if (conversationType === 'players') {
        setPlayerConversations((current) => current.filter((c) => c.id !== selectedConv.id));
      } else {
        setClubConversations((current) => current.filter((c) => c.id !== selectedConv.id));
      }
      
      // Réinitialiser la sélection
      setSelectedConv(null);
      setMessages([]);
      setShowDeleteModal(false);

      logger.info("[AdminMessages] Conversation supprimée", { conversationId: selectedConv.id.substring(0, 8) });
    } catch (error) {
      logger.error(
        "[AdminMessages] Erreur suppression conversation",
        { 
          error: error instanceof Error ? error.message : String(error),
          conversationId: selectedConv.id.substring(0, 8)
        }
      );
      alert(
        error instanceof Error 
          ? `Erreur lors de la suppression: ${error.message}` 
          : "Erreur lors de la suppression. Veuillez réessayer."
      );
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const conversationsForUnread = conversationType === 'players' ? playerConversations : clubConversations;
  const unreadCount = conversationsForUnread.filter((c) => !c.is_read_by_admin).length;

  return (
    <div className="h-[calc(100vh-8rem)] bg-white flex flex-col md:flex-row border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Liste des conversations (gauche) */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          {/* Onglets */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setConversationType('players')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                conversationType === 'players'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Joueurs
            </button>
            <button
              onClick={() => setConversationType('clubs')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                conversationType === 'clubs'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Clubs
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Messages</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Recherche */}
          <div className="relative mb-3">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder={conversationType === 'players' ? "Rechercher un joueur..." : "Rechercher un club..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
            />
          </div>

          {/* Filtre par club (uniquement pour les conversations joueurs) */}
          {conversationType === 'players' && (
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer min-h-[44px]"
              >
                <option value="all">Tous les clubs</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Liste conversations */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                  selectedConv?.id === conv.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                } active:bg-gray-100`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                      {conversationType === 'players' ? (
                        (conv as PlayerConversation).avatar_url ? (
                          <Image
                            src={(conv as PlayerConversation).avatar_url!}
                            alt=""
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-lg">
                            {(conv as PlayerConversation).first_name?.[0] || ""}
                            {(conv as PlayerConversation).last_name?.[0] || ""}
                          </div>
                        )
                      ) : (
                        (conv as ClubConversation).club_logo_url ? (
                          <Image
                            src={(conv as ClubConversation).club_logo_url!}
                            alt=""
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-lg">
                            {(conv as ClubConversation).club_name?.[0] || "C"}
                          </div>
                        )
                      )}
                    </div>
                    {!conv.is_read_by_admin && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          !conv.is_read_by_admin
                            ? "text-gray-900"
                            : "text-gray-700"
                        }`}
                      >
                        {conversationType === 'players'
                          ? `${(conv as PlayerConversation).first_name} ${(conv as PlayerConversation).last_name}`
                          : (conv as ClubConversation).club_name}
                      </p>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {new Date(conv.last_message_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </span>
                    </div>

                    {/* Club (uniquement pour les joueurs) */}
                    {conversationType === 'players' && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 size={12} className="text-gray-400" />
                        <p className="text-xs text-gray-500 truncate">
                          {(conv as PlayerConversation).club_name || "Aucun club"}
                        </p>
                      </div>
                    )}

                    {/* Aperçu message */}
                    <p className="text-xs text-gray-500 truncate">
                      {conv.last_message_preview || "Aucun message"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Zone de conversation (droite) */}
      <div className="flex-1 flex flex-col h-full">
        {selectedConv ? (
          <>
            {/* Header conversation */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                    {conversationType === 'players' ? (
                      (selectedConv as PlayerConversation).avatar_url ? (
                        <Image
                          src={(selectedConv as PlayerConversation).avatar_url!}
                          alt=""
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                          {(selectedConv as PlayerConversation).first_name?.[0] || ""}
                          {(selectedConv as PlayerConversation).last_name?.[0] || ""}
                        </div>
                      )
                    ) : (
                      (selectedConv as ClubConversation).club_logo_url ? (
                        <Image
                          src={(selectedConv as ClubConversation).club_logo_url!}
                          alt=""
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                          {(selectedConv as ClubConversation).club_name?.[0] || "C"}
                        </div>
                      )
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      {conversationType === 'players'
                        ? `${(selectedConv as PlayerConversation).first_name} ${(selectedConv as PlayerConversation).last_name}`
                        : (selectedConv as ClubConversation).club_name}
                    </h2>
                    {conversationType === 'players' && (
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-400" />
                        <p className="text-xs text-gray-500">
                          {(selectedConv as PlayerConversation).club_name || "Aucun club"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {conversationType === 'players' && (
                    <Link
                      href={`/players/${(selectedConv as PlayerConversation).user_id}`}
                      target="_blank"
                      className="px-3 py-1.5 text-xs bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 min-h-[32px] flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Profil</span>
                    </Link>
                  )}
                  <button
                    onClick={handleDeleteClick}
                    disabled={deleting}
                    className="px-3 py-1.5 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 active:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[32px] flex items-center gap-1.5 transition-colors"
                    title="Supprimer la conversation"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
              {messages
                .filter((msg: Message, index: number, self: Message[]) => 
                  // Filtrer les doublons par ID (sécurité supplémentaire)
                  index === self.findIndex((m: Message) => m.id === msg.id)
                )
                .sort((a: Message, b: Message) => 
                  // Trier par date pour garantir l'ordre même après déduplication
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
                .map((msg) => {
                  // Déterminer si le message a été envoyé par l'admin actuel
                  // Utiliser userIdRef pour avoir une valeur synchrone, sinon userId state
                  const myUserId = userIdRef.current || userId;
                  const isSentByMe = myUserId !== "" && myUserId !== null && String(msg.sender_id).trim() === String(myUserId).trim();
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                    >
                    <div
                      className={`max-w-[60%] rounded-2xl px-4 py-3 ${
                        isSentByMe
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : "bg-gray-200 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isSentByMe ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={sendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Votre réponse..."
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-500 text-white rounded-lg px-6 py-3 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2 font-medium min-h-[44px] active:bg-blue-700 transition-colors"
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Send size={20} />
                      <span className="hidden sm:inline">Envoyer</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <Filter size={32} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Modale de confirmation de suppression */}
      {showDeleteModal && selectedConv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Supprimer la conversation
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={deleting}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                Êtes-vous sûr de vouloir supprimer la conversation avec{" "}
                <span className="font-semibold text-gray-900">
                  {conversationType === 'players'
                    ? `${(selectedConv as PlayerConversation).first_name} ${(selectedConv as PlayerConversation).last_name}`
                    : (selectedConv as ClubConversation).club_name}
                </span>
                ?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Attention :</span> Cette action est irréversible et supprimera définitivement tous les messages associés à cette conversation.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                Annuler
              </button>
              <button
                onClick={deleteConversation}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

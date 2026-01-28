"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Search, Loader2, Filter, Building2, Eye, Trash2, AlertTriangle, X, MessageSquare } from "lucide-react";
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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const conversationsForUnread = conversationType === 'players' ? playerConversations : clubConversations;
  const unreadCount = conversationsForUnread.filter((c) => !c.is_read_by_admin).length;

  return (
    <div className="h-[calc(100vh-8rem)] bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10">
      {/* Liste des conversations (gauche) */}
      <div className="w-full md:w-96 bg-slate-900/40 border-r border-white/5 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-white/5">
          {/* Onglets */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setConversationType('players')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${conversationType === 'players'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
            >
              Joueurs
            </button>
            <button
              onClick={() => setConversationType('clubs')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${conversationType === 'clubs'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
            >
              Clubs
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white">Messages</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-500/20">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Recherche */}
          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder={conversationType === 'players' ? "Rechercher un joueur..." : "Rechercher un club..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 min-h-[44px]"
            />
          </div>

          {/* Filtre par club (uniquement pour les conversations joueurs) */}
          {conversationType === 'players' && (
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 appearance-none cursor-pointer min-h-[44px]"
              >
                <option value="all" className="bg-slate-900">Tous les clubs</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id} className="bg-slate-900">
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Liste conversations */}
        <div className="flex-1 overflow-y-auto bg-transparent custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full p-4 border-b border-white/5 hover:bg-white/5 transition-all text-left ${selectedConv?.id === conv.id
                  ? "bg-gradient-to-r from-blue-600/10 to-transparent border-l-4 border-l-blue-500"
                  : "border-l-4 border-l-transparent"
                  } active:bg-white/10`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-slate-800">
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
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
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
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                            {(conv as ClubConversation).club_name?.[0] || "C"}
                          </div>
                        )
                      )}
                    </div>
                    {!conv.is_read_by_admin && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className={`text-sm font-semibold truncate ${!conv.is_read_by_admin
                          ? "text-white"
                          : "text-slate-300"
                          }`}
                      >
                        {conversationType === 'players'
                          ? `${(conv as PlayerConversation).first_name} ${(conv as PlayerConversation).last_name}`
                          : (conv as ClubConversation).club_name}
                      </p>
                      <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
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
                        <Building2 size={12} className="text-slate-500" />
                        <p className="text-xs text-slate-500 truncate">
                          {(conv as PlayerConversation).club_name || "Aucun club"}
                        </p>
                      </div>
                    )}

                    {/* Aperçu message */}
                    <p className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">
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
      <div className="flex-1 flex flex-col h-full bg-slate-900/40">
        {selectedConv ? (
          <>
            {/* Header conversation */}
            <div className="bg-white/5 border-b border-white/5 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-800">
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
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
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
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                          {(selectedConv as ClubConversation).club_name?.[0] || "C"}
                        </div>
                      )
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-white">
                      {conversationType === 'players'
                        ? `${(selectedConv as PlayerConversation).first_name} ${(selectedConv as PlayerConversation).last_name}`
                        : (selectedConv as ClubConversation).club_name}
                    </h2>
                    {conversationType === 'players' && (
                      <p className="text-xs text-slate-400">
                        {(selectedConv as PlayerConversation).email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Delete button */}
                  <button
                    onClick={handleDeleteClick}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors"
                    title="Supprimer la conversation"
                  >
                    <Trash2 size={18} />
                  </button>

                  <Link
                    href={conversationType === 'players'
                      ? `/admin/players?search=${(selectedConv as PlayerConversation).email}`
                      : `/admin/clubs/${(selectedConv as ClubConversation).club_id}`
                    }
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    target="_blank"
                  >
                    <Eye size={18} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                  <MessageSquare size={48} className="mb-2" />
                  <p>Aucun message pour le moment</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.is_admin === true;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"
                        }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${isUser
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none"
                          : "bg-slate-800 border border-white/5 text-slate-200 rounded-bl-none"
                          }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 text-right ${isUser ? "text-blue-200" : "text-slate-500"
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white/5 border-t border-white/5 backdrop-blur-md">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl disabled:opacity-50 disabled:hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20"
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-3 text-red-400 mb-4">
                    <AlertTriangle size={24} />
                    <h3 className="text-lg font-bold text-white">Confirmer suppression</h3>
                  </div>
                  <p className="text-slate-300 mb-6 text-sm">
                    Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      disabled={deleting}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={deleteConversation}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-900/20 transition-all hover:scale-105"
                      disabled={deleting}
                    >
                      {deleting ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <MessageSquare size={48} className="text-slate-600" />
            </div>
            <p className="text-lg font-medium text-white mb-2">Sélectionnez une conversation</p>
            <p className="text-sm max-w-xs text-center">Choisissez un joueur ou un club à gauche pour voir les messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import PageTitle from "../PageTitle";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { getAuthenticatedUserClubId, getOrCreateSupportConversation } from "../actions";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_admin: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  club_id: string;
  last_message_at: string;
  is_read_by_club: boolean;
}

export default function HelpPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialisation de la conversation et chargement des messages
  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      try {
        setLoadingMessages(true);

        // Récupérer l'utilisateur
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          if (!user) logger.error("[ClubSupport] Pas d'utilisateur connecté");
          return;
        }

        userIdRef.current = user.id;
        setUserId(user.id);

        // Récupérer le club_id de l'utilisateur (via profiles OU club_admins)
        // Récupérer le club_id via Server Action pour contourner les problèmes de RLS
        const clubId = await getAuthenticatedUserClubId();

        if (!clubId || !isMounted) {
          if (!clubId) {
            logger.error("[ClubSupport] Pas de club_id trouvé pour l'utilisateur (ni dans profiles ni dans club_admins)");
            setError("Vous devez être associé à un club pour utiliser le support. Contactez votre administrateur.");
          }
          if (isMounted) {
            setLoadingMessages(false);
          }
          return;
        }

        // Vérifier si une conversation existe pour ce club
        let { data: conv, error: convError } = await supabase
          .from("club_conversations")
          .select("*")
          .eq("club_id", clubId)
          .maybeSingle();

        if (!conv && isMounted) {
          try {
            const result = await getOrCreateSupportConversation(clubId);
            if (result.error) {
              logger.warn("[ClubSupport] Erreur récupération/création conversation server-side:", result.error);
            } else if (result.conversation) {
              conv = result.conversation;
            }
          } catch (err) {
            logger.error("[ClubSupport] Exception lors de l'appel getOrCreateSupportConversation:", err);
          }
        }

        if (!isMounted) return;

        // Si on a une conversation, la charger et s'abonner aux messages
        if (conv) {
          setConversation(conv);

          // Charger les messages existants
          const { data: msgs, error: msgsError } = await supabase
            .from("club_messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

          if (msgsError) {
            logger.error("[ClubSupport] Erreur chargement messages:", msgsError);
          } else if (msgs && isMounted) {
            const uniqueMessages = msgs
              .reduce((acc: Message[], msg: Message) => {
                if (!acc.find((m: Message) => m.id === msg.id)) {
                  acc.push(msg);
                }
                return acc;
              }, [] as Message[])
              .sort((a: Message, b: Message) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            setMessages(uniqueMessages);

            // Marquer comme lu par le club
            await supabase
              .from("club_conversations")
              .update({ is_read_by_club: true })
              .eq("id", conv.id);

            // S'abonner aux nouveaux messages en temps réel
            if (isMounted) {
              channel = supabase
                .channel(`club-conversation:${conv.id}`)
                .on(
                  "postgres_changes",
                  {
                    event: "INSERT",
                    schema: "public",
                    table: "club_messages",
                    filter: `conversation_id=eq.${conv.id}`,
                  },
                  (payload: { new: Message }) => {
                    if (isMounted) {
                      const newMessage = payload.new as Message;
                      setMessages((current) => {
                        const exists = current.some((m) => m.id === newMessage.id);
                        if (exists) return current;
                        return [...current, newMessage].sort(
                          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                      });
                      supabase
                        .from("club_conversations")
                        .update({ is_read_by_club: true })
                        .eq("id", conv.id);
                    }
                  }
                )
                .subscribe();
            }
          }
        } else {
          // Pas de conversation encore, mais on peut quand même permettre l'envoi
          // La conversation sera créée par l'API lors du premier message
          logger.info("[ClubSupport] Pas de conversation existante, sera créée lors du premier message");
        }
      } catch (error) {
        logger.error("[ClubSupport] Erreur initialisation chat:", error);
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: { user: { id: string } } | null) => {
      if (session?.user && isMounted) {
        userIdRef.current = session.user.id;
        setUserId(session.user.id);
      } else if (!session?.user && isMounted) {
        userIdRef.current = null;
        setUserId(null);
      }
    });

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Envoyer un nouveau message
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // L'API créera automatiquement la conversation si elle n'existe pas
      const response = await fetch("/api/club-messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message.trim(),
          conversation_id: conversation?.id, // Peut être undefined, l'API créera la conversation
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Erreur lors de l'envoi du message";
        throw new Error(errorMessage);
      }

      setMessage("");

      // Si la conversation n'existait pas, elle a été créée par l'API
      // Recharger la conversation pour avoir l'ID et s'abonner aux messages
      const newConversationId = data.conversation_id || data.message?.conversation_id;

      if (!conversation && newConversationId) {
        // Recharger les données de la conversation
        // Utiliser Server Action pour récupérer clubId de manière sécurisée
        const clubId = await getAuthenticatedUserClubId();

        if (clubId) {
          const { data: newConv } = await supabase
            .from("club_conversations")
            .select("*")
            .eq("club_id", clubId)
            .maybeSingle();

          if (newConv) {
            setConversation(newConv);

            // Charger les messages existants maintenant qu'on a la conversation
            const { data: msgs } = await supabase
              .from("club_messages")
              .select("*")
              .eq("conversation_id", newConv.id)
              .order("created_at", { ascending: true });

            if (msgs) {
              const uniqueMessages = msgs
                .reduce((acc: Message[], msg: Message) => {
                  if (!acc.find((m: Message) => m.id === msg.id)) {
                    acc.push(msg);
                  }
                  return acc;
                }, [] as Message[])
                .sort((a: Message, b: Message) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              setMessages(uniqueMessages);
            }

            // S'abonner aux nouveaux messages en temps réel
            const channel = supabase
              .channel(`club-conversation:${newConv.id}`)
              .on(
                "postgres_changes",
                {
                  event: "INSERT",
                  schema: "public",
                  table: "club_messages",
                  filter: `conversation_id=eq.${newConv.id}`,
                },
                (payload: { new: Message }) => {
                  const newMessage = payload.new as Message;
                  setMessages((current) => {
                    const exists = current.some((m) => m.id === newMessage.id);
                    if (exists) return current;
                    return [...current, newMessage].sort(
                      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                  });
                  supabase
                    .from("club_conversations")
                    .update({ is_read_by_club: true })
                    .eq("id", newConv.id);
                }
              )
              .subscribe();
          }
        }
      }

      // Ajouter le message à la liste immédiatement si disponible
      if (data.message) {
        setMessages((current) => {
          const exists = current.some((m) => m.id === data.message.id);
          return exists ? current : [...current, data.message].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du message");
    } finally {
      setLoading(false);
    }
  };


  if (loadingMessages) {
    return (
      <div className="relative space-y-6">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute -top-40 -left-40 h-[48rem] w-[48rem] bg-[radial-gradient(closest-side,rgba(0,102,255,0.2),transparent_70%)] blur-[80px] animate-pulse animate-drift-slow" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[36rem] w-[36rem] bg-[radial-gradient(closest-side,rgba(0,102,255,0.18),transparent_70%)] blur-[100px] animate-pulse animate-drift-fast" style={{ animationDelay: "1.6s" }} />
          <div className="absolute -top-16 -right-6 h-[28rem] w-[28rem] bg-[radial-gradient(closest-side,rgba(191,255,0,0.28),transparent_70%)] blur-[80px] animate-pulse animate-drift-medium" style={{ animationDelay: "2.2s" }} />
          <div className="absolute top-8 right-20 h-[18rem] w-[18rem] bg-[radial-gradient(closest-side,rgba(0,102,255,0.24),transparent_70%)] blur-[70px] animate-pulse animate-drift-fast" style={{ animationDelay: "2.8s" }} />
        </div>
        <div className="relative z-10 space-y-6">
          <PageTitle title="Aide & Support" />
          <div className="text-center text-white/50 py-8">
            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Halos de couleur en fond qui défilent avec le scroll */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Halo bleu en haut à gauche */}
        <div className="absolute -top-40 -left-40 h-[48rem] w-[48rem] bg-[radial-gradient(closest-side,rgba(0,102,255,0.2),transparent_70%)] blur-[80px] animate-pulse animate-drift-slow" />
        {/* Halo bleu au centre */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[36rem] w-[36rem] bg-[radial-gradient(closest-side,rgba(0,102,255,0.18),transparent_70%)] blur-[100px] animate-pulse animate-drift-fast" style={{ animationDelay: "1.6s" }} />
        {/* Halo lime/jaune en haut à droite */}
        <div className="absolute -top-16 -right-6 h-[28rem] w-[28rem] bg-[radial-gradient(closest-side,rgba(191,255,0,0.28),transparent_70%)] blur-[80px] animate-pulse animate-drift-medium" style={{ animationDelay: "2.2s" }} />
        {/* Petit halo bleu */}
        <div className="absolute top-8 right-20 h-[18rem] w-[18rem] bg-[radial-gradient(closest-side,rgba(0,102,255,0.24),transparent_70%)] blur-[70px] animate-pulse animate-drift-fast" style={{ animationDelay: "2.8s" }} />
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-4 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-transparent backdrop-blur-sm py-4 mb-4">
          <PageTitle title="Aide & Support" />
        </div>

        {/* Container principal avec conversation et formulaire */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          {/* Zone de messages scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <MessageCircle size={48} className="text-white/30 mb-4" />
                <p className="text-sm text-white/60 text-center">
                  Aucun message pour le moment.
                </p>
                <p className="text-xs text-white/40 mt-2 text-center">
                  Envoyez un message pour commencer la conversation
                </p>
              </div>
            ) : (
              messages
                .filter((msg, index, self) => index === self.findIndex((m) => m.id === msg.id))
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((msg) => {
                  const myUserId = userIdRef.current || userId;
                  const isSentByMe = myUserId !== null && myUserId !== "" && String(msg.sender_id).trim() === String(myUserId).trim();

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${isSentByMe
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : "bg-white/10 border border-white/20 text-white/90 rounded-bl-sm"
                          }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className={`text-[10px] mt-1.5 ${isSentByMe ? "text-blue-100" : "text-white/50"
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

          {/* Messages d'erreur/succès */}
          {error && (
            <div className="px-6 pt-2 pb-0">
              <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
                {error}
              </div>
            </div>
          )}

          {/* Formulaire d'envoi fixé en bas du container */}
          <div className="border-t border-white/10 p-4 bg-white/5">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600 flex items-center gap-2 font-medium min-h-[44px] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.35)] disabled:hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)]"
              >
                {loading ? (
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
        </div>
      </div>
    </div>
  );
}

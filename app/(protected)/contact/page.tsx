"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { logger } from "@/lib/logger";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_admin: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  last_message_at: string;
  is_read_by_user: boolean;
}

export default function ContactPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      try {
        setLoading(true);

        // Récupérer l'utilisateur en premier pour avoir userId disponible
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          if (!user) logger.error("[Contact] Pas d'utilisateur connecté");
          return;
        }

        // Définir userId immédiatement pour qu'il soit disponible au rendu
        userIdRef.current = user.id;
        setUserId(user.id);

        // Vérifier si une conversation existe
        let { data: conv, error: convError } = await supabase
          .from("conversations")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // Si pas de conversation, en créer une
        if (!conv) {
          // Récupérer le club_id de l'utilisateur
          const { data: profile } = await supabase
            .from("profiles")
            .select("club_id")
            .eq("id", user.id)
            .single();

          const { data: newConv, error: createError } = await supabase
            .from("conversations")
            .insert({
              user_id: user.id,
              club_id: profile?.club_id || "00000000-0000-0000-0000-000000000000",
              status: "open",
            })
            .select()
            .single();

          if (createError || !isMounted) {
            if (createError) logger.error("[Contact] Erreur création conversation:", createError);
            return;
          }

          conv = newConv;
        }

        if (!isMounted) return;
        setConversation(conv);

        // Charger les messages existants
        const { data: msgs, error: msgsError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (msgsError) {
          logger.error("[Contact] Erreur chargement messages:", msgsError);
          return;
        }

        if (msgs && isMounted) {
          // Dédupliquer les messages par ID et trier par date
          const uniqueMessages = msgs
            .reduce((acc, msg) => {
              if (!acc.find((m) => m.id === msg.id)) {
                acc.push(msg);
              }
              return acc;
            }, [] as Message[])
            .sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          setMessages(uniqueMessages);
        }

        // Marquer comme lu par l'utilisateur
        await supabase
          .from("conversations")
          .update({ is_read_by_user: true })
          .eq("id", conv.id);

        // S'abonner aux nouveaux messages en temps réel
        if (isMounted) {
          channel = supabase
            .channel(`user-conversation:${conv.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `conversation_id=eq.${conv.id}`,
              },
              (payload) => {
                if (isMounted) {
                  const newMessage = payload.new as Message;
                  setMessages((current) => {
                    // Vérifier si le message n'existe pas déjà pour éviter les doublons
                    const exists = current.some((m) => m.id === newMessage.id);
                    if (exists) return current;
                    // Ajouter et trier par date
                    return [...current, newMessage].sort(
                      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                  });
                  // Marquer comme lu
                  supabase
                    .from("conversations")
                    .update({ is_read_by_user: true })
                    .eq("id", conv.id);
                }
              }
            )
            .subscribe();
        }
      } catch (error) {
        logger.error("[Contact] Erreur initialisation chat:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();
    
    // Écouter les changements d'authentification pour mettre à jour userId
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          conversation_id: conversation.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'envoi");
      }

      const data = await response.json();
      if (data.message) {
        setMessages((current) => {
          // Vérifier si le message n'existe pas déjà pour éviter les doublons
          // (il peut arriver via realtime en même temps)
          const exists = current.some((m) => m.id === data.message.id);
          return exists ? current : [...current, data.message];
        });
        setNewMessage("");
      }
    } catch (error) {
      logger.error("[Contact] Erreur envoi message:", error);
      alert("Erreur lors de l'envoi du message. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 pb-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-sm text-gray-400">Chargement du chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col px-4 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 py-4 mb-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle size={24} className="text-blue-500" />
            Support PadelXP
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Posez-nous vos questions, nous vous répondrons rapidement
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-4xl mx-auto w-full space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-400">
              Aucun message pour le moment.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Envoyez un message pour commencer la conversation
            </p>
          </div>
        ) : (
          messages
            .filter((msg, index, self) => 
              // Filtrer les doublons par ID (au cas où)
              index === self.findIndex((m) => m.id === msg.id)
            )
            .sort((a, b) => 
              // Trier par date pour garantir l'ordre même après déduplication
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            .map((msg) => {
              // Déterminer si le message a été envoyé par l'utilisateur actuel
              // Utiliser userIdRef pour avoir une valeur synchrone, sinon userId state
              const myUserId = userIdRef.current || userId;
              const isSentByMe = myUserId !== null && myUserId !== "" && String(msg.sender_id).trim() === String(myUserId).trim();
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                >
                <div
                  className={`max-w-[80%] sm:max-w-[60%] rounded-2xl px-4 py-3 ${
                    isSentByMe
                      ? "bg-blue-500 text-white rounded-br-sm"
                      : "bg-slate-700 text-gray-200 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isSentByMe ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
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
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 py-4">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 min-h-[44px]"
            disabled={sending || !conversation}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !conversation}
            className="bg-blue-500 text-white rounded-lg px-6 py-3 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2 font-medium min-h-[44px] active:bg-blue-700"
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
    </div>
  );
}

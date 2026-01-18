"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
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

export default function SupportChatSection() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
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
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !isMounted) return;

                userIdRef.current = user.id;
                setUserId(user.id);

                let { data: conv } = await supabase
                    .from("conversations")
                    .select("*")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!conv) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("club_id")
                        .eq("id", user.id)
                        .single();

                    const { data: newConv } = await supabase
                        .from("conversations")
                        .insert({
                            user_id: user.id,
                            club_id: profile?.club_id || "00000000-0000-0000-0000-000000000000",
                            status: "open",
                        })
                        .select()
                        .single();

                    conv = newConv;
                }

                if (!isMounted) return;
                setConversation(conv);

                const { data: msgs } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("conversation_id", conv.id)
                    .order("created_at", { ascending: true });

                if (msgs && isMounted) {
                    const uniqueMessages = msgs
                        .reduce((acc, msg) => {
                            if (!acc.find((m) => m.id === msg.id)) acc.push(msg);
                            return acc;
                        }, [] as Message[])
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    setMessages(uniqueMessages);
                }

                await supabase.from("conversations").update({ is_read_by_user: true }).eq("id", conv.id);

                if (isMounted) {
                    channel = supabase
                        .channel(`user-conversation:${conv.id}`)
                        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` },
                            (payload) => {
                                if (isMounted) {
                                    const newMessage = payload.new as Message;
                                    setMessages((current) => {
                                        if (current.some((m) => m.id === newMessage.id)) return current;
                                        return [...current, newMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                                    });
                                }
                            }
                        )
                        .subscribe();
                }
            } catch (error) {
                logger.error("[SupportChat] Error:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        init();
        return () => {
            isMounted = false;
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (isExpanded) scrollToBottom();
    }, [messages, isExpanded]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversation || sending) return;

        setSending(true);
        try {
            const response = await fetch("/api/messages/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newMessage.trim(), conversation_id: conversation.id }),
            });

            if (!response.ok) throw new Error("Erreur lors de l'envoi");

            const data = await response.json();
            if (data.message) {
                setMessages((current) => current.some((m) => m.id === data.message.id) ? current : [...current, data.message]);
                setNewMessage("");
            }
        } catch (error) {
            logger.error("[SupportChat] Send error:", error);
            alert("Erreur lors de l'envoi du message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                    <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-white">Support PadelXP</h2>
                        <p className="text-xs text-white/60">Posez vos questions, nous vous répondrons rapidement</p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="text-white/60" /> : <ChevronDown className="text-white/60" />}
            </button>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    {loading ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                            <Loader2 className="animate-spin text-blue-500" size={20} />
                            <span className="text-sm text-gray-400">Chargement...</span>
                        </div>
                    ) : (
                        <>
                            <div className="max-h-64 overflow-y-auto space-y-3 mb-4">
                                {messages.length === 0 ? (
                                    <div className="text-center py-6">
                                        <MessageCircle size={32} className="text-gray-600 mx-auto mb-2" />
                                        <p className="text-xs text-gray-400">Aucun message. Envoyez-nous votre question !</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const myUserId = userIdRef.current || userId;
                                        const isSentByMe = myUserId && String(msg.sender_id).trim() === String(myUserId).trim();
                                        return (
                                            <div key={msg.id} className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${isSentByMe ? "bg-blue-500/60 text-white" : "bg-white/10 text-gray-200"}`}>
                                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                    <p className={`text-[10px] mt-1 ${isSentByMe ? "text-blue-100" : "text-gray-400"}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={sendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Votre message..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                    disabled={sending || !conversation}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending || !conversation}
                                    className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

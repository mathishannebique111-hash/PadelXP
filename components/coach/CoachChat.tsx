"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ArrowRight,
  Crown,
} from "lucide-react";
import CoachMarkdown from "./CoachMarkdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  isPremium: boolean;
  remaining: number | null;
}

const SUGGESTIONS = [
  "Comment améliorer ma bandeja ?",
  "Donne-moi un exercice pour le filet",
  "Analyse mon niveau et mes axes de progression",
  "Programme d'entraînement pour cette semaine",
];

export default function CoachChat({ userId, coachName }: { userId: string; coachName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConvDropdown, setShowConvDropdown] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowConvDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Refresh usage (appelé au mount et au focus pour détecter un upgrade premium)
  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/usage", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
        if (data.isPremium) {
          // L'utilisateur est premium → débloquer immédiatement
          setLimitReached(false);
        } else if (data.remaining <= 0) {
          setLimitReached(true);
        } else {
          setLimitReached(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Load conversations + usage on mount
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [convRes] = await Promise.all([
          fetch("/api/coach/conversations", { credentials: "include" }),
          refreshUsage(),
        ]);

        if (convRes.ok) {
          const { conversations: convs } = await convRes.json();
          setConversations(convs || []);

          if (convs && convs.length > 0) {
            setActiveConvId(convs[0].id);
          } else {
            await createConversation();
          }
        }
      } catch (error) {
        console.error("[CoachChat] Init error:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [refreshUsage]);

  // Re-check usage quand l'utilisateur revient sur la page (après achat premium)
  useEffect(() => {
    function handleFocus() {
      refreshUsage();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshUsage]);

  // Détecter le retour après achat premium (param ?premium_success=true)
  useEffect(() => {
    if (searchParams.get("premium_success") === "true") {
      refreshUsage();
      // Nettoyer l'URL
      router.replace("/coach", { scroll: false });
    }
  }, [searchParams, refreshUsage, router]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    loadMessages(activeConvId);
  }, [activeConvId]);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  async function loadMessages(convId: string) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("coach_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error("[CoachChat] Load messages error:", error);
    }
  }

  async function createConversation() {
    try {
      const res = await fetch("/api/coach/conversations", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const { conversation } = await res.json();
        setConversations((prev) => [conversation, ...prev]);
        setActiveConvId(conversation.id);
        setMessages([]);
        setShowConvDropdown(false);
      }
    } catch (error) {
      console.error("[CoachChat] Create conversation error:", error);
    }
  }

  async function deleteConversation(convId: string) {
    try {
      await fetch("/api/coach/conversations", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId }),
      });

      setConversations((prev) => prev.filter((c) => c.id !== convId));

      if (activeConvId === convId) {
        const remaining = conversations.filter((c) => c.id !== convId);
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id);
        } else {
          await createConversation();
        }
      }
    } catch (error) {
      console.error("[CoachChat] Delete error:", error);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = (text || input).trim();
    if (!messageText || !activeConvId || isStreaming) return;

    // Reset input immediately
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistic: add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          message: messageText,
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setLimitReached(true);
        setUsage((prev) => prev ? { ...prev, remaining: 0, used: data.used } : prev);
        // Remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setIsStreaming(false);
        return;
      }

      if (!res.ok) {
        console.error("[CoachChat] API error:", res.status);
        setIsStreaming(false);
        return;
      }

      // Stream the response
      const reader = res.body?.getReader();
      if (!reader) {
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingContent(accumulated);
      }

      // Add completed assistant message
      if (accumulated.trim()) {
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: accumulated.trim(),
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }

      // Update usage
      if (usage && !usage.isPremium) {
        setUsage((prev) => {
          if (!prev) return prev;
          const newUsed = prev.used + 1;
          const newRemaining = Math.max(0, prev.limit - newUsed);
          if (newRemaining <= 0) setLimitReached(true);
          return { ...prev, used: newUsed, remaining: newRemaining };
        });
      }

      // Update conversation title in list
      if (messages.length === 0) {
        const newTitle = messageText.slice(0, 60) + (messageText.length > 60 ? "..." : "");
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId ? { ...c, title: newTitle } : c
          )
        );
      }
    } catch (error) {
      console.error("[CoachChat] Send error:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      inputRef.current?.focus();
    }
  }

  function handleUpgrade() {
    router.push("/premium?returnPath=/coach");
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-xs text-white/50 animate-pulse uppercase tracking-wide">
          Chargement du coach...
        </p>
      </div>
    );
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-[calc(100dvh-14rem)]">
      {/* Header: conversation selector */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div ref={dropdownRef} className="relative flex-1">
          <button
            onClick={() => setShowConvDropdown(!showConvDropdown)}
            className="flex items-center gap-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            <span className="truncate flex-1 text-left">
              {activeConv?.title || "Nouvelle conversation"}
            </span>
            <ChevronDown
              size={16}
              className={`text-white/40 transition-transform ${showConvDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {showConvDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-white/15 bg-[#0a1a4a] shadow-xl max-h-60 overflow-y-auto">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 px-3 py-2.5 hover:bg-white/10 cursor-pointer transition-colors ${
                    c.id === activeConvId ? "bg-white/10" : ""
                  }`}
                >
                  <span
                    className="truncate flex-1 text-sm text-white/80"
                    onClick={() => {
                      setActiveConvId(c.id);
                      setShowConvDropdown(false);
                    }}
                  >
                    {c.title}
                  </span>
                  {conversations.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(c.id);
                      }}
                      className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={createConversation}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/15 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Nouvelle conversation"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 space-y-4">
        {isEmpty && !limitReached && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
              Salut, moi c&apos;est {coachName}
            </h2>
            <p className="text-sm text-white/45 mb-6 max-w-xs">
              Ton coach de padel. Pose-moi n&apos;importe quelle question !
            </p>

            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isStreaming}
                  className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Limit reached paywall */}
        {limitReached && isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Limite atteinte pour aujourd&apos;hui
            </h3>
            <p className="text-sm text-white/50 mb-6 max-w-xs">
              Tu as utilisé tes 5 messages gratuits. Passe Premium pour un accès
              illimité à ton coach IA.
            </p>
            <button
              onClick={handleUpgrade}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-400 shadow-[0_8px_24px_rgba(59,130,246,0.35)] transition-all"
            >
              <Sparkles size={16} />
              Devenir Premium
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mt-0.5">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-500/20 border border-blue-400/30 rounded-br-sm"
                  : "bg-white/[0.07] border border-white/10 rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <CoachMarkdown content={msg.content} />
              ) : (
                <p className="text-sm text-white/90 whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mt-0.5">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[82%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white/[0.07] border border-white/10">
              <CoachMarkdown content={streamingContent} />
              <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}

        {/* Streaming indicator (before first chunk) */}
        {isStreaming && !streamingContent && (
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mt-0.5">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-white/[0.07] border border-white/10">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm text-white/40">{coachName} réfléchit...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-2 pb-1">
        {/* Limit reached inline paywall */}
        {limitReached && messages.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 mb-2">
            <p className="text-xs text-amber-200/80">
              Limite de 5 messages atteinte pour aujourd&apos;hui
            </p>
            <button
              onClick={handleUpgrade}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors"
            >
              Passer Premium <ArrowRight size={12} />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={limitReached ? "Passe Premium pour continuer..." : "Pose ta question au coach..."}
            disabled={isStreaming || limitReached}
            className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || limitReached}
            className="flex items-center justify-center w-12 rounded-xl bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>

        {/* Usage counter */}
        {usage && !usage.isPremium && !limitReached && (
          <p className="text-center text-[11px] text-white/30 mt-2">
            {usage.remaining} message{(usage.remaining ?? 0) > 1 ? "s" : ""} restant
            {(usage.remaining ?? 0) > 1 ? "s" : ""} aujourd&apos;hui
          </p>
        )}
      </div>
    </div>
  );
}

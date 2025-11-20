'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import PageTitle from "../PageTitle";

interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: 'club' | 'admin';
  sender_id: string | null;
  sender_email?: string | null;
  message_text?: string;
  content?: string;
  html_content?: string | null;
  created_at: string;
}

interface SupportConversation {
  id: string;
  club_id: string;
  user_id: string;
  user_email: string;
  club_name: string;
  subject: string | null;
  status: 'open' | 'closed' | 'resolved';
  last_message_at: string;
  created_at: string;
  messages?: SupportMessage[];
}

interface ConversationWithMessages extends SupportConversation {
  messages: SupportMessage[];
}

export default function HelpPage() {
  const [message, setMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState<{ [conversationId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ [conversationId: string]: boolean }>({});
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [openConversations, setOpenConversations] = useState<Set<string>>(new Set());
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set()); // Messages que le club a vus
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const replyFormRefs = useRef<{ [conversationId: string]: HTMLFormElement | null }>({});

  // Charger toutes les conversations et leurs messages
  const loadConversations = async (showLoading = false) => {
    try {
      if (showLoading || isInitialLoad) {
        setLoadingMessages(true);
      }
      const response = await fetch('/api/support/conversation');
      const data = await response.json();

      if (response.ok) {
        console.log('✅ Conversations loaded:', {
          count: data.conversations?.length || 0,
          conversations: data.conversations?.map((c: ConversationWithMessages) => ({
            id: c.id,
            messagesCount: c.messages?.length || 0,
            firstMessage: c.messages?.find(m => m.sender_type === 'club')?.message_text?.substring(0, 50) + '...'
          }))
        });
        
          if (data.conversations && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          
          // Si une conversation est ouverte, marquer automatiquement ses messages comme lus
          data.conversations.forEach((conv: ConversationWithMessages) => {
            if (openConversations.has(conv.id)) {
              const allMessageIds = conv.messages?.map(m => m.id) || [];
              setReadMessages(prevRead => {
                const newReadSet = new Set(prevRead);
                allMessageIds.forEach(id => newReadSet.add(id));
                return newReadSet;
              });
            }
          });
        } else {
          setConversations([]);
        }
        setIsInitialLoad(false);
        
        if (data.error) {
          console.error('❌ Error in conversations data:', data.error);
          if (data.error.includes('non configuré')) {
            setError(data.error + (data.hint ? ' - ' + data.hint : ''));
          }
        }
      } else {
        console.error('❌ Error loading conversations:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        if (data.error && data.error.includes('non configuré')) {
          setError(data.error + (data.hint ? ' - ' + data.hint : ''));
        }
        setIsInitialLoad(false);
      }
    } catch (err) {
      console.error('❌ Error loading conversations:', err);
      setIsInitialLoad(false);
    } finally {
      if (showLoading || isInitialLoad) {
        setLoadingMessages(false);
      }
    }
  };

  // Charger au montage et toutes les 5 secondes pour les nouvelles réponses
  useEffect(() => {
    loadConversations(true);
    const interval = setInterval(() => loadConversations(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Ouvrir/fermer une conversation
  const toggleConversation = (conversationId: string) => {
    setOpenConversations(prev => {
      const newSet = new Set(prev);
      const wasOpen = newSet.has(conversationId);
      
      if (wasOpen) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
        // Quand on ouvre une conversation, marquer tous les messages de cette conversation comme lus
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
          const allMessageIds = conversation.messages?.map(m => m.id) || [];
          setReadMessages(prevRead => {
            const newReadSet = new Set(prevRead);
            allMessageIds.forEach(id => newReadSet.add(id));
            return newReadSet;
          });
        }
        
        // Scroller vers le formulaire de réponse après un court délai pour que le DOM soit mis à jour
        setTimeout(() => {
          const formElement = replyFormRefs.current[conversationId];
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // Focus sur le textarea du formulaire
            const textarea = formElement.querySelector('textarea') as HTMLTextAreaElement;
            if (textarea) {
              textarea.focus();
            }
          }
        }, 100);
      }
      return newSet;
    });
  };

  // Envoyer un nouveau message (crée une nouvelle conversation)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Erreur lors de l\'envoi du message';
        const errorDetails = data.details ? ` (${data.details})` : '';
        const errorHint = data.hint ? ` - ${data.hint}` : '';
        throw new Error(errorMessage + errorDetails + errorHint);
      }

      setSuccess(true);
      setMessage('');
      
      // Recharger les conversations
      await loadConversations(false);
      setTimeout(() => loadConversations(false), 500);
      setTimeout(() => loadConversations(false), 1500);
      setTimeout(() => loadConversations(false), 3000);
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  // Envoyer une réponse dans une conversation existante
  const handleReply = async (conversationId: string, e: FormEvent) => {
    e.preventDefault();
    const replyText = replyMessage[conversationId]?.trim();
    if (!replyText) return;

    setReplyingTo(prev => ({ ...prev, [conversationId]: true }));
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: replyText,
          conversationId: conversationId // Passer l'ID de conversation pour répondre dans la même conversation
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Erreur lors de l\'envoi de la réponse';
        throw new Error(errorMessage);
      }

      // Vider le champ de réponse
      setReplyMessage(prev => ({ ...prev, [conversationId]: '' }));
      
      // Recharger les conversations
      await loadConversations(false);
      setTimeout(() => loadConversations(false), 500);
      setTimeout(() => loadConversations(false), 1500);
      setTimeout(() => loadConversations(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de la réponse');
    } finally {
      setReplyingTo(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir le premier message du club pour une conversation
  const getFirstClubMessage = (conversation: ConversationWithMessages): SupportMessage | null => {
    return conversation.messages?.find(m => m.sender_type === 'club') || null;
  };

  // Compter les réponses non lues (messages de l'admin qui n'ont pas été vus par le club)
  const getUnreadRepliesCount = (conversation: ConversationWithMessages): number => {
    const messages = conversation.messages || [];
    if (messages.length === 0) return 0;

    // Compter uniquement les messages de l'admin qui n'ont pas été marqués comme lus
    let unreadCount = 0;
    for (const msg of messages) {
      if (msg.sender_type === 'admin' && !readMessages.has(msg.id)) {
        unreadCount++;
      }
    }

    return unreadCount;
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Aide & Support" />

      {/* Afficher un message d'erreur si les tables n'existent pas */}
      {(error && error.includes('non configuré')) && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/20 p-6">
          <h2 className="font-semibold mb-2 text-red-200">⚠️ Configuration requise</h2>
          <p className="text-red-200 text-sm mb-2">{error}</p>
          <p className="text-red-200/80 text-xs">
            Pour activer le système de chat support, veuillez exécuter le script SQL{' '}
            <code className="bg-red-500/30 px-2 py-1 rounded">create_support_chat_system.sql</code>{' '}
            dans Supabase SQL Editor.
          </p>
        </div>
      )}

      {/* Formulaire d'envoi de nouveau message - EN HAUT */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">Envoyer un nouveau message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-white/90 mb-2">
              Votre message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message ici..."
              rows={6}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          {error && !error.includes('non configuré') && (
            <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200 text-sm">
              ✓ Message envoyé avec succès ! Un nouveau bloc a été créé dans l'historique.
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer'}
          </button>
        </form>
      </div>

      {/* Historique des conversations - EN DESSOUS */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">Historique des conversations</h2>
        <div className="space-y-4">
          {loadingMessages && isInitialLoad ? (
            <div className="text-center text-white/50 py-8">
              Chargement des conversations...
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => {
              const firstMessage = getFirstClubMessage(conversation);
              const unreadCount = getUnreadRepliesCount(conversation);
              const isOpen = openConversations.has(conversation.id);
              
              // Trier tous les messages par ordre chronologique (sauf le premier message du club qui est déjà affiché dans l'en-tête)
              const allMessages = (conversation.messages || [])
                .filter(m => m.id !== firstMessage?.id) // Exclure le premier message du club
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

              if (!firstMessage) return null;

              return (
                <div
                  key={conversation.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  {/* En-tête du bloc avec le premier message */}
                  <div
                    className="cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => toggleConversation(conversation.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/60 mb-1">
                        Vous · {formatDate(firstMessage.created_at)}
                      </div>
                      <div className="text-white/90 whitespace-pre-wrap break-words line-clamp-2">
                        {firstMessage.message_text}
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold">
                          {unreadCount}
                        </span>
                        <svg
                          className={`w-5 h-5 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                    {unreadCount === 0 && (
                      <svg
                        className={`w-5 h-5 text-white/60 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>

                  {/* Contenu du bloc (réponses et formulaire de réponse) */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                      {/* Afficher tous les messages dans l'ordre chronologique */}
                      {allMessages.length > 0 && (
                        <div className="space-y-3">
                          {allMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_type === 'club' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  msg.sender_type === 'club'
                                    ? 'bg-[#0066FF] text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white/10 border border-white/20'
                                }`}
                              >
                                <div className={`text-xs mb-1 ${
                                  msg.sender_type === 'club' ? 'text-white/80' : 'text-white/60'
                                }`}>
                                  {msg.sender_type === 'club' ? 'Vous' : 'Support PadelXP'} · {formatDate(msg.created_at)}
                                </div>
                                <div className={`whitespace-pre-wrap break-words ${
                                  msg.sender_type === 'club' ? 'text-white font-medium' : 'text-white/90'
                                }`}>
                                  {msg.message_text}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulaire de réponse dans le bloc */}
                      <form
                        ref={(el) => {
                          if (el) {
                            replyFormRefs.current[conversation.id] = el;
                          }
                        }}
                        onSubmit={(e) => handleReply(conversation.id, e)}
                        className="space-y-3 pt-3 border-t border-white/10"
                      >
                        <textarea
                          value={replyMessage[conversation.id] || ''}
                          onChange={(e) => setReplyMessage(prev => ({ ...prev, [conversation.id]: e.target.value }))}
                          placeholder="Écrivez votre réponse ici..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="submit"
                          disabled={!replyMessage[conversation.id]?.trim() || replyingTo[conversation.id]}
                          className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-[0_2px_8px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98] text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {replyingTo[conversation.id] ? 'Envoi...' : 'Répondre'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-white/50 py-8">
              Aucune conversation active. Envoyez un message ci-dessus pour commencer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

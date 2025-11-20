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
}

export default function HelpPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger la conversation et les messages
  const loadConversation = async () => {
    try {
      setLoadingMessages(true);
      const response = await fetch('/api/support/conversation');
      const data = await response.json();

      if (response.ok) {
        console.log('✅ Conversation loaded:', {
          hasConversation: !!data.conversation,
          messagesCount: data.messages?.length || 0,
          conversationId: data.conversation?.id,
          messages: data.messages,
          fullData: data
        });
        setConversation(data.conversation);
        setMessages(data.messages || []);
        
        // Si pas de conversation mais erreur spécifique, afficher l'erreur
        if (!data.conversation && data.error) {
          console.error('❌ Error in conversation data:', data.error);
        }
      } else {
        console.error('❌ Error loading conversation:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        // Afficher l'erreur à l'utilisateur si c'est un problème de configuration
        if (data.error && data.error.includes('non configuré')) {
          setError(data.error + (data.hint ? ' - ' + data.hint : ''));
        }
      }
    } catch (err) {
      console.error('❌ Error loading conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Charger au montage et toutes les 5 secondes pour les nouvelles réponses
  useEffect(() => {
    loadConversation();
    const interval = setInterval(loadConversation, 5000); // Rafraîchir toutes les 5 secondes
    return () => clearInterval(interval);
  }, []);

  // Scroller vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        console.error('Contact form error:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });
        
        // Afficher un message d'erreur plus détaillé
        const errorMessage = data.error || 'Erreur lors de l\'envoi du message';
        const errorDetails = data.details ? ` (${data.details})` : '';
        const errorHint = data.hint ? ` - ${data.hint}` : '';
        throw new Error(errorMessage + errorDetails + errorHint);
      }

      setSuccess(true);
      const sentMessage = message.trim();
      setMessage('');
      
      // Recharger immédiatement la conversation pour afficher le message depuis la DB
      // Attendre un peu pour que la DB soit à jour, puis recharger plusieurs fois
      await loadConversation(); // Recharger immédiatement
      
      setTimeout(async () => {
        console.log('🔄 Reloading conversation after 500ms...');
        await loadConversation();
      }, 500);
      
      setTimeout(async () => {
        console.log('🔄 Reloading conversation after 1500ms...');
        await loadConversation();
      }, 1500);
      
      setTimeout(async () => {
        console.log('🔄 Reloading conversation after 3000ms...');
        await loadConversation();
      }, 3000);
      
      // Réinitialiser le message de succès après 5 secondes
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <PageTitle title="Aide & Support" />

      {/* Afficher un message d'erreur si les tables n'existent pas */}
      {error && error.includes('non configuré') && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/20 p-6">
          <h2 className="font-semibold mb-2 text-red-200">Configuration requise</h2>
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Conversation de chat - Afficher toujours le bloc */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">Conversation de support</h2>
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-4">
            {loadingMessages ? (
              <div className="text-center text-white/50 py-8">
                Chargement des messages...
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'club' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender_type === 'club'
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    <div className="text-xs text-white/60 mb-1">
                      {msg.sender_type === 'club' ? 'Vous' : 'Support PadelXP'} · {formatDate(msg.created_at)}
                    </div>
                    <div className="text-white/90 whitespace-pre-wrap break-words">
                      {msg.message_text}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-white/50 py-8">
                {conversation 
                  ? 'Aucun message pour le moment. Envoyez un message ci-dessous pour commencer la conversation.'
                  : 'Aucune conversation active. Envoyez un message ci-dessous pour commencer.'}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Ancien bloc conditionnel - gardé pour référence mais remplacé ci-dessus */}
      {false && (conversation || messages.length > 0) && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-semibold mb-4">Conversation de support</h2>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-4">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'club' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender_type === 'club'
                          ? 'bg-blue-600/20 border border-blue-500/30'
                          : 'bg-white/10 border border-white/20'
                      }`}
                    >
                      <div className="text-xs text-white/60 mb-1">
                        {msg.sender_type === 'club' ? 'Vous' : 'Support PadelXP'} · {formatDate(msg.created_at)}
                      </div>
                      <div className="text-white/90 whitespace-pre-wrap break-words">
                        {msg.message_text}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-white/50 py-8">
                  Chargement des messages...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'envoi de message */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-semibold mb-4">
          {conversation ? 'Envoyer un nouveau message' : 'Contact'}
        </h2>
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
              rows={8}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200 text-sm">
              ✓ Message envoyé avec succès ! Votre réponse apparaîtra dans la conversation ci-dessus.
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer'}
          </button>
          <p className="text-xs text-white/50 text-center">
            Votre message sera envoyé et apparaîtra dans la conversation ci-dessus. Les réponses apparaîtront automatiquement.
          </p>
        </form>
      </div>
    </div>
  );
}



'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionIdInput() {
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId.trim()) {
      alert('Veuillez entrer un session_id');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Abonnement vérifié et mis à jour avec succès !');
        setSessionId('');
        setShowInput(false);
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        alert('Erreur lors de la vérification : ' + (data.error || 'Erreur inconnue'));
        setLoading(false);
      }
    } catch (error) {
      console.error('Verify session error:', error);
      alert('Erreur lors de la vérification de l\'abonnement');
      setLoading(false);
    }
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="text-xs text-blue-400 hover:text-blue-300 underline mt-2"
      >
        J'ai effectué un paiement avec un email différent
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 rounded-lg border border-blue-400/40 bg-blue-500/10">
      <p className="text-xs text-blue-200 mb-2">
        Si vous avez effectué un paiement avec un email différent, vous pouvez entrer le <code>session_id</code> 
        de votre paiement. Vous le trouverez dans l'URL de retour de Stripe après le paiement (paramètre <code>session_id</code>).
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="cs_test_..."
          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !sessionId.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Vérification...' : 'Vérifier'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowInput(false);
            setSessionId('');
          }}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}





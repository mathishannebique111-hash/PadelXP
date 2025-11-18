"use client";

import { useState } from "react";

interface BoostPurchaseButtonProps {
  quantity: number;
  priceId: string;
  price?: number; // Prix en euros pour l'affichage (optionnel)
}

export default function BoostPurchaseButton({ quantity, priceId, price }: BoostPurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier que le priceId est défini avant d'autoriser l'achat
  if (!priceId || priceId.trim() === '') {
    return (
      <div className="flex-1 min-w-[180px]">
        <button
          disabled
          className="w-full rounded-2xl border border-white/20 ring-1 ring-white/5 bg-white/5 px-5 py-4 font-semibold text-white/40 cursor-not-allowed opacity-50 backdrop-blur-sm"
        >
          <div className="text-xl mb-1 font-bold">{quantity} boost{quantity > 1 ? 's' : ''}</div>
          <div className="text-xs opacity-70 font-normal">Non disponible</div>
        </button>
        <p className="mt-2 text-xs text-yellow-400/70">Price ID non configuré</p>
      </div>
    );
  }

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);

    // Vérification supplémentaire avant l'envoi
    if (!priceId || priceId.trim() === '') {
      setError("Price ID non configuré");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout-boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          priceId, // Envoyer le priceId directement
          quantity // Quantité = 1 pour les produits fixes Stripe
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(errorData.error || "Erreur lors de la création de la session de paiement");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (err) {
      console.error("Error purchasing boosts:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  };

  // Afficher le prix si fourni, sinon ne rien afficher
  const priceDisplay = price ? `${price.toFixed(2)}€` : null;

  return (
    <div className="flex-1 min-w-[180px]">
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full rounded-2xl border border-white/40 ring-1 ring-white/10 bg-gradient-to-br from-yellow-500/20 via-yellow-500/15 to-orange-500/20 px-5 py-4 font-semibold text-white transition-all hover:from-yellow-500/30 hover:via-yellow-500/25 hover:to-orange-500/30 hover:border-yellow-400/50 hover:ring-yellow-400/20 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
      >
        {loading ? (
          <span className="text-sm">Chargement...</span>
        ) : (
          <>
            <div className="text-xl mb-1 font-bold">{quantity} boost{quantity > 1 ? 's' : ''}</div>
            {priceDisplay && (
              <div className="text-xs opacity-80 font-normal">{priceDisplay}</div>
            )}
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}


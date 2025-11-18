"use client";

import { useState, useMemo } from "react";

interface BoostPurchaseButtonProps {
  quantity: number;
  priceId: string;
  price?: number | string;
  isFeatured?: boolean; // Pack 10 boosts mis en avant
  offerText?: string; // "1 offert !"
  oldPrice?: number; // Prix barré (pack 10)
}

export default function BoostPurchaseButton({ 
  quantity, 
  priceId, 
  price, 
  isFeatured = false,
  offerText,
  oldPrice
}: BoostPurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normaliser le prix
  const normalizedPrice = useMemo(() => {
    if (price === undefined || price === null) {
      console.warn('[BoostPurchaseButton] Price is undefined or null for quantity:', quantity);
      return null;
    }
    if (typeof price === 'number') {
      if (isNaN(price) || price <= 0) {
        console.warn('[BoostPurchaseButton] Invalid number price:', price, 'for quantity:', quantity);
        return null;
      }
      return price;
    }
    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      if (isNaN(parsed) || parsed <= 0) {
        console.warn('[BoostPurchaseButton] Invalid string price:', price, 'for quantity:', quantity);
        return null;
      }
      return parsed;
    }
    return null;
  }, [price, quantity]);

  // Icônes selon le pack
  const getIcon = () => {
    if (quantity === 1) return "⚡";
    if (quantity === 5) return "🔥";
    if (quantity === 10) return "🚀";
    return "⚡";
  };

  // Couleurs de fond selon le pack
  const getBackgroundGradient = () => {
    if (isFeatured) {
      // Pack 10 - rouge saturé avec glow
      return "bg-gradient-to-br from-[#FF4444] via-[#FF5555] to-[#FF3333]";
    }
    // Pack 1 et 5 - gradient orange
    return "bg-gradient-to-br from-orange-500 to-orange-600";
  };

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);

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
          priceId,
          quantity
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

  const priceDisplay = normalizedPrice && normalizedPrice > 0 
    ? `${normalizedPrice.toFixed(2)}€` 
    : null;

  const oldPriceDisplay = oldPrice && oldPrice > 0 
    ? `${oldPrice.toFixed(2)}€` 
    : null;

  // Classes pour la carte selon si elle est mise en avant
  const cardBaseClasses = "relative rounded-xl p-6 sm:p-8 transition-all duration-300 cursor-pointer";
  
  const cardClasses = isFeatured
    ? `${cardBaseClasses} z-10 scale-105 shadow-2xl border-2 border-white/30 shadow-[0_0_40px_rgba(255,68,68,0.3)] active:scale-95 active:shadow-lg active:opacity-90 active:duration-150`
    : `${cardBaseClasses} shadow-xl border border-white/20 active:scale-95 active:shadow-lg active:opacity-90 active:duration-150`;

  // Vérifier que le priceId est défini
  if (!priceId || priceId.trim() === '') {
    return (
      <div className="flex-1 w-full flex items-center justify-center">
        <div className={`w-full ${getBackgroundGradient()} ${cardClasses} opacity-50`}>
          <div className="w-full flex flex-col items-center justify-center">
            <div className="text-4xl sm:text-5xl mb-3">{getIcon()}</div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {quantity} boost{quantity > 1 ? 's' : ''}
            </h3>
            <div className="text-sm text-white/70">Non disponible</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex items-center justify-center">
      <div className={`w-full ${getBackgroundGradient()} ${cardClasses}`}>
        {/* Badge "Meilleur prix" uniquement pour le pack 10 */}
        {isFeatured && (
          <div className="absolute top-0 right-0 sm:top-[-12px] sm:right-4 bg-gradient-to-r from-[#BFFF00] to-[#9FDF00] px-4 py-1.5 rounded-full text-sm font-bold text-gray-900 shadow-[0_2px_8px_rgba(255,255,255,0.3)]">
            🔥 Meilleur prix
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={loading || !priceId || priceId.trim() === ''}
          className="w-full flex flex-col items-center justify-center"
        >
          {/* Icône */}
          <div className="text-4xl sm:text-5xl mb-3">
            {getIcon()}
          </div>

          {/* Titre */}
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {quantity} boost{quantity > 1 ? 's' : ''}
          </h3>

          {/* Badge "1 offert !" uniquement pour le pack 10 */}
          {offerText && (
            <div className="mx-auto mb-3 px-3 py-1 rounded-full bg-gradient-to-r from-[#BFFF00] to-[#9FDF00] text-sm font-bold text-gray-900 animate-pulse" style={{ animationDuration: '3s' }}>
              {offerText}
            </div>
          )}

          {/* Prix barré (uniquement pack 10) */}
          {oldPriceDisplay && (
            <div className="text-xl text-white/70 line-through mb-1">
              {oldPriceDisplay}
            </div>
          )}

          {/* Prix final */}
          {priceDisplay && (
            <div className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
              {priceDisplay}
            </div>
          )}

          {/* Économie affichée (uniquement pack 10) */}
          {isFeatured && (
            <div className="text-sm text-white/90 mb-4">
              💰 Économisez 0,79 € !
            </div>
          )}

          {/* Bouton CTA */}
          <div className="w-full mt-2">
            <div className={`w-full py-3 px-6 rounded-lg ${loading ? 'bg-white/70' : 'bg-white/95'} text-gray-900 font-semibold text-sm sm:text-base shadow-lg transition-all duration-150 active:bg-white/80 active:shadow-sm active:scale-95 text-center`}>
              {loading ? "Chargement..." : "Acheter"}
            </div>
          </div>
        </button>

        {error && (
          <p className="mt-2 text-xs text-white/90 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}

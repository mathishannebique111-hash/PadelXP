"use client";

import { useState, useMemo } from "react";

interface BoostPurchaseButtonProps {
  quantity: number;
  priceId: string;
  price?: number | string; // Prix en euros pour l'affichage (optionnel, peut être number ou string)
  buttonColor?: "orange" | "red" | "orange-red"; // Couleur du bouton
  offerText?: string; // Texte pour indiquer l'offre (ex: "1 offert")
}

export default function BoostPurchaseButton({ quantity, priceId, price, buttonColor = "orange", offerText }: BoostPurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normaliser le prix pour gérer les cas string et number
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
    console.warn('[BoostPurchaseButton] Price has unexpected type:', typeof price, 'value:', price, 'for quantity:', quantity);
    return null;
  }, [price, quantity]);

  // Définir les couleurs en fonction du type de bouton
  const getButtonColors = () => {
    switch (buttonColor) {
      case "orange":
        return {
          bg: "bg-orange-500",
          hover: "hover:bg-orange-600",
          border: "border-orange-500",
          hoverBorder: "hover:border-orange-600",
          text: "text-white",
          shadow: "shadow-[0_8px_20px_rgba(249,115,22,0.4)]",
          hoverShadow: "hover:shadow-[0_12px_30px_rgba(249,115,22,0.5)]"
        };
      case "red":
        return {
          bg: "bg-red-600",
          hover: "hover:bg-red-700",
          border: "border-red-600",
          hoverBorder: "hover:border-red-700",
          text: "text-white",
          shadow: "shadow-[0_8px_20px_rgba(220,38,38,0.4)]",
          hoverShadow: "hover:shadow-[0_12px_30px_rgba(220,38,38,0.5)]"
        };
      case "orange-red":
        return {
          bg: "bg-orange-600",
          hover: "hover:bg-orange-700",
          border: "border-orange-600",
          hoverBorder: "hover:border-orange-700",
          text: "text-white",
          shadow: "shadow-[0_8px_20px_rgba(234,88,12,0.4)]",
          hoverShadow: "hover:shadow-[0_12px_30px_rgba(234,88,12,0.5)]"
        };
      default:
        return {
          bg: "bg-orange-500",
          hover: "hover:bg-orange-600",
          border: "border-orange-500",
          hoverBorder: "hover:border-orange-600",
          text: "text-white",
          shadow: "shadow-[0_8px_20px_rgba(249,115,22,0.4)]",
          hoverShadow: "hover:shadow-[0_12px_30px_rgba(249,115,22,0.5)]"
        };
    }
  };

  const colors = getButtonColors();

  // Vérifier que le priceId est défini avant d'autoriser l'achat
  if (!priceId || priceId.trim() === '') {
    return (
      <div className="flex-1 w-full">
        <div className="rounded-2xl border border-white/20 bg-white/5 p-1 backdrop-blur-sm h-full">
          <button
            disabled
            className={`w-full rounded-xl border-2 ${colors.border} ${colors.bg} px-6 py-5 font-bold ${colors.text} cursor-not-allowed opacity-50 backdrop-blur-sm relative overflow-hidden h-full flex flex-col items-center justify-center`}
          >
            <div className="relative z-10 w-full flex flex-col items-center justify-center">
              <div className="text-2xl mb-2 font-extrabold tracking-tight text-center">{quantity} boost{quantity > 1 ? 's' : ''}</div>
              {offerText && (
                <div className="text-xs mb-2 font-bold px-2 py-1 rounded-full bg-white/20 inline-block">{offerText}</div>
              )}
              <div className="text-sm opacity-90 font-normal text-center">Non disponible</div>
            </div>
          </button>
        </div>
        <p className="mt-2 text-xs text-white/60 font-normal text-center">Price ID non configuré</p>
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
  // Utiliser le prix normalisé
  const priceDisplay = normalizedPrice && normalizedPrice > 0 
    ? `${normalizedPrice.toFixed(2)}€` 
    : null;

  return (
    <div className="flex-1 w-full">
      <div className="rounded-2xl border border-white/20 bg-white/5 p-1 backdrop-blur-sm h-full">
        <button
          onClick={handlePurchase}
          disabled={loading}
          className={`w-full rounded-xl border-2 ${colors.border} ${colors.bg} px-6 py-5 font-bold ${colors.text} transition-all duration-300 transform ${colors.hover} ${colors.hoverBorder} ${colors.shadow || ''} ${colors.hoverShadow || ''} hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 backdrop-blur-sm relative overflow-hidden group h-full flex flex-col items-center justify-center`}
        >
          {/* Effet de brillance au hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          <div className="relative z-10 w-full flex flex-col items-center justify-center">
            {loading ? (
              <span className="text-base font-semibold">Chargement...</span>
            ) : (
              <>
                <div className="text-2xl mb-2 font-extrabold tracking-tight text-center">{quantity} boost{quantity > 1 ? 's' : ''}</div>
                {offerText && (
                  <div className="text-xs mb-2 font-bold px-2 py-1 rounded-full bg-white/20 inline-block">{offerText}</div>
                )}
                {priceDisplay && (
                  <div className="text-lg font-bold opacity-95 text-center">{priceDisplay}</div>
                )}
              </>
            )}
          </div>
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-white/70 font-normal">{error}</p>
      )}
    </div>
  );
}


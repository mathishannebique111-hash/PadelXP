"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

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
    if (quantity === 1) return "/images/Éclair boost.png";
    if (quantity === 5) return "/images/Flamme page badges.png";
    if (quantity === 10) return "/images/fusée page boost.png";
    return "/images/Éclair boost.png";
  };
  
  const getIconType = () => {
    return "image";
  };

  // Couleurs de fond selon le pack
  const getBackgroundGradient = () => {
    if (isFeatured) {
      // Pack 10 - rouge très prononcé
      return "bg-gradient-to-br from-[#FF3333] via-[#FF4444] to-[#FF2222]";
    }
    // Pack 1 et 5 - bleu foncé élégant
    return "bg-gradient-to-br from-[#0F1B3D] via-[#1A2B4D] to-[#0F1B3D]";
  };

  // Couleur de l'icône selon le pack
  const getIconColor = () => {
    if (isFeatured) {
      return "text-white";
    }
    // Orange doux pour les icônes des cartes 1 et 5
    return "text-orange-400";
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

      // Gérer les erreurs HTTP de manière robuste
      if (!res.ok) {
        let errorMessage = "Erreur lors de la création de la session de paiement";
        try {
          const errorData = await res.json();
          if (errorData && typeof errorData === 'object' && 'error' in errorData) {
            errorMessage = errorData.error || errorMessage;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch (parseError) {
          // Si le JSON ne peut pas être parsé, utiliser le message par défaut
          console.error("Error parsing error response:", parseError);
          errorMessage = `Erreur serveur (${res.status}): ${res.statusText || 'Erreur inconnue'}`;
        }
        
        // Gérer spécifiquement les erreurs d'authentification
        if (res.status === 401) {
          errorMessage = errorMessage || "Session expirée. Veuillez vous reconnecter.";
          // Optionnel : rediriger vers la page de connexion
          setTimeout(() => {
            window.location.href = '/login?redirect=/boost';
          }, 2000);
        }
        
        throw new Error(errorMessage);
      }

      // Parser la réponse avec gestion d'erreur robuste
      let responseData;
      try {
        responseData = await res.json();
      } catch (parseError) {
        console.error("Error parsing success response:", parseError);
        throw new Error("Erreur lors de la lecture de la réponse du serveur");
      }

      // Vérifier que l'URL existe et est valide
      if (!responseData || typeof responseData !== 'object' || !responseData.url) {
        console.error("Invalid response data:", responseData);
        throw new Error("URL de paiement non reçue du serveur");
      }

      const { url } = responseData;
      if (typeof url !== 'string' || !url.trim()) {
        throw new Error("URL de paiement invalide");
      }

      // Rediriger vers l'URL de paiement Stripe
      window.location.href = url;
    } catch (err) {
      console.error("Error purchasing boosts:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'string'
        ? err
        : "Erreur inconnue lors de la création de la session de paiement";
      setError(errorMessage);
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
  const cardBaseClasses = "relative rounded-xl transition-all duration-300 cursor-pointer";
  
  // Padding réduit pour cartes plus compactes
  const cardPadding = isFeatured 
    ? "p-4 sm:p-5" // Carte 10 légèrement plus grande
    : "p-4 sm:p-5"; // Cartes 1 et 5
  
  const cardClasses = isFeatured
    ? `${cardBaseClasses} ${cardPadding} z-10 scale-[1.02] sm:scale-[1.05] shadow-xl border-2 border-white/40 shadow-[0_0_30px_rgba(255,51,51,0.25)] hover:shadow-[0_0_40px_rgba(255,51,51,0.35)] active:scale-[0.99] active:opacity-90 active:duration-150`
    : `${cardBaseClasses} ${cardPadding} shadow-lg border border-white/20 hover:shadow-xl active:scale-[0.99] active:opacity-90 active:duration-150`;

  // Vérifier que le priceId est défini
  if (!priceId || priceId.trim() === '') {
    return (
      <div className="flex-1 w-full flex items-center justify-center">
        <div className={`w-full ${getBackgroundGradient()} ${cardClasses} opacity-50`}>
          <div className="w-full flex flex-col items-center justify-center">
            {/* Zone icône + titre avec hauteur minimale fixe (réduite) */}
            <div className="min-h-[100px] sm:min-h-[110px] flex flex-col items-center justify-start">
              <div className={`text-3xl sm:text-4xl mb-2 flex-shrink-0 ${getIconColor()}`}>{getIcon()}</div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex-shrink-0">
                {quantity} boost{quantity > 1 ? 's' : ''}
              </h3>
            </div>
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
          <div className="absolute top-0 right-0 sm:top-[-10px] sm:right-3 bg-gradient-to-r from-[#BFFF00] to-[#9FDF00] px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-gray-900 shadow-[0_2px_8px_rgba(255,255,255,0.3)] z-20 flex items-center gap-1">
            <Image src="/images/Flamme page badges.png" alt="Flamme" width={14} height={14} className="flex-shrink-0" unoptimized />
            <span>Meilleur prix</span>
          </div>
        )}

        {/* Halo pour le pack 10 (glow subtil) */}
        {isFeatured && (
          <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_50%_50%,rgba(255,51,51,0.15),transparent_70%)] pointer-events-none" />
        )}

        <button
          onClick={handlePurchase}
          disabled={loading || !priceId || priceId.trim() === ''}
          className="w-full flex flex-col items-center justify-center relative z-10"
        >
          {/* Zone icône + titre + badges avec hauteur minimale fixe (réduite) */}
          <div className="min-h-[100px] sm:min-h-[110px] flex flex-col items-center justify-start">
            {/* Icône */}
            <div className={`mb-2 flex-shrink-0 ${getIconType() === 'image' ? '' : `${getIconColor()} text-3xl sm:text-4xl`} ${isFeatured && quantity === 10 ? 'mt-2' : ''}`}>
              {getIconType() === 'image' ? (
                <Image src={getIcon() as string} alt="Boost" width={32} height={32} className="w-8 h-8 sm:w-10 sm:h-10" unoptimized />
              ) : (
                getIcon()
              )}
            </div>

            {/* Titre */}
            <h3 className={`${isFeatured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'} font-bold text-white mb-2 flex-shrink-0`}>
              {quantity} boost{quantity > 1 ? 's' : ''}
            </h3>

            {/* Badge "1 offert !" uniquement pour le pack 10 */}
                {offerText && (
              <div className="mx-auto mb-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#BFFF00] to-[#9FDF00] text-xs sm:text-sm font-bold text-gray-900 animate-pulse flex-shrink-0" style={{ animationDuration: '2s' }}>
                🎁 {offerText}
              </div>
            )}
          </div>

          {/* Prix barré (uniquement pack 10) */}
          {oldPriceDisplay && (
            <div className="text-xl sm:text-2xl text-white/80 line-through mb-0.5 font-medium decoration-2">
              {oldPriceDisplay}
            </div>
          )}

          {/* Prix final */}
          {priceDisplay && (
            <div className={`${isFeatured ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} font-extrabold text-white mb-2`}>
              {priceDisplay}
            </div>
          )}

          {/* Message d'offre (uniquement pack 10) */}
          {isFeatured && (
            <div className="text-sm sm:text-base text-white font-semibold mb-3 text-center">
              10 boosts pour le prix de 9 !
            </div>
          )}

          {/* Bouton CTA avec dégradé bleu */}
          <div className={`w-full mt-2 ${isFeatured ? 'mt-3' : ''}`}>
            <div className={`w-full ${isFeatured ? 'py-3.5 px-6' : 'py-3 px-6'} rounded-lg bg-gradient-to-r from-[#0066FF] to-[#003D99] text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-150 active:shadow-md active:scale-[0.98] text-center`}>
              {loading ? "Chargement..." : "J'en profite"}
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

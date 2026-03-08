"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";

interface StripePortalButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function StripePortalButton({ className, children }: StripePortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenPortal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Une erreur est survenue lors de l'accès au portail de facturation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleOpenPortal}
      disabled={isLoading}
      className={className || "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/15 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {children || "Gérer mon abonnement sur Stripe"}
          <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
        </>
      )}
    </button>
  );
}

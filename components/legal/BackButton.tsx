"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function BackButtonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo");

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Si on a un paramètre returnTo, on l'utilise
    if (returnTo) {
      e.preventDefault();
      router.push(returnTo);
      return;
    }
    
    // Sinon, on essaie d'utiliser l'historique du navigateur
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
      return;
    }
    
    // Sinon, on va à l'accueil par défaut
    // Le href="/" sera utilisé
  };

  return (
    <Link 
      href={returnTo || "/"}
      onClick={handleBack}
      className="text-white/60 hover:text-white transition-colors text-sm"
    >
      ← Retour à l'accueil
    </Link>
  );
}

export default function BackButton() {
  return (
    <Suspense fallback={
      <Link 
        href="/"
        className="text-white/60 hover:text-white transition-colors text-sm"
      >
        ← Retour à l'accueil
      </Link>
    }>
      <BackButtonContent />
    </Suspense>
  );
}


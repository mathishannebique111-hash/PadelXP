"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginSuccessMessage() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Masquer le message après 5 secondes
    const timer = setTimeout(() => {
      setVisible(false);
      // Nettoyer l'URL après avoir masqué le message
      router.replace("/login", { scroll: false });
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-md border border-green-400 bg-green-900/20 px-3 py-2 text-xs text-green-400 animate-fadeIn">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.</span>
      </div>
    </div>
  );
}

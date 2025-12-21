"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logger } from '@/lib/logger';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      // Appeler l'API route pour nettoyer le cookie last_activity
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      
      if (response.ok) {
        // Rediriger vers la page appropriée selon le contexte
        const currentPath = window.location.pathname;
        if (currentPath.startsWith("/dashboard")) {
          router.push("/clubs/login");
        } else {
          router.push("/");
        }
        router.refresh();
      } else {
        // En cas d'erreur de l'API, essayer quand même la déconnexion côté client
        const { supabaseClient } = await import("@/lib/supabase");
        const supabase = supabaseClient();
        await supabase.auth.signOut();
        window.location.assign("/");
      }
    } catch (error) {
      logger.error("Error logging out:", error);
      // En cas d'erreur, essayer quand même la déconnexion côté client
      try {
        const { supabaseClient } = await import("@/lib/supabase");
        const supabase = supabaseClient();
        await supabase.auth.signOut();
      } catch (e) {
        logger.error("Error during fallback signout:", e);
      }
      window.location.assign("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handle} 
      disabled={loading}
      className="block w-full text-center px-3 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/15 text-sm disabled:opacity-50"
    >
      {loading ? "Déconnexion..." : "Se déconnecter"}
    </button>
  );
}





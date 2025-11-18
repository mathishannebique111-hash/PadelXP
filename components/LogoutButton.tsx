"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";

export default function LogoutButton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const supabase = supabaseClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error logging out:", error);
        // Même en cas d'erreur, rediriger vers la page d'accueil
      }
      
      // Rediriger vers la page d'accueil du site
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const buttonClass = variant === "light"
    ? "inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-50"
    : "inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/20 disabled:opacity-50 backdrop-blur-sm";

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={buttonClass}
      style={{ letterSpacing: "0.01em" }}
    >
      {loading ? (
        <span>Déconnexion...</span>
      ) : (
        <span>Se déconnecter</span>
      )}
    </button>
  );
}


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const supabase = supabaseClient();
        await supabase.auth.signOut();
      } catch {}
      // Redirection dure vers la landing pour éviter tout effet de middleware
      window.location.assign("/");
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-white/70">Déconnexion en cours…</div>
    </div>
  );
}



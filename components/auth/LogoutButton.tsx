"use client";

import { supabaseClient } from "@/lib/supabase";

export default function LogoutButton() {
  const handle = async () => {
    try {
      const supabase = supabaseClient();
      await supabase.auth.signOut();
    } catch {}
    window.location.assign("/");
  };

  return (
    <button onClick={handle} className="block w-full text-center px-3 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/15 text-sm">
      Se déconnecter
    </button>
  );
}





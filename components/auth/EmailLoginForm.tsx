"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PrecheckResult = boolean | { ok: boolean; message?: string; redirect?: string };

export default function EmailLoginForm({
  extra,
  beforeSubmit,
}: {
  extra?: React.ReactNode;
  beforeSubmit?: (data: { email: string; password: string }) => Promise<PrecheckResult> | PrecheckResult;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = (params?.get("redirect") as string) || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let customRedirect: string | undefined = undefined;
      if (beforeSubmit) {
        const res = await beforeSubmit({ email, password });
        if (res === false || (typeof res === "object" && res && (res as any).ok === false)) {
          setLoading(false);
          const msg = typeof res === "object" && res && (res as any).message ? (res as any).message : "Vérifiez vos informations";
          setError(msg as string);
          return;
        }
        if (typeof res === "object" && res && (res as any).ok === true && (res as any).redirect) {
          customRedirect = (res as any).redirect as string;
        }
      }
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("club_slug")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.auth.signOut();
          setError("Aucun compte joueur trouvé pour cet email. Créez d’abord votre compte via l’inscription joueurs.");
          setLoading(false);
          return;
        }

        let finalRedirect = customRedirect || redirectTo;
        if (profile.club_slug) {
          finalRedirect = `/club/${profile.club_slug}/profil`;
        }

        router.replace(finalRedirect);
      }
    } catch (e: any) {
      setError(e?.message || "Impossible de se connecter");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {error && <div className="rounded-md border border-red-400 bg-red-500/20 px-3 py-2 text-sm text-red-300">{error}</div>}

      <input
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        required
        placeholder="Mot de passe"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {extra}
      <button
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}



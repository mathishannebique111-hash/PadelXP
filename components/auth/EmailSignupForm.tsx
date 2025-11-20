"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { capitalizeFullName } from "@/lib/utils/name-utils";

type PrecheckResult =
  | boolean
  | {
      ok?: boolean;
      message?: string;
      redirect?: string;
      club?: { slug: string; code: string };
    };

export default function EmailSignupForm({
  extra,
  beforeSubmit,
  afterAuth,
}: {
  extra?: React.ReactNode;
  beforeSubmit?: (data: { email: string; password: string }) => Promise<PrecheckResult> | PrecheckResult;
  afterAuth?: (context?: { club?: { slug: string; code: string } }) => Promise<void> | void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = (params?.get("redirect") as string) || "/home";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Validation des champs prénom et nom
      if (!firstName.trim() || !lastName.trim()) {
        setError("Le prénom et le nom sont requis");
        setLoading(false);
        return;
      }

      let precheckContext: { club?: { slug: string; code: string } } | undefined;
      let customRedirect: string | undefined;
      if (beforeSubmit) {
        const res = await beforeSubmit({ email, password });
        if (res === false || (typeof res === "object" && res && (res as any).ok === false)) {
          setLoading(false);
          const msg = typeof res === "object" && res && (res as any).message ? (res as any).message : "Vérifiez vos informations";
          setError(msg as string);
          return;
        }
        if (typeof res === "object" && res) {
          if ((res as any).redirect) customRedirect = (res as any).redirect as string;
          if ((res as any).club) {
            precheckContext = { club: (res as any).club };
          }
        }
      }

      if (!precheckContext?.club?.slug || !precheckContext?.club?.code) {
        setLoading(false);
        setError("Sélectionnez un club / complexe valide et saisissez le code d'invitation");
        return;
      }

      // Capitaliser automatiquement le prénom et le nom
      const { firstName: capitalizedFirstName, lastName: capitalizedLastName } = capitalizeFullName(
        firstName.trim(),
        lastName.trim()
      );

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: capitalizedFirstName,
            last_name: capitalizedLastName,
          },
        },
      });
      if (error) throw error;

      const displayName = `${capitalizedFirstName} ${capitalizedLastName}`.trim();
      let accessToken = data.session?.access_token || null;

      if (!data.session) {
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            throw signInError;
          }
          if (!signInData.session) {
            throw new Error("Connexion nécessaire pour finaliser l’inscription");
          }
          accessToken = signInData.session?.access_token || null;
        } catch (signInProblem) {
          console.error("[EmailSignup] Impossible de créer la session après inscription", signInProblem);
          setError("Impossible de créer la session. Réessayez.");
          setLoading(false);
          return;
        }
      }

      if (!accessToken) {
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData.session?.access_token || null;
      }

      try {
        const response = await fetch('/api/player/attach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            slug: precheckContext?.club?.slug,
            code: precheckContext?.club?.code,
            firstName: capitalizedFirstName,
            lastName: capitalizedLastName,
            displayName,
            email,
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[EmailSignup] Failed to attach club:', response.status, errorData);
          const message = errorData?.error || "Impossible d'attacher le club";
          throw new Error(message);
        }
      } catch (attachError) {
        console.error('[EmailSignup] Error attaching club:', attachError);
        if (attachError instanceof Error) {
          setError(attachError.message);
        }
        setLoading(false);
        return;
      }

      if (afterAuth) {
        try { await afterAuth(precheckContext); } catch {}
      }
      router.replace(customRedirect || redirectTo);
    } catch (e: any) {
      setError(e?.message || "Impossible de créer le compte");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {error && <div className="rounded-md border border-red-400 bg-red-900/20 px-3 py-2 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          placeholder="Prénom"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          type="text"
          required
          placeholder="Nom"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <input
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        required
        placeholder="Mot de passe"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {extra}
      <button
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
      >
        {loading ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}



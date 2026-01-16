"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from '@/lib/logger';
import Image from "next/image";

type StepStatus = "loading" | "ready" | "error" | "success";

export default function ClientAdminInvite() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<StepStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const hasRetriedRef = useRef(false);

  // Étape 1 : établir la session à partir du lien d'invitation
  useEffect(() => {
    let cancelled = false;

    async function handleInvite() {
      setStatus("loading");
      setError(null);

      const hashString = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      const searchString = typeof window !== "undefined" ? window.location.search : "";
      const hashParams = new URLSearchParams(hashString);
      const queryParams = new URLSearchParams(searchString);

      const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
      const typeFromHash = (hashParams.get("type") || queryParams.get("type") || "magiclink").toLowerCase();
      const code = searchParams?.get("code") || hashParams.get("code") || queryParams.get("code");
      const inviteToken =
        searchParams?.get("token") ||
        searchParams?.get("token_hash") ||
        searchParams?.get("invite_token") ||
        queryParams.get("token") ||
        queryParams.get("token_hash") ||
        queryParams.get("invite_token") ||
        hashParams.get("token") ||
        hashParams.get("token_hash") ||
        hashParams.get("invite_token");
      const emailParam =
        searchParams?.get("email") ||
        queryParams.get("email") ||
        hashParams.get("email") ||
        hashParams.get("email_address");

      const inviteTokenKey =
        typeof window !== "undefined" && inviteToken ? `club_invite_email_${inviteToken}` : null;
      let storedEmail: string | null = null;
      if (inviteTokenKey && typeof window !== "undefined") {
        storedEmail = window.localStorage.getItem(inviteTokenKey);
      }

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            throw new Error(error?.message || "Code invalide ou expiré.");
          }
          if (!cancelled) {
            setEmail(data.session.user.email ?? null);
            setStatus("ready");
            if (inviteTokenKey && data.session.user.email && typeof window !== "undefined") {
              window.localStorage.setItem(inviteTokenKey, data.session.user.email.toLowerCase());
            }
          }
          return;
        }

        const normalizedEmailParam =
          emailParam?.toLowerCase() ?? storedEmail?.toLowerCase() ?? null;

        const mapTypeToOtp = (rawType: string | null): "magiclink" | "invite" | "recovery" => {
          if (!rawType) return "magiclink";
          const normalized = rawType.toLowerCase();
          if (normalized === "recovery") return "recovery";
          if (normalized === "invite") return "invite";
          return "magiclink";
        };

        const otpTypeInitial = mapTypeToOtp(typeFromHash);

        if (inviteToken && !accessToken) {
          const completeSession = (session: any, emailUsed: string | null) => {
            if (cancelled) return;
            setEmail(session.user.email ?? emailUsed ?? null);
            setStatus("ready");
            if (inviteTokenKey && session.user.email && typeof window !== "undefined") {
              window.localStorage.setItem(inviteTokenKey, session.user.email.toLowerCase());
            }
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          };

          const attemptVerify = async (
            tokenValue: string | null,
            typeValue: "magiclink" | "invite" | "recovery",
            emailValue: string | null
          ) => {
            if (!tokenValue || !emailValue) {
              return { ok: false, error: null as Error | null };
            }
            try {
              const { data, error } = await supabase.auth.verifyOtp({
                type: typeValue,
                token: tokenValue,
                email: emailValue,
              });
              if (error) {
                return { ok: false, error };
              }
              if (data?.session) {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(
                    `club_invite_email_${tokenValue}`,
                    emailValue
                  );
                }
                completeSession(data.session, emailValue);
                return { ok: true, error: null };
              }
              return { ok: false, error: null };
            } catch (err: any) {
              return { ok: false, error: err };
            }
          };

          let verifyResult = await attemptVerify(inviteToken, otpTypeInitial, normalizedEmailParam);

          if (!verifyResult.ok) {
            let lastError = verifyResult.error;

            if (!hasRetriedRef.current) {
              hasRetriedRef.current = true;
              try {
                const reissueResponse = await fetch("/api/clubs/admin-invite/reissue", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: normalizedEmailParam ?? undefined,
                    token: inviteToken,
                  }),
                  credentials: "include",
                });

                if (reissueResponse.ok) {
                  const linkResponse = await reissueResponse.json();
                  logger.info("[clubs/signup] Reissue response", linkResponse);
                  const { token: reissuedToken, actionLink, email: reissuedEmail, linkType } =
                    linkResponse;
                  const resolvedEmail =
                    reissuedEmail?.toLowerCase() ?? normalizedEmailParam ?? storedEmail ?? null;

                  if (actionLink) {
                    if (typeof window !== "undefined") {
                      try {
                        const urlObj = new URL(actionLink);
                        const searchTokens = [
                          urlObj.searchParams.get("token"),
                          urlObj.searchParams.get("token_hash"),
                        ].filter(Boolean) as string[];
                        const hashParams = new URLSearchParams(
                          urlObj.hash.startsWith("#") ? urlObj.hash.slice(1) : urlObj.hash
                        );
                        const hashTokens = [
                          hashParams.get("token"),
                          hashParams.get("token_hash"),
                        ].filter(Boolean) as string[];
                        const allTokens = [...searchTokens, ...hashTokens];
                        if (resolvedEmail) {
                          allTokens.forEach((tokenValue) => {
                            window.localStorage.setItem(
                              `club_invite_email_${tokenValue}`,
                              resolvedEmail
                            );
                          });
                        }
                        window.sessionStorage.setItem("club_invite_reissue_url", actionLink);
                      } catch (parseError) {
                        logger.warn("[clubs/signup] Unable to parse action link", parseError);
                      }
                    }
                    if (!cancelled) {
                      window.location.replace(actionLink);
                    }
                    return;
                  }

                  if (reissuedToken) {
                    const reissueType = mapTypeToOtp(linkType ?? null);
                    verifyResult = await attemptVerify(reissuedToken, reissueType, resolvedEmail);
                    if (verifyResult.ok) return;
                    lastError = verifyResult.error;
                  }
                } else {
                  const payload = await reissueResponse.json().catch(() => null);
                  lastError = new Error(payload?.error || "Impossible de régénérer le lien.");
                }
              } catch (reissueException: any) {
                lastError = reissueException;
              }
            }

            logger.error("[clubs/signup] invite session not established after retry", lastError);
            throw new Error(
              lastError?.message ||
              "Lien d'invitation expiré ou déjà utilisé. Demandez-en un nouveau."
            );
          }

          const { data: sessionData } = await supabase.auth.getSession();
          const session = sessionData.session ?? null;
          if (session && !cancelled) {
            completeSession(session, normalizedEmailParam ?? null);
            return;
          }
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error || !data?.session) {
            throw new Error(error?.message || "Impossible de valider l'invitation.");
          }
          if (!cancelled) {
            setEmail(data.session.user.email ?? null);
            setStatus("ready");
            if (inviteTokenKey && data.session.user.email && typeof window !== "undefined") {
              window.localStorage.setItem(inviteTokenKey, data.session.user.email.toLowerCase());
            }
            // Nettoyer le hash pour éviter les soucis de navigation
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            }
          }
          return;
        }

        // Vérifier si une session existe déjà (par exemple après actualisation)
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session && !cancelled) {
          const sessionEmail = existingSession.session.user.email?.toLowerCase() || null;

          // Ne continuer que si la session correspond bien à l'email de l'invitation
          if (normalizedEmailParam && sessionEmail === normalizedEmailParam) {
            setEmail(sessionEmail);
            setStatus("ready");
            return;
          }

          // Si la session courante est sur un autre compte (ex: propriétaire déjà connecté),
          // on la ferme pour éviter d'écraser son mot de passe.
          await supabase.auth.signOut().catch(() => { });
        }

        // Cas de lien sans token ni access_token (ex: ancien lien ou lien copié sans le hash)
        // Si on a au moins un email, on tente de régénérer un lien d'invitation frais
        if (!accessToken && !inviteToken && normalizedEmailParam && !hasRetriedRef.current) {
          hasRetriedRef.current = true;
          try {
            const reissueResponse = await fetch("/api/clubs/admin-invite/reissue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: normalizedEmailParam,
              }),
              credentials: "include",
            });

            if (reissueResponse.ok) {
              const linkResponse = await reissueResponse.json();
              logger.info("[clubs/signup] Reissue (no token) response", linkResponse);
              const { actionLink, email: reissuedEmail } = linkResponse;

              if (typeof window !== "undefined") {
                if (actionLink) {
                  // Mémoriser l'email pour les futurs échanges de token
                  if (reissuedEmail) {
                    try {
                      const urlObj = new URL(actionLink);
                      const tokens: string[] = [];
                      const searchParamsTokens = [
                        urlObj.searchParams.get("token"),
                        urlObj.searchParams.get("token_hash"),
                      ].filter(Boolean) as string[];
                      tokens.push(...searchParamsTokens);
                      const hashParams = new URLSearchParams(
                        urlObj.hash.startsWith("#") ? urlObj.hash.slice(1) : urlObj.hash
                      );
                      const hashTokens = [
                        hashParams.get("token"),
                        hashParams.get("token_hash"),
                      ].filter(Boolean) as string[];
                      tokens.push(...hashTokens);

                      tokens.forEach((tokenValue) => {
                        window.localStorage.setItem(
                          `club_invite_email_${tokenValue}`,
                          reissuedEmail.toLowerCase()
                        );
                      });
                    } catch (parseError) {
                      logger.warn("[clubs/signup] Unable to parse reissued action link", parseError);
                    }
                  }
                  // Rediriger vers le lien Supabase qui ajoutera les bons paramètres (token / access_token)
                  window.location.replace(actionLink);
                  return;
                }
              }
            } else {
              const payload = await reissueResponse.json().catch(() => null);
              throw new Error(payload?.error || "Impossible de régénérer le lien d'invitation.");
            }
          } catch (reissueError: any) {
            logger.error("[clubs/signup] Reissue (no token) error", reissueError);
            throw new Error(
              reissueError?.message ||
              "Lien d'invitation expiré ou déjà utilisé. Demandez-en un nouveau."
            );
          }
        }

        // Lien incomplet : rediriger vers la connexion club avec message
        if (typeFromHash === "invite" && !accessToken && !inviteToken) {
          throw new Error("Lien d'invitation incomplet. Réessayez.");
        }

        throw new Error("Lien d'invitation invalide ou déjà utilisé.");
      } catch (err: any) {
        logger.error("[clubs/signup] Invitation error:", err);
        if (!cancelled) {
          setError(err?.message || "Impossible de valider cette invitation.");
          setStatus("error");
        }
      }
    }

    handleInvite();

    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase.auth]);

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      // Activer l'invitation admin côté base
      await fetch("/api/clubs/activate-admin", {
        method: "POST",
        credentials: "include",
      }).catch((err) => {
        logger.warn("[clubs/signup] activate-admin warning", err);
      });

      // Initialiser le profil / métadonnées club pour ce nouvel admin
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (session?.access_token) {
          await fetch("/api/profile/init", {
            method: "POST",
            credentials: "include",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }).catch((initErr) => {
            logger.warn("[clubs/signup] profile/init warning", initErr);
          });
        }
      } catch (profileErr) {
        logger.warn("[clubs/signup] profile init after admin invite warning", profileErr);
      }

      // Déconnecter l'utilisateur et le rediriger vers la page de connexion
      // pour qu'il se connecte avec son propre compte (et non celui du propriétaire)
      await supabase.auth.signOut();

      setStatus("success");
      setTimeout(() => {
        router.replace("/clubs/login?message=Compte créé avec succès. Connectez-vous avec votre nouvelle adresse email.");
      }, 1500);
    } catch (err: any) {
      logger.error("[clubs/signup] Password setup error:", err);
      setError(err?.message || "Impossible d'enregistrer le mot de passe. Réessayez plus tard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-[#0066FF] rounded-full animate-spin"></div>
          </div>
          <p className="text-white/70">Validation de votre invitation en cours...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
          <div className="text-4xl mb-3">❌</div>
          <h1 className="text-xl font-semibold mb-2">Invitation invalide</h1>
          <p className="text-sm text-white/70 mb-4">
            {error || "Cette invitation n'est plus valide ou a déjà été utilisée."}
          </p>
          <p className="text-xs text-white/40">
            Contactez le propriétaire du club pour obtenir une nouvelle invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="text-sm uppercase tracking-[0.3em] text-white/40 mb-2">Invitation administrateur</div>
        <h1 className="text-2xl font-extrabold mb-3">Définir votre mot de passe</h1>
        <p className="text-sm text-white/70 mb-6">
          {email
            ? `Votre invitation est associée à l'adresse ${email}. Choisissez votre mot de passe pour accéder au dashboard du club.`
            : "Définissez votre mot de passe pour accéder au dashboard du club."}
        </p>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-semibold hover:shadow-[0_0_25px_rgba(0,102,255,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Enregistrement..." : "Enregistrer le mot de passe"}
          </button>
        </form>

        <p className="mt-6 text-xs text-white/50">
          Une fois le mot de passe enregistré, vous serez redirigé vers la page de connexion du compte club.
        </p>
      </div>
    </div>
  );
}


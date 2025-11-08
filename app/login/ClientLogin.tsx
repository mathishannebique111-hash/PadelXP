"use client";

import EmailSignupForm from "@/components/auth/EmailSignupForm";
import PlayerClubGate from "@/components/auth/PlayerClubGate";
import { useState } from "react";

export default function ClientLogin() {
  const [clubInfo, setClubInfo] = useState<{ name: string; slug: string; invitationCode: string; code: string }>({ name: "", slug: "", invitationCode: "", code: "" });
  return (
    <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-8">
      <h1 className="text-2xl font-extrabold mb-2">Inscription joueur</h1>
      <p className="text-white/60 mb-6 text-sm">Créez votre compte, puis associez‑le à votre club / complexe avec le code d’invitation.</p>
      <EmailSignupForm
        extra={
          <div className="pt-2">
            <PlayerClubGate onChange={setClubInfo} />
          </div>
        }
        beforeSubmit={() => {
          const slug = (clubInfo.slug || "").trim();
          const expected = (clubInfo.invitationCode || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
          const input = (clubInfo.code || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");

          if (!slug) {
            return { ok: false, message: "Sélectionnez votre club / complexe" };
          }

          if (!expected) {
            return { ok: false, message: "Le code d’invitation du club est indisponible. Réessayez ou contactez le club." };
          }

          if (!input) {
            return { ok: false, message: "Saisissez le code d’invitation reçu" };
          }

          if (input !== expected) {
            return { ok: false, message: "Code d’invitation incorrect pour ce club / complexe" };
          }

          return {
            ok: true,
            redirect: `/club/${slug}/profil`,
            club: {
              slug,
              code: input,
            },
          };
        }}
        afterAuth={async (context) => {
          const payload = context?.club;
          const slug = payload?.slug || (clubInfo.slug || '').trim();
          const code = payload?.code || (clubInfo.code || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
          if (!slug || !code) return;
          try {
            const response = await fetch('/api/player/attach', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ slug, code })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('[ClientLogin] Failed to attach club:', response.status, errorData);
              const message = errorData?.error || 'Impossible d’attacher le club';
              if (typeof window !== 'undefined') {
                window.alert(message);
              }
              throw new Error(message);
            }
          } catch (attachError) {
            console.error('[ClientLogin] Error attaching club:', attachError);
            if (typeof window !== 'undefined') {
              window.alert(attachError instanceof Error ? attachError.message : 'Erreur lors de l’attachement au club');
            }
            throw attachError;
          }
        }}
      />
      <div className="mt-4 text-center text-sm text-white/70">
        Déjà membre ? <a href="/player/login" className="underline">Se connecter</a>
      </div>
    </div>
  );
}



"use client";

import { useState } from "react";

type Props = {
  code: string | null;
  slug: string | null;
};

export default function InvitationCodeCard({ code, slug }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 15000);
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-[#00CC99]/40 bg-gradient-to-br from-[#03204a] via-[#01142d] to-[#000916] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold text-white">Code d’invitation joueurs</h2>
          <p className="mt-1 text-sm text-white/70">
            Partagez ce code pour que vos joueurs rejoignent immédiatement votre club lors de leur inscription.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-[#02346d]/60 via-[#012a58]/60 to-[#01403f]/60 px-6 py-5 shadow-[0_8px_30px_rgba(0,102,255,0.25)]">
          <div className="text-xs uppercase tracking-[0.35em] text-white/50">
            Votre code
          </div>
          <div className="mt-4 flex items-center justify-center">
            <div className="inline-flex min-w-[14rem] justify-center px-3 py-2 font-semibold text-lg tracking-[0.18em] text-white">
              {code || "—"}
            </div>
          </div>
          <button
            type="button"
            disabled={!code}
            onClick={handleCopy}
            className={`mt-4 w-full rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              copied
                ? "border-white/40 bg-black text-white"
                : "border-white/25 bg-gradient-to-r from-[#0066FF] to-[#00CC99] text-white shadow-[0_12px_24px_rgba(0,102,255,0.35)] hover:brightness-110"
            } disabled:opacity-50 disabled:shadow-none`}
          >
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>

        <p className="text-xs text-white/60">
          Conseil : affichez ce code à l’accueil, glissez-le dans vos emails de bienvenue ou vos messages WhatsApp pour accélérer les inscriptions.
        </p>
      </div>
    </div>
  );
}


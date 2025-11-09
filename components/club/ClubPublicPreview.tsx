"use client";

import { useMemo } from "react";
import ClubProfileClient from "./ClubProfileClient";

type OpeningHoursValue = { open: string | null; close: string | null; closed?: boolean };
type OpeningHours = Record<string, OpeningHoursValue>;

type Props = {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  addressLine?: string | null;
  phone?: string | null;
  website?: string | null;
  numberOfCourts?: number | null;
  courtType?: string | null;
  openingHours?: OpeningHours | null;
  publicUrl?: string | null;
};

export default function ClubPublicPreview({
  name,
  logoUrl,
  description,
  addressLine,
  phone,
  website,
  numberOfCourts,
  courtType,
  openingHours,
  publicUrl,
}: Props) {
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return publicUrl ?? "";
    if (publicUrl) return publicUrl;
    return `${window.location.origin}/club/public`;
  }, [publicUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié dans le presse-papiers");
    } catch (error) {
      console.error("[ClubPublicPreview] copy error", error);
      alert("Impossible de copier le lien");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-[0_18px_45px_rgba(12,60,148,0.25)]">
        <h2 className="text-xl font-semibold text-white">Aperçu</h2>
        <p className="text-sm text-white/60">
          Visualisez ce que vos joueurs verront dans l'espace club.
        </p>
        <div className="mt-6">
          <ClubProfileClient
            name={name}
            logoUrl={logoUrl}
            description={description ?? null}
            addressLine={addressLine ?? null}
            phone={phone ?? null}
            website={website ?? null}
            numberOfCourts={numberOfCourts ?? null}
            courtType={courtType ?? null}
            openingHours={openingHours ?? null}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
        >
          Publier
        </button>
        <button
          type="button"
          className="rounded-xl border border-rose-400/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30"
        >
          Retirer
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          Copier l’URL
        </button>
      </div>
    </div>
  );
}

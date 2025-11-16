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
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border-2 border-white/25 ring-1 ring-white/10 bg-white/5 p-6 shadow-[0_18px_45px_rgba(12,60,148,0.25)]">
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
    </div>
  );
}

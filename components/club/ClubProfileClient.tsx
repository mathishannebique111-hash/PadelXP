"use client";

import { useCallback, useState } from "react";
import ClubHeader, { AccentPalette } from "./ClubHeader";
import ClubDetailsClient from "./ClubDetailsClient";

type OpeningHoursValue = {
  open: string | null;
  close: string | null;
};

type OpeningHours = Record<string, OpeningHoursValue>;

interface ClubProfileClientProps {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  addressLine?: string | null;
  phone?: string | null;
  website?: string | null;
  numberOfCourts?: number | null;
  courtType?: string | null;
  openingHours?: OpeningHours | null;
}

export default function ClubProfileClient({
  name,
  logoUrl,
  description,
  addressLine,
  phone,
  website,
  numberOfCourts,
  courtType,
  openingHours,
}: ClubProfileClientProps) {
  const [accent, setAccent] = useState<AccentPalette | null>(null);
  const handleAccentChange = useCallback((palette: AccentPalette) => {
    setAccent(palette);
  }, []);

  return (
    <div className="space-y-6">
      <ClubHeader
        name={name}
        logoUrl={logoUrl}
        description={description}
        onAccentChange={handleAccentChange}
      />
      <ClubDetailsClient
        addressLine={addressLine}
        phone={phone}
        website={website}
        numberOfCourts={numberOfCourts ?? null}
        courtType={courtType ?? null}
        openingHours={openingHours ?? null}
        accent={accent}
      />
    </div>
  );
}

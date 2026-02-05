"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import ClubHeader, { AccentPalette } from "./ClubHeader";
import ClubDetailsClient from "./ClubDetailsClient";
import StripeConnectCard from "./StripeConnectCard";

type OpeningHoursValue = {
  open: string | null;
  close: string | null;
};

type OpeningHours = Record<string, OpeningHoursValue>;

interface ClubProfileClientProps {
  clubId?: string | null;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  addressLine?: string | null;
  phone?: string | null;
  website?: string | null;
  numberOfCourts?: number | null;
  courtType?: string | null;
  openingHours?: OpeningHours | null;
  isAdmin?: boolean;
}

export default function ClubProfileClient({
  clubId,
  name,
  logoUrl,
  description,
  addressLine,
  phone,
  website,
  numberOfCourts,
  courtType,
  openingHours,
  isAdmin = false,
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

      {isAdmin && <StripeConnectCard />}
    </div>
  );
}


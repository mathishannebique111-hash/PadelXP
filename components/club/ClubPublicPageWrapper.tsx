"use client";

import { useState, useCallback } from "react";
import ClubPublicFormClient from "./ClubPublicFormClient";
import ClubPublicPreview from "./ClubPublicPreview";

type OpeningHoursValue = { open: string | null; close: string | null; closed?: boolean };
type OpeningHours = Record<string, OpeningHoursValue>;

type ClubPreviewData = {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  addressLine?: string | null;
  phone?: string | null;
  website?: string | null;
  numberOfCourts?: number | null;
  courtType?: string | null;
  openingHours?: OpeningHours | null;
};

type Props = {
  initialData: ClubPreviewData;
  clubId: string | null;
};

export default function ClubPublicPageWrapper({ initialData, clubId }: Props) {
  const [previewData, setPreviewData] = useState<ClubPreviewData>(initialData);

  // Fonction pour mettre à jour l'aperçu depuis le formulaire
  const handleFormDataChange = useCallback((data: {
    street: string;
    postal: string;
    city: string;
    phone: string;
    website: string;
    description: string;
    numberOfCourts: string;
    courtType: string;
    openingHours: OpeningHours;
  }) => {
    const addressLine = [data.street, data.postal, data.city]
      .filter(Boolean)
      .join(" · ") || null;

    setPreviewData({
      name: initialData.name,
      logoUrl: initialData.logoUrl,
      description: data.description || null,
      addressLine,
      phone: data.phone || null,
      website: data.website || null,
      numberOfCourts: data.numberOfCourts ? Number(data.numberOfCourts) : null,
      courtType: data.courtType || null,
      openingHours: data.openingHours || null,
    });
  }, [initialData]);

  if (!clubId) {
    return (
      <>
        <ClubPublicFormClient />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Complétez les informations ci-dessus pour générer un aperçu.
        </div>
      </>
    );
  }

  return (
    <>
      <ClubPublicFormClient onDataChange={handleFormDataChange} />
      <ClubPublicPreview {...previewData} />
    </>
  );
}


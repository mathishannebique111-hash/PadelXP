"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import ClubHeader, { AccentPalette } from "./ClubHeader";
import ClubDetailsClient from "./ClubDetailsClient";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
}: ClubProfileClientProps) {
  const [accent, setAccent] = useState<AccentPalette | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleAccentChange = useCallback((palette: AccentPalette) => {
    setAccent(palette);
  }, []);

  const handleLeaveClub = async () => {
    setIsLeaving(true);
    try {
      const res = await fetch("/api/player/leave-club", { method: "POST" });
      if (res.ok) {
        toast.success("Vous avez quitté le club avec succès");
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || "Une erreur est survenue");
      }
    } catch (e) {
      console.error(e);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLeaving(false);
      setIsConfirmOpen(false);
    }
  };

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

      <div className="pt-8 pb-4 flex justify-center">
        <button
          onClick={() => setIsConfirmOpen(true)}
          className="text-xs text-white/30 hover:text-red-400 underline underline-offset-4 transition-colors"
        >
          Partir de ce club
        </button>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Quitter le club ?"
        description="En quittant ce club, vous n'aurez plus accès aux fonctionnalités spécifiques club. Vous pourrez en rejoindre un autre à tout moment."
        confirmText="Quitter le club"
        cancelText="Rester"
        variant="destructive"
        onConfirm={handleLeaveClub}
        isLoading={isLeaving}
      />
    </div>
  );
}


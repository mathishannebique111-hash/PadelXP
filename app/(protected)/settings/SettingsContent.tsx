"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import DeleteAccountButton from "@/components/settings/DeleteAccountButton";
import ProfilePhotoUpload from "@/components/settings/ProfilePhotoUpload";
import WhatsAppSettings from "@/components/settings/WhatsAppSettings";
import NameSettings from "@/components/settings/NameSettings";

export default function SettingsContent() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#172554]">
      {/* Background avec overlay - même dégradé que les autres pages joueur */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
        <PageTitle title="Réglages" subtitle="Gérez vos paramètres de compte" />

        <div className="mt-6 sm:mt-8 space-y-6">
          {/* Section Photo de profil */}
          <ProfilePhotoUpload />

          {/* Section Nom et prénom (temporaire) */}
          <NameSettings />

          {/* Section Coordination WhatsApp */}
          <WhatsAppSettings />

          {/* Section Suppression de compte */}
          <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-red-500/50 bg-red-500/10 p-4 sm:p-5 md:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Zone de danger</h2>
            <p className="text-sm text-white/70 mb-4 sm:mb-6">
              La suppression de votre compte est irréversible. Toutes vos données seront définitivement supprimées.
            </p>
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </div>
  );
}

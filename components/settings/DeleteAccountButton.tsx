"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import Image from "next/image";
import { logger } from '@/lib/logger';

export default function DeleteAccountButton({ forceShow = false }: { forceShow?: boolean }) {
  const [showConfirmation, setShowConfirmation] = useState(forceShow);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/rgpd/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: "DELETE_MY_ACCOUNT" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de la suppression du compte");
      }

      // Déconnexion et redirection vers la page d'accueil
      const supabase = supabaseClient();
      await supabase.auth.signOut();

      router.push("/");
      router.refresh();
    } catch (err: any) {
      logger.error("Error deleting account:", err);
      setError(err.message || "Une erreur est survenue lors de la suppression du compte");
      setIsDeleting(false);
    }
  };

  if (!showConfirmation) {
    return (
      <button
        onClick={() => setShowConfirmation(true)}
        className="inline-flex items-center justify-center rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 border border-red-500/50 shadow-[0_6px_20px_rgba(220,38,38,0.3)] hover:shadow-[0_8px_24px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-100 transition-all duration-300"
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Image
            src="/images/Danger page réglages.png"
            alt="Danger"
            width={24}
            height={24}
            className="w-6 h-6"
          />
          Confirmation de suppression
        </h3>
        <p className="text-sm text-white/90 mb-4">
          Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est <strong>irréversible</strong> et toutes vos données seront <strong>définitivement supprimées</strong> :
        </p>
        <ul className="list-disc list-inside ml-2 space-y-1.5 text-sm text-white/80 mb-4">
          <li>Vos informations de connexion (email, mot de passe)</li>
          <li>Toutes vos statistiques (points, classement, victoires, défaites)</li>
          <li>Tous vos matchs enregistrés</li>
          <li>Tous vos badges obtenus</li>
          <li>Toutes vos récompenses gagnées</li>
          <li>Tous vos boosts</li>
          <li>Vos participations aux tournois</li>
          <li>Vos avis et commentaires</li>
          <li>Toutes les autres données associées à votre compte</li>
        </ul>
        <p className="text-sm text-white/90 font-semibold flex items-center gap-2">
          <Image
            src="/images/Danger page réglages.png"
            alt="Danger"
            width={20}
            height={20}
            className="w-5 h-5 flex-shrink-0"
          />
          <span>Cette action ne peut pas être annulée. Vos données seront supprimées de manière permanente et ne pourront pas être récupérées.</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <input
          type="checkbox"
          id="confirm-delete"
          checked={isConfirmed}
          onChange={(e) => setIsConfirmed(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 bg-white/10"
        />
        <label htmlFor="confirm-delete" className="text-sm text-white/90 cursor-pointer select-none">
          Je reconnais que cette action est irréversible et je confirme vouloir supprimer mon compte.
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting || !isConfirmed}
          className="flex-1 inline-flex items-center justify-center rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 border border-red-500/50 shadow-[0_6px_20px_rgba(220,38,38,0.3)] hover:shadow-[0_8px_24px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isDeleting ? "Suppression en cours..." : "Oui, supprimer définitivement mon compte"}
        </button>
        <button
          onClick={() => {
            setShowConfirmation(false);
            setError(null);
          }}
          disabled={isDeleting}
          className="flex-1 inline-flex items-center justify-center rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white/90 bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}


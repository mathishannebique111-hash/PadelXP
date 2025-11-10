"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RemoveAdminButtonProps = {
  adminId: string;
  adminEmail: string;
  isPending?: boolean;
};

export default function RemoveAdminButton({ adminId, adminEmail, isPending = false }: RemoveAdminButtonProps) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);

    try {
      const response = await fetch("/api/clubs/remove-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ admin_id: adminId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      // Rafraîchir la page pour mettre à jour la liste
      router.refresh();
      setShowConfirm(false);
    } catch (error: any) {
      alert(error.message || "Erreur lors de la suppression");
      setIsRemoving(false);
    }
  };

  if (!showConfirm) {
    if (isPending) {
      return (
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/25 transition-colors"
          title={`Supprimer l'invitation de ${adminEmail}`}
        >
          ✖ Supprimer
        </button>
      );
    }

    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 transition-colors"
        title={`Supprimer ${adminEmail}`}
      >
        🗑️
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleRemove}
        disabled={isRemoving}
        className="px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-50 transition-colors"
      >
        {isRemoving ? "..." : "✓"}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        disabled={isRemoving}
        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium disabled:opacity-50 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}


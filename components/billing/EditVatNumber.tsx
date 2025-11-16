"use client";

import { useState } from "react";

interface EditVatNumberProps {
  currentVatNumber: string | null;
  onSave: (vatNumber: string) => Promise<void>;
  onClose: () => void;
}

export default function EditVatNumber({ currentVatNumber, onSave, onClose }: EditVatNumberProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vatNumber, setVatNumber] = useState(currentVatNumber || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation basique du numéro de TVA
    if (vatNumber.trim() && vatNumber.trim().length < 2) {
      setError("Le numéro de TVA doit contenir au moins 2 caractères");
      setLoading(false);
      return;
    }

    try {
      await onSave(vatNumber.trim() || "");
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">
          {currentVatNumber ? "Modifier le numéro de TVA" : "Ajouter un numéro de TVA"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Numéro de TVA intracommunautaire
            </label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="FR12345678901 (optionnel)"
            />
            <p className="text-xs text-white/50 mt-2">
              Format attendu : FR12345678901 ou laissez vide pour retirer
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/20 border border-rose-400/50 rounded-lg p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/20"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold transition-all shadow-lg disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



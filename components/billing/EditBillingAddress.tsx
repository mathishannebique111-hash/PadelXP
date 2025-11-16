"use client";

import { useState } from "react";

interface BillingAddress {
  street?: string;
  postal?: string;
  city?: string;
  country?: string;
}

interface EditBillingAddressProps {
  currentAddress: BillingAddress | null;
  onSave: (address: BillingAddress) => Promise<void>;
  onClose: () => void;
}

export default function EditBillingAddress({ currentAddress, onSave, onClose }: EditBillingAddressProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<BillingAddress>(currentAddress || {
    street: "",
    postal: "",
    city: "",
    country: "France",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black border border-white/20 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">Modifier l'adresse de facturation</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Rue et numéro
            </label>
            <input
              type="text"
              value={formData.street || ""}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 rue Example"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Code postal
              </label>
              <input
                type="text"
                value={formData.postal || ""}
                onChange={(e) => setFormData({ ...formData, postal: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="75001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Ville
              </label>
              <input
                type="text"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paris"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Pays
            </label>
            <input
              type="text"
              value={formData.country || ""}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="France"
            />
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



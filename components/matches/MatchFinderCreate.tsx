"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface MatchFinderCreateProps {
  clubId: string;
  accentColor: string;
  onSuccess: () => void;
}

export default function MatchFinderCreate({ clubId, accentColor, onSuccess }: MatchFinderCreateProps) {
  const isClub = typeof document !== 'undefined' && !!document.body.dataset.clubSubdomain;
  const effectiveAccentColor = accentColor || 'rgb(var(--theme-accent))';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    minLevel: 1.0,
    maxLevel: 10.0,
    neededPlayers: 3,
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      const response = await fetch("/api/matches/finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          club_id: clubId,
          scheduled_at: scheduledAt,
          min_level: formData.minLevel,
          max_level: formData.maxLevel,
          needed_players: formData.neededPlayers,
          description: formData.description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Une erreur est survenue");
      }

      onSuccess();
    } catch (err: any) {
      logger.error("Error creating match finder entry", { err });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/20 rounded-xl p-3 sm:p-6 shadow-xl overflow-hidden">
      <h3 className="text-lg font-bold mb-4">Créer une annonce de match</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">Date</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full max-w-[180px] bg-white/5 border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1"
            style={isClub ? { border: `1px solid ${effectiveAccentColor}` } : { borderColor: 'rgba(var(--theme-text), 0.2)' }}
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">Heure</label>
          <input
            type="time"
            required
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full max-w-[140px] bg-white/5 border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1"
            style={isClub ? { border: `1px solid ${effectiveAccentColor}` } : { borderColor: 'rgba(var(--theme-text), 0.2)' }}
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Niveau minimum ({formData.minLevel})</label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.05"
            value={formData.minLevel}
            onChange={(e) => setFormData({ ...formData, minLevel: parseFloat(e.target.value) })}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10"
            style={{ 
              accentColor,
              backgroundColor: isClub ? `rgba(var(--theme-accent-rgb), 0.2)` : undefined,
              backgroundImage: isClub ? `linear-gradient(90deg, ${effectiveAccentColor} ${(formData.minLevel - 1) * 11.11}%, rgba(255,255,255,0.1) 0%)` : undefined
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-white/60 mb-1">Niveau maximum ({formData.maxLevel})</label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.05"
            value={formData.maxLevel}
            onChange={(e) => setFormData({ ...formData, maxLevel: parseFloat(e.target.value) })}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10"
            style={{ 
              accentColor,
              backgroundColor: isClub ? `rgba(var(--theme-accent-rgb), 0.2)` : undefined,
              backgroundImage: isClub ? `linear-gradient(90deg, ${effectiveAccentColor} ${(formData.maxLevel - 1) * 11.11}%, rgba(255,255,255,0.1) 0%)` : undefined
            }}
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Nombre de joueurs recherchés</label>
          <select
            value={formData.neededPlayers}
            onChange={(e) => setFormData({ ...formData, neededPlayers: parseInt(e.target.value) })}
            className="w-full bg-white/5 border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1"
            style={isClub ? { borderColor: effectiveAccentColor, borderStyle: 'solid', borderWidth: '1px' } : { borderColor: 'rgba(var(--theme-text), 0.2)' }}
          >
            <option value={1} className="bg-slate-900">1 joueur</option>
            <option value={2} className="bg-slate-900">2 joueurs</option>
            <option value={3} className="bg-slate-900">3 joueurs (je suis seul)</option>
          </select>
          <p className="text-[10px] text-white/40 mt-1 italic">
            Les places non recherchées seront considérées comme déjà occupées par vos partenaires.
          </p>
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Description (optionnel)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: J'ai déjà réservé le terrain n°2..."
            className="w-full bg-white/5 border rounded-lg px-4 py-2 text-sm text-white h-24 resize-none focus:outline-none focus:ring-1"
            style={isClub ? { borderColor: effectiveAccentColor, borderStyle: 'solid', borderWidth: '1px' } : { borderColor: 'rgba(var(--theme-text), 0.2)' }}
          />
        </div>

        {error && <div className="text-red-500 text-xs">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-sm transition-all shadow-lg shadow-black/20"
          style={{ backgroundColor: accentColor, color: 'rgb(var(--theme-page))', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Création..." : "Publier l'annonce"}
        </button>
      </form>
    </div>
  );
}

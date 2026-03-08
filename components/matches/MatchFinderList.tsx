"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import MatchFinderItem from "./MatchFinderItem";

interface MatchFinderListProps {
  clubId: string;
  accentColor: string;
}

export default function MatchFinderList({ clubId, accentColor }: MatchFinderListProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/matches/finder?club_id=${clubId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la récupération des matchs");
      }
      
      setMatches(data);
    } catch (err: any) {
      logger.error("Error fetching match finder list", { err });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) fetchMatches();
  }, [clubId]);

  if (loading) return <div className="text-center py-10 text-white/60">Chargement des matchs...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (matches.length === 0) return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
      <div className="text-4xl mb-4">🎾</div>
      <p className="text-white font-medium">Aucun match disponible pour le moment.</p>
      <p className="text-sm text-white/40 mt-2">Soyez le premier à créer une annonce !</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {matches.map((match) => (
        <MatchFinderItem 
          key={match.id} 
          match={match} 
          accentColor={accentColor} 
          onJoinSuccess={fetchMatches}
        />
      ))}
    </div>
  );
}

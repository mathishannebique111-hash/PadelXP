"use client";

import { useState } from "react";
import MatchFinderList from "./MatchFinderList";
import MatchFinderCreate from "./MatchFinderCreate";

interface MatchJoiningContentProps {
  clubId: string;
  accentColor?: string;
}

export default function MatchJoiningContent({ clubId, accentColor = "#0C3C94" }: MatchJoiningContentProps) {
  const [activeJoinSubTab, setActiveJoinSubTab] = useState<"list" | "create">("list");

  if (!clubId) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
        <p className="text-white/60 text-sm">Veuillez d'abord rejoindre un club pour utiliser cette fonctionnalité.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveJoinSubTab("list")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeJoinSubTab === 'list' ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          style={activeJoinSubTab === 'list' ? { backgroundColor: accentColor, color: 'white' } : {}}
        >
          Matchs disponibles
        </button>
        <button 
          onClick={() => setActiveJoinSubTab("create")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeJoinSubTab === 'create' ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          style={activeJoinSubTab === 'create' ? { backgroundColor: accentColor, color: 'white' } : {}}
        >
          Créer une annonce
        </button>
      </div>

      {activeJoinSubTab === "list" ? (
        <MatchFinderList clubId={clubId} accentColor={accentColor} />
      ) : (
        <MatchFinderCreate 
          clubId={clubId} 
          accentColor={accentColor} 
          onSuccess={() => setActiveJoinSubTab("list")}
        />
      )}
    </div>
  );
}

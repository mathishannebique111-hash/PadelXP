'use client';

import { useState } from 'react';
import StatsCards from './StatsCards';
import TodayMatchesList from './TodayMatchesList';

export default function AdminDashboard() {
  const [showTodayMatches, setShowTodayMatches] = useState(false);

  const handleCardClick = (label: string) => {
    if (label === "Matchs d'aujourd'hui") {
      setShowTodayMatches(!showTodayMatches);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Tableau de bord</h1>
        <p className="text-slate-400 mt-2">Vue d'ensemble de la plateforme PadelXP.</p>
      </div>

      {/* Stats Cards */}
      <StatsCards onCardClick={handleCardClick} />

      {/* List of matches (displayed below stats when clicking on the card) */}
      {showTodayMatches && <TodayMatchesList />}
    </div>
  );
}

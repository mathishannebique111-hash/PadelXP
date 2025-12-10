'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Composant pour forcer le rechargement des données d'essai
 * Affiche un bouton de rafraîchissement si les données semblent obsolètes
 */
export default function ForceRefreshTrialData() {
  const router = useRouter();
  const [showRefresh, setShowRefresh] = useState(false);

  useEffect(() => {
    // Vérifier si on doit afficher le bouton de rafraîchissement
    // Après 5 secondes, afficher le bouton si l'utilisateur est toujours sur la page
    const timer = setTimeout(() => {
      setShowRefresh(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    // Forcer le rechargement complet de la page avec un timestamp
    router.refresh();
    // Recharger la page après un court délai pour s'assurer que le refresh est pris en compte
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  if (!showRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleRefresh}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        title="Rafraîchir les données"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
        Rafraîchir
      </button>
    </div>
  );
}


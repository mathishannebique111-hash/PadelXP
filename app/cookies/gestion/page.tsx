"use client";

import Link from "next/link";
import CookiePreferencesManager from "@/components/cookies/CookiePreferencesManager";

export default function CookieManagementPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <Link 
            href="/" 
            className="text-white/60 hover:text-white transition-colors text-sm"
          >
            ← Retour à l'accueil
          </Link>
        </div>

        <h1 className="text-4xl font-extrabold mb-4">Gérer mes préférences de cookies</h1>
        <p className="text-white/60 mb-8">
          Vous pouvez modifier vos préférences de cookies à tout moment. 
          Les modifications sont appliquées immédiatement après sauvegarde.
        </p>

        <CookiePreferencesManager />
      </div>
    </div>
  );
}

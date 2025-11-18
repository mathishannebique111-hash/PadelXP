"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function MatchConfirmForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const status = searchParams.get("status");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(status === "success" || status === "already-confirmed");

  const handleConfirm = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/matches/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "confirm" }),
      });

      if (response.ok) {
        setConfirmed(true);
        setTimeout(() => {
          router.push("/home");
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Erreur lors de la confirmation");
      }
    } catch (error) {
      setError("Erreur lors de la confirmation");
    } finally {
      setLoading(false);
    }
  };

  if (status === "already-confirmed") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Match déjà confirmé</h1>
          <p className="mb-6 text-gray-600">Vous avez déjà confirmé ce match.</p>
          <Link href="/home" className="inline-block rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl" style={{ animation: "bounce 1s ease-in-out infinite" }}>🎾</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Match confirmé !</h1>
          <p className="mb-6 text-gray-600">Votre confirmation a été enregistrée. Le match sera validé lorsque 2 joueurs sur 3 auront confirmé.</p>
          <p className="mb-6 text-sm text-gray-500">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Token manquant</h1>
          <p className="mb-6 text-gray-600">Le lien de confirmation est invalide.</p>
          <Link href="/home" className="inline-block rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.1),transparent)] z-0" />
      
      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Confirmer le match</h1>
            <p className="text-gray-600">Un joueur a enregistré un match avec vous. Veuillez confirmer le score.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
          )}

          <div className="mb-6 space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Le match sera validé lorsque 2 joueurs sur 3 auront confirmé.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleConfirm}
              disabled={loading || confirmed}
              className="flex-1 rounded-md bg-green-600 px-6 py-3 font-semibold text-white transition-all hover:bg-green-500 disabled:opacity-50"
            >
              {loading ? "Confirmation..." : confirmed ? "Confirmé ✓" : "Confirmer le match"}
            </button>
            <Link
              href="/home"
              className="flex-1 rounded-md border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              Plus tard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <MatchConfirmForm />
    </Suspense>
  );
}


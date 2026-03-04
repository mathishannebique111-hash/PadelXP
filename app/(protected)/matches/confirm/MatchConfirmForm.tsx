"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import { MapPin } from "lucide-react";

export default function MatchConfirmForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");
  const status = searchParams?.get("status");

  const [loading, setLoading] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(!!token && !status);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(status === "success" || status === "already-confirmed");
  const [matchData, setMatchData] = useState<{
    score: string;
    locationName: string;
    played_at: string;
    participants: { team: number; name: string }[];
  } | null>(null);

  // Charger les détails du match au montage
  useEffect(() => {
    async function fetchMatchDetails() {
      if (!token || status) return;

      try {
        const response = await fetch(`/api/matches/confirm?token=${token}`);
        const data = await response.json();

        if (data.success) {
          if (data.alreadyConfirmed) {
            setConfirmed(true);
          } else {
            setMatchData(data.match);
          }
        } else {
          setError(data.error || "Impossible de charger les détails du match");
        }
      } catch (err) {
        setError("Erreur lors de la récupération du match");
      } finally {
        setLoadingMatch(false);
      }
    }

    fetchMatchDetails();
  }, [token, status]);

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
          <div className="mb-4 flex items-center justify-center" style={{ animation: "bounce 1s ease-in-out infinite" }}>
            <BadgeIconDisplay icon="🎾" size={64} className="flex-shrink-0" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Match confirmé !</h1>
          <p className="mb-6 text-gray-600">Votre confirmation a été enregistrée. Le match sera validé lorsqu'un joueur de chaque équipe aura confirmé.</p>
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 relative">
      {/* Background avec overlay - Transparent en haut pour fusionner avec le fond du layout */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />

      {/* Halos vert et bleu animés */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', animationDelay: "1s" }} />
      </div>


      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-16">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Confirmer le match</h1>
            <p className="text-gray-600">Un joueur a enregistré un match avec vous. Veuillez confirmer le score.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 font-medium">{error}</div>
          )}

          {loadingMatch ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(var(--theme-secondary-accent))', borderTopColor: 'transparent' }} />
              <p className="text-sm text-gray-500">Chargement des détails du match...</p>
            </div>
          ) : matchData ? (
            <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Score</span>
                    <span className="text-3xl font-black text-[#071554] tracking-tight">{matchData.score}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lieu</span>
                    <span className="text-sm font-semibold text-[#071554] flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" style={{ color: 'rgb(var(--theme-secondary-accent))' }} />
                      {matchData.locationName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Équipe 1</span>
                    {matchData.participants.filter(p => p.team === 1).map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))' }} />
                        <span className="text-sm font-medium text-gray-700">{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Équipe 2</span>
                    {matchData.participants.filter(p => p.team === 2).map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium text-gray-700">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-[11px] font-medium text-gray-500 italic">
                  Veuillez vérifier que les informations ci-dessus sont correctes avant de confirmer.
                </p>
              </div>
            </div>
          ) : !confirmed && (
            <div className="mb-6 rounded-xl bg-amber-50 p-4 border border-amber-100">
              <p className="text-sm text-amber-700 font-medium">Informations du match non disponibles.</p>
            </div>
          )}

          <div className="mb-6">
            <div className="rounded-lg bg-[#071554]/5 p-4 border border-[#071554]/10">
              <p className="text-sm text-[#071554]/80 font-medium leading-relaxed">
                Le match sera validé et les points seront distribués lorsqu'<span className="text-[#071554] font-bold">un joueur de chaque équipe</span> aura confirmé.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading || confirmed || loadingMatch}
              className="flex-[2] rounded-xl px-6 py-4 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:grayscale"
              style={{
                backgroundColor: 'rgb(var(--theme-secondary-accent))',
                color: 'var(--theme-player-page, #071554)',
                boxShadow: '0 10px 15px -3px rgba(var(--theme-secondary-accent-rgb, 204, 255, 0), 0.2)'
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--theme-player-page, #071554)', borderTopColor: 'transparent' }} />
                  <span>Confirmation...</span>
                </div>
              ) : confirmed ? "Match Confirmé ✓" : "Confirmer le match"}
            </button>
            <Link
              href="/home"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-4 text-center font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300"
            >
              Plus tard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


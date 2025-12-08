"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MatchStatus = "scheduled" | "ready" | "in_progress" | "completed" | "cancelled" | "forfeit";

type Match = {
  id: string;
  round_type: string;
  round_number: number | null;
  match_order: number | null;
  court_number: number | null;
  scheduled_time: string | null;
  pool_id?: string | null;
  tableau?: string | null;
  team1_registration_id: string | null;
  team2_registration_id: string | null;
  team1_name: string | null;
  team2_name: string | null;
  team1_seed_number?: number | null;
  team2_seed_number?: number | null;
  is_bye: boolean;
  status: MatchStatus;
  winner_registration_id: string | null;
  score?: any;
};

type BracketTabProps = {
  tournamentId: string;
  tournamentType: string;
  matchFormat: string;
  tournamentStatus?: string;
};

function formatRoundLabel(roundType: string) {
  switch (roundType) {
    case "round_of_64":
      return "1/32";
    case "round_of_32":
      return "Seizièmes de finale";
    case "round_of_16":
      return "Huitièmes de finale";
    case "quarters":
      return "Quarts de finale";
    case "semis":
      return "Demi-finales";
    case "final":
      return "Finale";
    case "third_place":
      return "Petite finale";
    case "pool":
      return "Poules";
    default:
      return roundType.replace(/_/g, " ");
  }
}

// Fonction helper pour capitaliser les noms
function capitalizeName(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// Fonction helper pour formater un nom complet avec majuscules
function formatFullName(name: string | null | undefined): string {
  if (!name) return "";
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => capitalizeName(word))
    .join(" ");
}

function getRoundLabelForTmc(
  roundNum: number,
  tableau: string,
  match: Match,
  matchesInFirstRound = 0
): string {
  // Spécifique classement 5-8 TMC 8 : afficher "Tour 2" pour le round 2
  if (tableau === "places_5_8" && roundNum === 2) {
    return "Tour 2";
  }
  // Priorité au type de match (utile pour TMC 8 : quarts/semis/finale)
  if (match.round_type === "final") return tableau === "principal" ? "Finale [1-2]" : "Finale";
  if (match.round_type === "third_place") return tableau === "principal" ? "Petite finale [3-4]" : "Petite finale";
  if (match.round_type === "semis") return "Demi-finales";
  if (match.round_type === "quarters") return "Quarts de finale";

  if (tableau === "principal") {
    // TMC 8 : le premier tour est un quart de finale
    if (roundNum === 1 && matchesInFirstRound === 4) return "Quarts de finale";
    if (roundNum === 1) return "8èmes de finale";
    if (roundNum === 2) return "Quarts de finale";
    if (roundNum === 3) return "Demi-finales";
    if (roundNum === 4) {
      if (match.round_type === "final") return "Finale [1-2]";
      if (match.round_type === "third_place") return "Petite finale [3-4]";
      return "Matchs de classement";
    }
  } else if (tableau === "places_4_6") {
    if (roundNum === 3) return "Tour 3";
    if (roundNum === 4) {
      if (match.match_order === 3) return "Match 5ème place [5-6]";
      return "Matchs de classement";
    }
  } else if (tableau === "places_7_9") {
    if (roundNum === 3) return "Tour 3";
    if (roundNum === 4) {
      if (match.match_order === 4) return "Match 7ème place [7-8]";
      if (match.match_order === 5) return "Match 9ème place [9-10]";
      return "Matchs de classement";
    }
  } else if (tableau === "places_10_12") {
    if (roundNum === 3) return "Tour 3";
    if (roundNum === 4) {
      if (match.match_order === 6) return "Match 11ème place [11-12]";
      return "Matchs de classement";
    }
  } else if (tableau === "places_5_8") {
    if (roundNum === 2) return "Tour 2";
    if (roundNum === 3) {
      if (match.match_order === 1) return "Match 5ème place [5-6]";
      if (match.match_order === 2) return "Match 7ème place [7-8]";
      return "Matchs de classement";
    }
  } else if (tableau === "places_9_12") {
    if (roundNum === 2) return "Tour 2";
    if (roundNum === 3) return "Tour 3";
    if (roundNum === 4) {
      if (match.match_order === 1) return "Match 9ème place [9-10]";
      if (match.match_order === 2) return "Match 11ème place [11-12]";
      return "Matchs de classement";
    }
  } else if (tableau === "places_7_12") {
    if (roundNum === 2) return "Tour 2";
  } else if (tableau === "places_13_16") {
    if (roundNum === 3) return "Tour 3";
    if (roundNum === 4) {
      if (match.match_order === 1) return "Match 13ème place [13-14]";
      if (match.match_order === 2) return "Match 15ème place [15-16]";
      return "Matchs de classement";
    }
  } else if (tableau === "places_9_16") {
    if (roundNum === 2) return "Tour 2";
  }
  return `Tour ${roundNum}`;
}

export default function TournamentBracket({
  tournamentId,
  tournamentType,
  matchFormat,
  tournamentStatus,
}: BracketTabProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setInputs, setSetInputs] = useState<
    Record<string, { set1: string; set2: string; set3: string }>
  >({});
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [calculating, setCalculating] = useState(false);
  const [advancingFinal, setAdvancingFinal] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [calculatingRanking, setCalculatingRanking] = useState(false);
  const [finalRankings, setFinalRankings] = useState<
    Array<{ registrationId: string; rank: number | null; teamName: string; seedNumber?: number | null }>
  >([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void fetchMatches();
    if (tournamentType === "tmc") {
      void fetchFinalRankings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, tournamentType]);

  async function fetchMatches() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du chargement du tableau");
      }
      const loadedMatches: Match[] = data.matches || [];
      setMatches(loadedMatches);

      // Initialiser les champs "Set 1", "Set 2", "Set 3" à partir du score structuré
      const initialSets: Record<
        string,
        { set1: string; set2: string; set3: string }
      > = {};

      for (const m of loadedMatches) {
        let set1 = "";
        let set2 = "";
        let set3 = "";

        if (Array.isArray(m.score?.sets)) {
          const setsArr = m.score
            .sets as Array<{ team1: number; team2: number }>;

          // Pour tous les formats avec sets classiques, on remplit Set 1 / Set 2
          if (setsArr[0]) {
            set1 = `${setsArr[0].team1}/${setsArr[0].team2}`;
          }
          if (setsArr[1]) {
            set2 = `${setsArr[1].team1}/${setsArr[1].team2}`;
          }

          // Pour A1/A2 : 3ème set classique
          if (
            (matchFormat === "A1" || matchFormat === "A2") &&
            setsArr[2]
          ) {
            set3 = `${setsArr[2].team1}/${setsArr[2].team2}`;
          }
        }

        // Super tie-break en Set 3 pour B1/B2/C1/C2/E
        if (
          m.score?.super_tiebreak &&
          (matchFormat === "B1" ||
            matchFormat === "B2" ||
            matchFormat === "C1" ||
            matchFormat === "C2" ||
            matchFormat === "E")
        ) {
          const st = m.score
            .super_tiebreak as { team1: number; team2: number };
          set3 = `${st.team1}/${st.team2}`;
        }

        // Fallback : si pas de score structuré mais un final_score texte
        if (!set1 && m.score?.final_score) {
          const tokens = String(m.score.final_score)
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          if (tokens[0]) set1 = tokens[0];
          if (tokens[1]) set2 = tokens[1];
          if (tokens[2]) set3 = tokens[2];
        }

        if (set1 || set2 || set3) {
          initialSets[m.id] = { set1, set2, set3 };
        }
      }

      setSetInputs(initialSets);

      // Charger les classements finaux si disponibles
      if (tournamentType === "tmc") {
        await fetchFinalRankings();
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du tableau");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/generate`, {
        method: "POST",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      // Recharger la page après génération
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la génération du tableau");
    } finally {
      setGenerating(false);
    }
  }

  async function fetchFinalRankings() {
    try {
      // Récupérer les classements depuis la base de données
      const res = await fetch(
        `/api/tournaments/${tournamentId}/final-rankings`,
        {
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.rankings && Array.isArray(data.rankings)) {
          console.log("[TournamentBracket] Final rankings fetched:", data.rankings.length, "teams");
          console.log("[TournamentBracket] Rankings with places:", data.rankings.filter((r: any) => r.rank !== null).map((r: any) => ({ rank: r.rank, team: r.teamName })));
          setFinalRankings(data.rankings);
          return;
        }
      }
      
      // Fallback : construire le classement à partir des matchs si l'API n'est pas disponible
      const tour4Matches = matches.filter((m) => m.round_number === 4);
      if (tour4Matches.length === 0) return;

      const ranking: Array<{ registrationId: string; rank: number | null; teamName: string; seedNumber?: number | null }> = [];

      // Helper function pour obtenir le seed_number d'une équipe dans un match
      const getSeedNumber = (match: Match, registrationId: string | null): number | null => {
        if (!registrationId) return null;
        if (match.team1_registration_id === registrationId) return match.team1_seed_number ?? null;
        if (match.team2_registration_id === registrationId) return match.team2_seed_number ?? null;
        return null;
      };

      // Construire le classement à partir des matchs du Tour 4
      const finalMatch = tour4Matches.find(
        (m) => m.tableau === "principal" && m.round_type === "final"
      );
      if (finalMatch && finalMatch.winner_registration_id) {
        ranking.push({
          registrationId: finalMatch.winner_registration_id,
          rank: 1,
          teamName: finalMatch.winner_registration_id === finalMatch.team1_registration_id
            ? finalMatch.team1_name || "Équipe 1"
            : finalMatch.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(finalMatch, finalMatch.winner_registration_id),
        });
        const loserId =
          finalMatch.team1_registration_id === finalMatch.winner_registration_id
            ? finalMatch.team2_registration_id
            : finalMatch.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 2,
            teamName: loserId === finalMatch.team1_registration_id
              ? finalMatch.team1_name || "Équipe 1"
              : finalMatch.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(finalMatch, loserId),
          });
        }
      }

      const thirdPlaceMatch = tour4Matches.find(
        (m) => m.tableau === "principal" && m.round_type === "third_place"
      );
      if (thirdPlaceMatch && thirdPlaceMatch.winner_registration_id) {
        ranking.push({
          registrationId: thirdPlaceMatch.winner_registration_id,
          rank: 3,
          teamName: thirdPlaceMatch.winner_registration_id === thirdPlaceMatch.team1_registration_id
            ? thirdPlaceMatch.team1_name || "Équipe 1"
            : thirdPlaceMatch.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(thirdPlaceMatch, thirdPlaceMatch.winner_registration_id),
        });
        const loserId =
          thirdPlaceMatch.team1_registration_id === thirdPlaceMatch.winner_registration_id
            ? thirdPlaceMatch.team2_registration_id
            : thirdPlaceMatch.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 4,
            teamName: loserId === thirdPlaceMatch.team1_registration_id
              ? thirdPlaceMatch.team1_name || "Équipe 1"
              : thirdPlaceMatch.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(thirdPlaceMatch, loserId),
          });
        }
      }

      // Places 5-8
      const places5_8Matches = tour4Matches.filter((m) => m.tableau === "places_5_8");
      const place5Match = places5_8Matches.find((m) => m.match_order === 1);
      const place7Match = places5_8Matches.find((m) => m.match_order === 2);
      if (place5Match && place5Match.winner_registration_id) {
        ranking.push({
          registrationId: place5Match.winner_registration_id,
          rank: 5,
          teamName: place5Match.winner_registration_id === place5Match.team1_registration_id
            ? place5Match.team1_name || "Équipe 1"
            : place5Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place5Match, place5Match.winner_registration_id),
        });
        const loserId =
          place5Match.team1_registration_id === place5Match.winner_registration_id
            ? place5Match.team2_registration_id
            : place5Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 6,
            teamName: loserId === place5Match.team1_registration_id
              ? place5Match.team1_name || "Équipe 1"
              : place5Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place5Match, loserId),
          });
        }
      }
      if (place7Match && place7Match.winner_registration_id) {
        ranking.push({
          registrationId: place7Match.winner_registration_id,
          rank: 7,
          teamName: place7Match.winner_registration_id === place7Match.team1_registration_id
            ? place7Match.team1_name || "Équipe 1"
            : place7Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place7Match, place7Match.winner_registration_id),
        });
        const loserId =
          place7Match.team1_registration_id === place7Match.winner_registration_id
            ? place7Match.team2_registration_id
            : place7Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 8,
            teamName: loserId === place7Match.team1_registration_id
              ? place7Match.team1_name || "Équipe 1"
              : place7Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place7Match, loserId),
          });
        }
      }

      // Places 9-12
      const places9_12Matches = tour4Matches.filter((m) => m.tableau === "places_9_12");
      const place9Match = places9_12Matches.find((m) => m.match_order === 1);
      const place11Match = places9_12Matches.find((m) => m.match_order === 2);
      if (place9Match && place9Match.winner_registration_id) {
        ranking.push({
          registrationId: place9Match.winner_registration_id,
          rank: 9,
          teamName: place9Match.winner_registration_id === place9Match.team1_registration_id
            ? place9Match.team1_name || "Équipe 1"
            : place9Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place9Match, place9Match.winner_registration_id),
        });
        const loserId =
          place9Match.team1_registration_id === place9Match.winner_registration_id
            ? place9Match.team2_registration_id
            : place9Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 10,
            teamName: loserId === place9Match.team1_registration_id
              ? place9Match.team1_name || "Équipe 1"
              : place9Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place9Match, loserId),
          });
        }
      }
      if (place11Match && place11Match.winner_registration_id) {
        ranking.push({
          registrationId: place11Match.winner_registration_id,
          rank: 11,
          teamName: place11Match.winner_registration_id === place11Match.team1_registration_id
            ? place11Match.team1_name || "Équipe 1"
            : place11Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place11Match, place11Match.winner_registration_id),
        });
        const loserId =
          place11Match.team1_registration_id === place11Match.winner_registration_id
            ? place11Match.team2_registration_id
            : place11Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 12,
            teamName: loserId === place11Match.team1_registration_id
              ? place11Match.team1_name || "Équipe 1"
              : place11Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place11Match, loserId),
          });
        }
      }

      // Places 13-16
      const places13_16Matches = tour4Matches.filter((m) => m.tableau === "places_13_16");
      const place13Match = places13_16Matches.find((m) => m.match_order === 1);
      const place15Match = places13_16Matches.find((m) => m.match_order === 2);
      if (place13Match && place13Match.winner_registration_id) {
        ranking.push({
          registrationId: place13Match.winner_registration_id,
          rank: 13,
          teamName: place13Match.winner_registration_id === place13Match.team1_registration_id
            ? place13Match.team1_name || "Équipe 1"
            : place13Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place13Match, place13Match.winner_registration_id),
        });
        const loserId =
          place13Match.team1_registration_id === place13Match.winner_registration_id
            ? place13Match.team2_registration_id
            : place13Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 14,
            teamName: loserId === place13Match.team1_registration_id
              ? place13Match.team1_name || "Équipe 1"
              : place13Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place13Match, loserId),
          });
        }
      }
      if (place15Match && place15Match.winner_registration_id) {
        ranking.push({
          registrationId: place15Match.winner_registration_id,
          rank: 15,
          teamName: place15Match.winner_registration_id === place15Match.team1_registration_id
            ? place15Match.team1_name || "Équipe 1"
            : place15Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place15Match, place15Match.winner_registration_id),
        });
        const loserId =
          place15Match.team1_registration_id === place15Match.winner_registration_id
            ? place15Match.team2_registration_id
            : place15Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 16,
            teamName: loserId === place15Match.team1_registration_id
              ? place15Match.team1_name || "Équipe 1"
              : place15Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place15Match, loserId),
          });
        }
      }

      // Pour TMC 12 équipes, ajouter les tableaux places_4_6, places_7_9, places_10_12
      const places4_6Matches = tour4Matches.filter((m) => m.tableau === "places_4_6");
      const places7_9Matches = tour4Matches.filter((m) => m.tableau === "places_7_9");
      const places10_12Matches = tour4Matches.filter((m) => m.tableau === "places_10_12");

      // Places 4-6
      const place4Match = places4_6Matches.find((m) => m.match_order === 1);
      const place6Match = places4_6Matches.find((m) => m.match_order === 2);
      if (place4Match && place4Match.winner_registration_id) {
        ranking.push({
          registrationId: place4Match.winner_registration_id,
          rank: 4,
          teamName: place4Match.winner_registration_id === place4Match.team1_registration_id
            ? place4Match.team1_name || "Équipe 1"
            : place4Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place4Match, place4Match.winner_registration_id),
        });
        const loserId =
          place4Match.team1_registration_id === place4Match.winner_registration_id
            ? place4Match.team2_registration_id
            : place4Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 5,
            teamName: loserId === place4Match.team1_registration_id
              ? place4Match.team1_name || "Équipe 1"
              : place4Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place4Match, loserId),
          });
        }
      }
      if (place6Match && place6Match.winner_registration_id) {
        ranking.push({
          registrationId: place6Match.winner_registration_id,
          rank: 6,
          teamName: place6Match.winner_registration_id === place6Match.team1_registration_id
            ? place6Match.team1_name || "Équipe 1"
            : place6Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place6Match, place6Match.winner_registration_id),
        });
      }

      // Places 7-9
      const place7_8Match = places7_9Matches.find((m) => m.match_order === 1);
      const place9Match_7_9 = places7_9Matches.find((m) => m.match_order === 2);
      if (place7_8Match && place7_8Match.winner_registration_id) {
        ranking.push({
          registrationId: place7_8Match.winner_registration_id,
          rank: 7,
          teamName: place7_8Match.winner_registration_id === place7_8Match.team1_registration_id
            ? place7_8Match.team1_name || "Équipe 1"
            : place7_8Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place7_8Match, place7_8Match.winner_registration_id),
        });
        const loserId =
          place7_8Match.team1_registration_id === place7_8Match.winner_registration_id
            ? place7_8Match.team2_registration_id
            : place7_8Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 8,
            teamName: loserId === place7_8Match.team1_registration_id
              ? place7_8Match.team1_name || "Équipe 1"
              : place7_8Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place7_8Match, loserId),
          });
        }
      }
      if (place9Match_7_9 && place9Match_7_9.winner_registration_id) {
        ranking.push({
          registrationId: place9Match_7_9.winner_registration_id,
          rank: 9,
          teamName: place9Match_7_9.winner_registration_id === place9Match_7_9.team1_registration_id
            ? place9Match_7_9.team1_name || "Équipe 1"
            : place9Match_7_9.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place9Match_7_9, place9Match_7_9.winner_registration_id),
        });
      }

      // Places 10-12
      const place11_12Match = places10_12Matches.find((m) => m.match_order === 1);
      const place10Match = places10_12Matches.find((m) => m.match_order === 2);
      if (place11_12Match && place11_12Match.winner_registration_id) {
        ranking.push({
          registrationId: place11_12Match.winner_registration_id,
          rank: 11,
          teamName: place11_12Match.winner_registration_id === place11_12Match.team1_registration_id
            ? place11_12Match.team1_name || "Équipe 1"
            : place11_12Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place11_12Match, place11_12Match.winner_registration_id),
        });
        const loserId =
          place11_12Match.team1_registration_id === place11_12Match.winner_registration_id
            ? place11_12Match.team2_registration_id
            : place11_12Match.team1_registration_id;
        if (loserId) {
          ranking.push({
            registrationId: loserId,
            rank: 12,
            teamName: loserId === place11_12Match.team1_registration_id
              ? place11_12Match.team1_name || "Équipe 1"
              : place11_12Match.team2_name || "Équipe 2",
            seedNumber: getSeedNumber(place11_12Match, loserId),
          });
        }
      }
      if (place10Match && place10Match.winner_registration_id) {
        ranking.push({
          registrationId: place10Match.winner_registration_id,
          rank: 10,
          teamName: place10Match.winner_registration_id === place10Match.team1_registration_id
            ? place10Match.team1_name || "Équipe 1"
            : place10Match.team2_name || "Équipe 2",
          seedNumber: getSeedNumber(place10Match, place10Match.winner_registration_id),
        });
      }

      ranking.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      setFinalRankings(ranking);
    } catch (err) {
      // Ignore les erreurs de chargement des classements
      console.error("Error fetching final rankings:", err);
    }
  }

  async function handleCalculateFinalRanking() {
    try {
      setCalculatingRanking(true);
      setInfoMessage(null);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/calculate-final-ranking`,
        {
          method: "POST",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || "Erreur lors du calcul du classement final."
        );
      }
      setInfoMessage("Le classement final a été calculé avec succès.");
      // Rafraîchir les matchs pour avoir les dernières données
      await fetchMatches();
      // Puis récupérer les classements depuis la base de données
      await fetchFinalRankings();
    } catch (err: any) {
      setInfoMessage(
        err.message || "Erreur lors du calcul du classement final."
      );
    } finally {
      setCalculatingRanking(false);
    }
  }

  async function handleAdvanceFinalRound() {
    try {
      setAdvancingFinal(true);
      setInfoMessage(null);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/advance/final-next-round`,
        {
          method: "POST",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || "Erreur lors du calcul du tour suivant du tableau final."
        );
      }
      setInfoMessage("Le tour suivant du tableau final a été généré.");
      await fetchMatches();
    } catch (err: any) {
      setInfoMessage(
        err.message ||
          "Erreur lors du calcul du tour suivant du tableau final."
      );
    } finally {
      setAdvancingFinal(false);
    }
  }

  async function handleAdvanceTmcRound() {
    try {
      setAdvancingFinal(true);
      setInfoMessage(null);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/advance/tmc-next-round`,
        {
          method: "POST",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || "Erreur lors du calcul du tour suivant du TMC."
        );
      }
      setInfoMessage("Le tour suivant du TMC a été généré.");
      await fetchMatches();
    } catch (err: any) {
      setInfoMessage(
        err.message || "Erreur lors du calcul du tour suivant du TMC."
      );
    } finally {
      setAdvancingFinal(false);
    }
  }

  function parseScoreString(raw: string, format: string) {
    const cleaned = raw.trim();
    if (!cleaned) {
      throw new Error("Le score est vide.");
    }

    const tokens = cleaned.split(/\s+/);
    const parsed = tokens.map((token) => {
      const match = token.match(/^(\d+)[\/-](\d+)$/);
      if (!match) {
        throw new Error(
          `Format de score invalide "${token}". Utilise par exemple 6/3 ou 10/8.`
        );
      }
      return {
        team1: Number(match[1]),
        team2: Number(match[2]),
      };
    });

    let setTokens: { team1: number; team2: number }[] = [];
    let superToken: { team1: number; team2: number } | null = null;

    switch (format) {
      case "A1": {
        if (parsed.length < 2 || parsed.length > 3) {
          throw new Error(
            "Pour le format A1/A2, entre 2 ou 3 sets (ex: 6/3 4/6 6/4)."
          );
        }
        setTokens = parsed;
        break;
      }
      case "B1": {
        // Format B1 : 2 sets à 6 jeux + super tie-break de 10 points en cas d'égalité 1-1
        if (parsed.length < 2 || parsed.length > 3) {
          throw new Error(
            "Format B1 : entre 2 sets puis éventuellement un super tie-break (ex: 6/3 4/6 10/8)."
          );
        }
        setTokens = parsed.slice(0, 2);
        if (parsed.length === 3) {
          superToken = parsed[2];
        }
        break;
      }
      case "C1": {
        // Format C1 : 2 sets à 4 jeux + super tie-break 10 points en cas d'égalité 1-1
        if (parsed.length < 2 || parsed.length > 3) {
          throw new Error(
            "Format C1 : entre 2 sets puis éventuellement un super tie-break (ex: 4/1 3/5 10/6)."
          );
        }
        setTokens = parsed.slice(0, 2);
        if (parsed.length === 3) {
          superToken = parsed[2];
        }
        break;
      }
      case "D1": {
        if (parsed.length !== 1) {
          throw new Error(
            "Format D1 : un seul set est attendu (ex: 9/7)."
          );
        }
        setTokens = parsed;
        break;
      }
      default: {
        setTokens = [parsed[0]];
        break;
      }
    }

    const puntoDeOro = false;

    const payload: any = {
      sets: setTokens.map((s) => ({ team1: s.team1, team2: s.team2 })),
      punto_de_oro_used: puntoDeOro,
    };

    if (superToken) {
      payload.super_tiebreak = {
        team1: superToken.team1,
        team2: superToken.team2,
      };
    }

    // Règles de validation des sets pour les formats à 6 jeux (A1/B1)
    if (format === "A1" || format === "B1") {
      for (const s of payload.sets as Array<{ team1: number; team2: number }>) {
        const maxGames = Math.max(s.team1, s.team2);
        const minGames = Math.min(s.team1, s.team2);

        // Une manche doit être gagnée à 6 jeux (ou 7 en cas de 7/5 ou 7/6)
        if (maxGames < 6) {
          throw new Error(
            "Score invalide : un set doit être gagné avec au moins 6 jeux."
          );
        }

        if (maxGames === 6) {
          // Si une équipe a 6 jeux, l'autre doit avoir 4 ou moins
          if (minGames > 4) {
            throw new Error(
              "Score invalide : si une équipe a 6 jeux, l'autre doit avoir 4 jeux ou moins (6/0 à 6/4)."
            );
          }
        } else if (maxGames === 7) {
          // Si une équipe a 7 jeux, l'autre doit avoir 5 ou 6
          if (minGames < 5 || minGames > 6) {
            throw new Error(
              "Score invalide : lorsqu'une équipe a 7 jeux, l'autre doit avoir 5 ou 6 (7/5 ou 7/6 uniquement)."
            );
          }
        }
      }
    }

    if (format === "A1" && payload.sets.length === 2) {
      let wins1 = 0;
      let wins2 = 0;
      for (const s of payload.sets) {
        if (s.team1 > s.team2) wins1++;
        else if (s.team2 > s.team1) wins2++;
      }
      if (wins1 === 1 && wins2 === 1) {
        throw new Error(
          "Match en 1-1 : le 3ème set est obligatoire pour ce format."
        );
      }
    }

    if (format === "B1") {
      // B1 : au meilleur de 2 sets, super tie-break obligatoire en cas de 1-1
      if (payload.sets.length !== 2) {
        throw new Error(
          "Format B1 : exactement 2 sets sont attendus dans le score principal."
        );
      }

      let wins1 = 0;
      let wins2 = 0;
      for (const s of payload.sets as Array<{ team1: number; team2: number }>) {
        if (s.team1 > s.team2) wins1++;
        else if (s.team2 > s.team1) wins2++;
      }

      const isOneSetAll = wins1 === 1 && wins2 === 1;

      if (isOneSetAll && !payload.super_tiebreak) {
        throw new Error(
          "Format B1 : en cas de 1 set partout, un super tie-break (3ème manche) est obligatoire."
        );
      }

      if (payload.super_tiebreak) {
        const st = payload.super_tiebreak as { team1: number; team2: number };
        const maxPts = Math.max(st.team1, st.team2);
        const minPts = Math.min(st.team1, st.team2);
        if (maxPts < 10 || maxPts - minPts < 2) {
          throw new Error(
            "Super tie-break B1 invalide : il faut au moins 10 points et 2 points d'écart (ex : 10/8, 11/9…)."
          );
        }
      }
    }

    if (format === "D1") {
      // D1 : 1 set à 9 jeux minimum
      for (const s of payload.sets as Array<{ team1: number; team2: number }>) {
        const maxGames = Math.max(s.team1, s.team2);
        const minGames = Math.min(s.team1, s.team2);

        if (maxGames < 9) {
          throw new Error(
            "Score invalide en D1 : un set doit être gagné avec au moins 9 jeux."
          );
        }

        if (maxGames === 9) {
          // L'autre équipe peut avoir de 0 à 8 jeux, mais pas 9
          if (minGames > 8) {
            throw new Error(
              "Score invalide en D1 : si une équipe a 9 jeux, l'autre doit avoir au maximum 8 jeux (9/0 à 9/8)."
            );
          }
        } else if (maxGames > 9) {
          throw new Error(
            "Score invalide en D1 : le nombre de jeux gagnés ne peut pas dépasser 9."
          );
        }
      }
    }

    if (format === "C1") {
      // C1 : 2 sets à 4 jeux, super tie-break obligatoire en cas de 1-1
      if (payload.sets.length !== 2) {
        throw new Error(
          "Format C1 : exactement 2 sets sont attendus dans le score principal."
        );
      }

      // Règles spécifiques sur les scores des sets :
      // - une équipe gagne le set avec 4 jeux si l'autre a 2 ou moins (4/0, 4/1, 4/2)
      // - si une équipe a 3 jeux, l'autre doit avoir 5 (3/5 ou 5/3)
      // - le score peut être 5 si l'autre a 4 (5/4 ou 4/5)
      for (const s of payload.sets as Array<{ team1: number; team2: number }>) {
        const maxGames = Math.max(s.team1, s.team2);
        const minGames = Math.min(s.team1, s.team2);

        if (maxGames < 4) {
          throw new Error(
            "Score invalide : un set C1 doit être gagné avec au moins 4 jeux."
          );
        }

        if (maxGames === 4) {
          if (minGames > 2) {
            throw new Error(
              "Score invalide en C1 : si une équipe a 4 jeux, l'autre doit avoir 2 jeux ou moins (4/0 à 4/2)."
            );
          }
        } else if (maxGames === 5) {
          if (!(minGames === 3 || minGames === 4)) {
            throw new Error(
              "Score invalide en C1 : un set gagné à 5 jeux doit être 5/3 ou 5/4 (ou l'inverse)."
            );
          }
        } else {
          throw new Error(
            "Score invalide en C1 : un set ne peut pas dépasser 5 jeux gagnés."
          );
        }
      }

      // Gestion du 1-1 : super tie-break obligatoire
      let wins1 = 0;
      let wins2 = 0;
      for (const s of payload.sets as Array<{ team1: number; team2: number }>) {
        if (s.team1 > s.team2) wins1++;
        else if (s.team2 > s.team1) wins2++;
      }

      const isOneSetAll = wins1 === 1 && wins2 === 1;

      if (isOneSetAll && !payload.super_tiebreak) {
        throw new Error(
          "Format C1 : en cas de 1 set partout, un super tie-break (3ème manche) est obligatoire."
        );
      }

      if (payload.super_tiebreak) {
        const st = payload.super_tiebreak as { team1: number; team2: number };
        const maxPts = Math.max(st.team1, st.team2);
        const minPts = Math.min(st.team1, st.team2);
        if (maxPts < 10 || maxPts - minPts < 2) {
          throw new Error(
            "Super tie-break C1 invalide : il faut au moins 10 points et 2 points d'écart (ex : 10/8, 11/9…)."
          );
        }
      }
    }

    return payload;
  }

  function getVisibleSetSlots(format: string): number {
    switch (format) {
      case "A1":
        return 3; // jusqu'à 3 sets
      case "B1":
      case "C1":
        return 3; // 2 sets + éventuel super tie-break
      case "D1":
        return 1; // 1 manche unique
      default:
        return 3;
    }
  }

  function getSetPlaceholder(format: string, index: number): string {
    // index = 0 ⇒ première case, index = 1 ⇒ deuxième, index = 2 ⇒ troisième
    if ((format === "B1" || format === "C1") && index === 2) {
      return "Super tie-break";
    }
    return `Set ${index + 1}`;
  }

  function isValidSetScoreFormat(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const match = trimmed.match(/^(\d+)[\/-](\d+)$/);
    return !!match;
  }

  async function handleUpdateScore(matchId: string, rawScore: string) {
    // Nettoyer l'erreur précédente pour ce match
    setScoreErrors((prev) => {
      const updated = { ...prev };
      delete updated[matchId];
      return updated;
    });

    try {
      const scorePayload = parseScoreString(rawScore, matchFormat);
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scorePayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour du score");
      }
      if (data.match) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  status: data.match.status ?? m.status,
                  score: data.match.score ?? m.score,
                  winner_registration_id:
                    data.match.winner_registration_id ??
                    m.winner_registration_id,
                }
              : m
          )
        );

        // Mettre à jour les champs "Set 1", "Set 2", "Set 3" à partir du nouveau score
        let set1 = "";
        let set2 = "";
        let set3 = "";

        if (Array.isArray(data.match.score?.sets)) {
          const setsArr = data.match.score
            .sets as Array<{ team1: number; team2: number }>;
          if (setsArr[0]) {
            set1 = `${setsArr[0].team1}/${setsArr[0].team2}`;
          }
          if (setsArr[1]) {
            set2 = `${setsArr[1].team1}/${setsArr[1].team2}`;
          }
          if (
            (matchFormat === "A1" || matchFormat === "A2") &&
            setsArr[2]
          ) {
            set3 = `${setsArr[2].team1}/${setsArr[2].team2}`;
          }
        }

        if (
          data.match.score?.super_tiebreak &&
          (matchFormat === "B1" ||
            matchFormat === "B2" ||
            matchFormat === "C1" ||
            matchFormat === "C2" ||
            matchFormat === "E")
        ) {
          const st = data.match.score
            .super_tiebreak as { team1: number; team2: number };
          set3 = `${st.team1}/${st.team2}`;
        }

        setSetInputs((prev) => ({
          ...prev,
          [matchId]: { set1, set2, set3 },
        }));
      }
    } catch (err: any) {
      // Stocker l'erreur au lieu d'afficher une alerte
      setScoreErrors((prev) => ({
        ...prev,
        [matchId]: err.message || "Erreur lors de la mise à jour du score. Vérifie le format du score.",
      }));
    }
  }

  function handleSetsBlur(matchId: string) {
    const sets = setInputs[matchId] || { set1: "", set2: "", set3: "" };
    const s1 = sets.set1.trim();
    const s2 = sets.set2.trim();
    const s3 = sets.set3.trim();

    // Règles spécifiques selon le format de match
    if (matchFormat === "B1" || matchFormat === "C1") {
      // B1/C1 : 2 sets obligatoires + super tie-break obligatoire en cas de 1 set partout
      if (!s1 || !s2) {
        // On ne tente rien tant que les 2 premiers sets ne sont pas remplis
        return;
      }

      // Essayer de parser les 2 premiers sets pour détecter un éventuel 1-1
      const parsePair = (token: string) => {
        const m = token.match(/^(\d+)[\/-](\d+)$/);
        if (!m) return null;
        return { a: Number(m[1]), b: Number(m[2]) };
      };

      const p1 = parsePair(s1);
      const p2 = parsePair(s2);

      if (!p1 || !p2) {
        // Le parseur détaillé remontera l'erreur, on envoie tel quel
      } else {
        let wins1 = 0;
        let wins2 = 0;
        if (p1.a > p1.b) wins1++;
        else if (p1.b > p1.a) wins2++;
        if (p2.a > p2.b) wins1++;
        else if (p2.b > p2.a) wins2++;

        const isOneSetAll = wins1 === 1 && wins2 === 1;
        if (isOneSetAll && !s3) {
          setScoreErrors((prev) => ({
            ...prev,
            [matchId]: `Format ${matchFormat} : en cas de 1 set partout, le super tie-break est obligatoire.`,
          }));
          return;
        }
      }
    } else {
      // Pour les autres formats, au minimum Set 1 doit être rempli
      if (!s1) {
        return;
      }
    }

    const rawScore = [s1, s2, s3].filter(Boolean).join(" ");
    if (!rawScore) return;

    void handleUpdateScore(matchId, rawScore);
  }

  if (loading && matches.length === 0) {
    return <p className="text-sm text-gray-300">Chargement du tableau...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!matches.length) {
    // Le bouton apparaît si le statut est "open" ou "registration_closed"
    // (pas "completed", "cancelled", ou "draft")
    const canGenerate = tournamentStatus === "open" || tournamentStatus === "registration_closed";
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
        )}
        <p className="text-sm text-gray-300">
          Aucun match n&apos;a encore été généré.
        </p>
        {canGenerate && (
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-white border-white/30 text-black hover:bg-white/90 hover:border-white/40 transition-all"
            >
              {generating ? "Génération..." : "Générer le tableau"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const byRound = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const key = match.round_type || "autres";
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  const roundOrder: string[] = [
    "pool",
    "round_of_64",
    "round_of_32",
    "round_of_16",
    "quarters",
    "semis",
    "final",
    "third_place",
    "qualifications",
  ];

  const sortedRoundKeys = Object.keys(byRound).sort((a, b) => {
    const ia = roundOrder.indexOf(a);
    const ib = roundOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const poolMatches = byRound["pool"] || [];
  const knockoutRoundKeys = sortedRoundKeys.filter((key) => key !== "pool");

  function getKnockoutRounds(qualifiedCount: number): string[] {
    if (qualifiedCount >= 16) {
      return ["round_of_16", "quarters", "semis", "final"];
    }
    if (qualifiedCount >= 8) {
      return ["quarters", "semis", "final"];
    }
    if (qualifiedCount >= 4) {
      return ["semis", "final"];
    }
    if (qualifiedCount >= 2) {
      return ["final"];
    }
    return [];
  }

  const allPoolsCompleted =
    poolMatches.length > 0 &&
    poolMatches.every((m) => m.status === "completed");

  // Préparer la liste des poules et des paires avec classement dynamique
  type PoolTeam = { registrationId: string; name: string; wins: number };
  const poolsList: { id: string; label: string; teams: PoolTeam[] }[] = [];

  if (poolMatches.length > 0) {
    const byPool = new Map<string, Map<string, PoolTeam>>();

    for (const m of poolMatches as Match[]) {
      if (!m.pool_id) continue;
      const poolId = m.pool_id;
      if (!byPool.has(poolId)) {
        byPool.set(poolId, new Map<string, PoolTeam>());
      }
      const teamsMap = byPool.get(poolId)!;

      // Enregistrer les deux équipes avec leur nom (au moins pour l'affichage)
      if (m.team1_registration_id && m.team1_name) {
        if (!teamsMap.has(m.team1_registration_id)) {
          teamsMap.set(m.team1_registration_id, {
            registrationId: m.team1_registration_id,
            name: m.team1_name,
            wins: 0,
          });
        }
      }
      if (m.team2_registration_id && m.team2_name && !m.is_bye) {
        if (!teamsMap.has(m.team2_registration_id)) {
          teamsMap.set(m.team2_registration_id, {
            registrationId: m.team2_registration_id,
            name: m.team2_name,
            wins: 0,
          });
        }
      }

      // Si le match est terminé, incrémenter le nombre de victoires du vainqueur
      if (
        m.status === "completed" &&
        m.winner_registration_id &&
        teamsMap.has(m.winner_registration_id)
      ) {
        const team = teamsMap.get(m.winner_registration_id)!;
        team.wins += 1;
      }
    }

    let index = 1;
    for (const [poolId, teamsMap] of byPool.entries()) {
      const teams = Array.from(teamsMap.values()).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name);
      });
      poolsList.push({
        id: poolId,
        label: `Poule ${index++}`,
        teams,
      });
    }
  }

  async function handleCalculateFromPools() {
    try {
      setCalculating(true);
      setInfoMessage(null);
      setError(null);

      const res = await fetch(
        `/api/tournaments/${tournamentId}/advance/pools-final`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erreur lors du calcul du tableau final à partir des poules."
        );
      }

      setInfoMessage(
        "Tableau final généré automatiquement à partir des résultats de poules."
      );
      await fetchMatches();
    } catch (err: any) {
      setError(
        err.message ||
          "Erreur lors du calcul automatique du tableau final à partir des poules."
      );
    } finally {
      setCalculating(false);
    }
  }

  // Fonction pour calculer la position verticale d'un match dans un bracket
  // Pour aligner les matchs entre les rounds : un match doit être au milieu des deux matchs du round précédent
  // Format en entonnoir : chaque round est centré par rapport au round précédent
  function calculateMatchPosition(
    matchIndex: number,
    roundIndex: number,
    matchesInRound: number,
    matchesInFirstRound: number
  ): number {
    // Hauteur d'un cadre de match (réduite)
    const matchHeight = 90;
    // Espacement entre matchs dans le premier round (adapté) - avec espace visible entre les cadres
    const firstRoundSpacing = 120;
    
    if (roundIndex === 0) {
      // Premier round : positions équidistantes avec espacement visible
      return matchIndex * firstRoundSpacing;
    }

    // Pour les rounds suivants, calculer récursivement la position au milieu des deux matchs parents
    // Le match à l'index i dans le round actuel est entre les matchs 2*i et 2*i+1 du round précédent
    
    // Calculer récursivement les positions des matchs parents
    const parentMatch1Index = matchIndex * 2;
    const parentMatch2Index = matchIndex * 2 + 1;
    
    // Obtenir les positions (top) des matchs parents dans le round précédent
    const parent1Top = calculateMatchPosition(
      parentMatch1Index,
      roundIndex - 1,
      matchesInRound * 2,
      matchesInFirstRound
    );
    const parent2Top = calculateMatchPosition(
      parentMatch2Index,
      roundIndex - 1,
      matchesInRound * 2,
      matchesInFirstRound
    );
    
    // Calculer le centre de chaque match parent (haut + moitié de la hauteur)
    const parent1Center = parent1Top + matchHeight / 2;
    const parent2Center = parent2Top + matchHeight / 2;
    
    // Position au milieu (centré verticalement) - soustraire la moitié de la hauteur pour obtenir le top
    const centerPosition = (parent1Center + parent2Center) / 2;
    return centerPosition - matchHeight / 2;
  }

  function renderFinalBracket() {
    const shouldShowFinal =
      knockoutRoundKeys.length > 0 ||
      (tournamentType === "official_pools" &&
        poolMatches.length > 0) ||
      tournamentType === "tmc";

    if (!shouldShowFinal) {
      return null;
    }

    const columns: React.ReactElement[] = [];

    // Vérifie s'il existe au moins un tour pour lequel on peut générer le tour suivant côté client
    let canAdvanceFinal = false;
    let canCalculateFinalRanking = false;
    
    // Logique spécifique pour TMC : vérifier le round_number maximum
    if (tournamentType === "tmc") {
      const allRounds = matches
        .filter((m) => m.round_number !== null)
        .map((m) => m.round_number!);
      if (allRounds.length > 0) {
        const maxRound = Math.max(...allRounds);
        const currentRoundMatches = matches.filter(
          (m) => m.round_number === maxRound
        );
        const nextRoundMatches = matches.filter(
          (m) => m.round_number === maxRound + 1
        );

        const roundCompleted = currentRoundMatches.every(
          (m) => m.status === "completed" && m.winner_registration_id
        );

        // Pour TMC, on détermine le nombre maximum de tours selon le nombre d'équipes :
        // - TMC 8 : 3 tours (maxRound < 3)
        // - TMC 12 : 4 tours (maxRound < 4)
        // - TMC 16 : 4 tours (maxRound < 4)
        // On détermine le nombre d'équipes en comptant les inscriptions uniques dans les matchs du Tour 1
        const tour1Matches = matches.filter((m) => m.round_number === 1);
        const uniqueTeams = new Set<string>();
        tour1Matches.forEach((m) => {
          if (m.team1_registration_id) uniqueTeams.add(m.team1_registration_id);
          if (m.team2_registration_id) uniqueTeams.add(m.team2_registration_id);
        });
        const numTeams = uniqueTeams.size;
        // TMC 8 a 3 tours, TMC 12 et 16 ont 4 tours
        const maxAllowedRound = numTeams === 8 ? 3 : 4;
        
        if (roundCompleted && nextRoundMatches.length === 0 && maxRound < maxAllowedRound) {
          canAdvanceFinal = true;
        }

        // Vérifier si le dernier tour est complété pour afficher le bouton de calcul du classement
        // TMC 8 : Tour 3, TMC 12/16 : Tour 4
        const finalRoundNumber = numTeams === 8 ? 3 : 4;
        if (maxRound >= finalRoundNumber) {
          const finalRoundMatches = matches.filter((m) => m.round_number === finalRoundNumber);
          const finalRoundCompleted = finalRoundMatches.length > 0 && finalRoundMatches.every(
            (m) => m.status === "completed" && m.winner_registration_id
          );
          canCalculateFinalRanking = finalRoundCompleted;
        }
      }
    } else if (knockoutRoundKeys.length > 0) {
      // Logique pour les autres types de tournois
      for (const roundKey of knockoutRoundKeys) {
        const currentMatches = byRound[roundKey] || [];
        if (currentMatches.length === 0) continue;

        const currentIndex = roundOrder.indexOf(roundKey);
        if (currentIndex === -1 || currentIndex === roundOrder.length - 1)
          continue;

        const nextRoundKey = roundOrder[currentIndex + 1];
        const nextMatches = byRound[nextRoundKey] || [];

        const roundCompleted = currentMatches.every(
          (m) => m.status === "completed" && m.winner_registration_id
        );

        if (roundCompleted && nextMatches.length === 0) {
          canAdvanceFinal = true;
          break;
        }
      }
    }

    // Logique spécifique pour TMC : organiser par tableaux
    if (tournamentType === "tmc") {
      const tmcMatches = matches.filter((m) => m.round_number !== null);
      
      // Définir les tableaux avec leurs couleurs et labels
      const tableaux = [
        {
          id: "principal",
          label: "🏆 Tableau Principal",
          color: "#FFD700", // Or
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-400/80",
          textColor: "text-yellow-200",
          places: "Places 1 à 3",
        },
        {
          id: "places_4_6",
          label: "🥈 Places 4-6",
          color: "#C0C0C0", // Argent
          bgColor: "bg-gray-300/10",
          borderColor: "border-gray-300/80",
          textColor: "text-gray-200",
          places: "Places 4 à 6",
        },
        {
          id: "places_7_9",
          label: "🥉 Places 7-9",
          color: "#CD7F32", // Bronze
          bgColor: "bg-amber-700/10",
          borderColor: "border-amber-600/80",
          textColor: "text-amber-200",
          places: "Places 7 à 9",
        },
        {
          id: "places_10_12",
          label: "⚪ Places 10-12",
          color: "#A9A9A9", // Gris
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-400/80",
          textColor: "text-gray-300",
          places: "Places 10 à 12",
        },
        {
          id: "places_5_8",
          label: "🥈 Places 5-8",
          color: "#C0C0C0", // Argent
          bgColor: "bg-gray-300/10",
          borderColor: "border-gray-300/80",
          textColor: "text-gray-200",
          places: "Places 5 à 8",
        },
        {
          id: "places_9_12",
          label: "🥉 Places 9-12",
          color: "#CD7F32", // Bronze
          bgColor: "bg-amber-700/10",
          borderColor: "border-amber-600/80",
          textColor: "text-amber-200",
          places: "Places 9 à 12",
        },
        {
          id: "places_7_12",
          label: "Places 7-12",
          color: "#A9A9A9",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-400/80",
          textColor: "text-gray-300",
          places: "Places 7 à 12",
        },
        {
          id: "places_13_16",
          label: "⚪ Places 13-16",
          color: "#A9A9A9", // Gris
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-400/80",
          textColor: "text-gray-300",
          places: "Places 13 à 16",
        },
        {
          id: "places_9_16",
          label: "Places 9-16",
          color: "#A9A9A9",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-400/80",
          textColor: "text-gray-300",
          places: "Places 9 à 16",
        },
      ];

      // Grouper les matchs par tableau
      const matchesByTableau = new Map<string, Match[]>();
      tableaux.forEach((tab) => {
        matchesByTableau.set(tab.id, []);
      });

      tmcMatches.forEach((match) => {
        const tableau = match.tableau || "principal";
        if (matchesByTableau.has(tableau)) {
          matchesByTableau.get(tableau)!.push(match);
        } else {
          // Si le tableau n'est pas reconnu, mettre dans principal
          matchesByTableau.get("principal")!.push(match);
        }
      });

      // Détecter si c'est un TMC 16 équipes en vérifiant le nombre de matchs au premier tour du tableau principal
      const principalMatches = matchesByTableau.get("principal") || [];
      const principalFirstRound = principalMatches.length > 0 
        ? Math.min(...principalMatches.map((m) => m.round_number!))
        : null;
      const principalMatchesInFirstRound = principalFirstRound !== null
        ? principalMatches.filter((m) => m.round_number === principalFirstRound).length
        : 0;
      const isTmc16Tournament = principalMatchesInFirstRound === 8;

      // Afficher chaque tableau séparément
      tableaux.forEach((tableau) => {
        const tableauMatches = matchesByTableau.get(tableau.id) || [];
        if (tableauMatches.length === 0) return;

        // Grouper les matchs par round_number
        const rounds = Array.from(
          new Set(tableauMatches.map((m) => m.round_number!))
        ).sort((a, b) => a - b);

        if (rounds.length === 0) return;

        // Créer une section pour ce tableau
        const tableauColumns: React.ReactElement[] = [];

        rounds.forEach((roundNum) => {
          const roundMatches = tableauMatches
            .filter((m) => m.round_number === roundNum)
            .sort((a, b) => {
              const oa = a.match_order ?? 0;
              const ob = b.match_order ?? 0;
              return oa - ob;
            });

          if (roundMatches.length === 0) return;

          // Pour le Tour 4, chaque match a son propre label, donc on n'affiche pas de label de colonne
          const showColumnLabel = roundNum !== 4;
          const roundIndexInTableau = rounds.indexOf(roundNum);
          const firstRoundMatches = tableauMatches.filter((m) => m.round_number === rounds[0]);
          const matchesInFirstRound = firstRoundMatches.length;
          const roundLabel = showColumnLabel
            ? getRoundLabelForTmc(roundNum, tableau.id, roundMatches[0], matchesInFirstRound)
            : null;

          // Détecter si c'est un TMC 8/12/16 (4, 6, 8 matchs au Tour 1)
          const isTmc8 = tableau.id === "principal" && matchesInFirstRound === 4;
          const isTmc12 = tableau.id === "principal" && matchesInFirstRound === 6;
          const isTmc16 = tableau.id === "principal" && matchesInFirstRound === 8;

          // Calculer la hauteur minimale nécessaire basée sur le nombre de matchs dans le premier round
          // TMC 8 : espacement plus large pour laisser place aux labels "Quarts de finale" entre M1/M2 et M3/M4
          const firstRoundSpacing = isTmc8 ? 180 : 120;
          // Hauteur minimale basée sur l'empilement réel des matchs : (n-1)*spacing + hauteur du dernier + marge
          const baseMatchHeight = 90;
          const minHeight = matchesInFirstRound > 0
            ? (matchesInFirstRound - 1) * firstRoundSpacing + baseMatchHeight + 60
            : 800;
          const isQuartersRound = roundNum === 2 && ((roundMatches.length === 3 && isTmc12) || (roundMatches.length === 4 && isTmc16));
          const isTmc8QuartersRound = isTmc8 && roundNum === rounds[0]; // Tour 1 TMC8
          const isSemisRound = (roundNum === 2 && roundMatches.length === 2 && isTmc8)
            || (roundNum === 3 && roundMatches.length === 2 && (isTmc12 || isTmc16));
          // Pour le Tour 4, détecter la finale et la petite finale (peut y avoir 1 ou 2 matchs selon le type)
          const isFinalRound = (
            roundNum === 4 && tableau.id === "principal" && (
              (isTmc12 && roundMatches.length === 1) || 
              (isTmc16 && (roundMatches.length === 1 || roundMatches.length === 2))
            )
          ) || (
            roundNum === 3 && tableau.id === "principal" && isTmc8 && roundMatches.length === 2
          );

          // Détecter les tableaux de classement pour TMC 12 (places_4_6, places_7_9, places_10_12, places_7_12)
          // et pour TMC 16 (places_5_8, places_9_12, places_13_16, places_9_16)
          // Pour TMC 12, le premier round est le Tour 2 avec 3 matchs
          // Pour TMC 16, le premier round est le Tour 2 avec 2 matchs
          const isClassificationTableau = (
            tableau.id === "places_4_6" || 
            tableau.id === "places_7_9" || 
            tableau.id === "places_10_12" || 
            tableau.id === "places_7_12" ||
            tableau.id === "places_5_8" ||
            tableau.id === "places_9_12" ||
            tableau.id === "places_13_16" ||
            tableau.id === "places_9_16"
          );
          const isClassificationTour3 = roundNum === 3 && roundMatches.length === 2 && isClassificationTableau;
          // Pour TMC 16, le Tour 4 peut avoir 2 matchs (5e/7e, 9e/11e, 13e/15e place)
          const isClassificationTour4 = roundNum === 4 && (roundMatches.length === 1 || roundMatches.length === 2) && isClassificationTableau;

          // Calculer toutes les positions des matchs d'abord
          // Pour le Tour 3 TMC 12/16, on doit calculer les positions du Tour 2 d'abord pour centrer le 2e match
          let round2Positions: number[] = [];
          if (isSemisRound || isFinalRound) {
            const round2Matches = tableauMatches.filter((m) => m.round_number === 2);
            if (round2Matches.length === 2 || round2Matches.length === 3 || round2Matches.length === 4) {
              round2Positions = round2Matches.map((_, idx) =>
                calculateMatchPosition(idx, rounds.indexOf(2), round2Matches.length, matchesInFirstRound)
              );
            }
          }

          // Pour le Tour 4 TMC 12/16, on doit calculer les positions réelles du Tour 3 (avec le centrage spécial pour TMC 12)
          let round3Positions: number[] = [];
          if (isFinalRound) {
            const round3Matches = tableauMatches.filter((m) => m.round_number === 3);
            if (round3Matches.length === 2) {
              if (isTmc12 && round2Positions.length === 3) {
                // TMC 12 : Calculer les positions réelles du Tour 3 avec centrage spécial
                round3Positions = round3Matches.map((_, idx) => {
                  if (idx === 0) {
                    // Premier match : position normale
                    return calculateMatchPosition(0, rounds.indexOf(3), 2, matchesInFirstRound);
                  } else if (idx === 1) {
                    // Deuxième match : centré entre les 2e et 3e matchs du Tour 2
                    const match2Bottom = round2Positions[1] + 90; // match 2 (index 1) du Tour 2
                    const match3Top = round2Positions[2]; // match 3 (index 2) du Tour 2
                    const centerPosition = (match2Bottom + match3Top) / 2;
                    return centerPosition - 45 + 8; // Moitié de la hauteur du match (90/2) + léger décalage vers le bas
                  }
                  return calculateMatchPosition(idx, rounds.indexOf(3), 2, matchesInFirstRound);
                });
              } else if (isTmc16 && round2Positions.length === 4) {
                // TMC 16 : Positions normales (centrage automatique par calculateMatchPosition)
                round3Positions = round3Matches.map((_, idx) =>
                  calculateMatchPosition(idx, rounds.indexOf(3), 2, matchesInFirstRound)
                );
              } else if (isTmc8 && round2Positions.length === 2) {
                // TMC 8 : centrer Finale et Petite finale ensemble par rapport aux deux demi-finales
                // On prend en compte la hauteur des labels pour éviter tout chevauchement
                const matchHeight = 90;
                const labelHeight = 32; // hauteur approx des labels (Finale/Petite finale)
                const spacing = 56; // espace vertical entre finale et petite finale
                const blockHeight = labelHeight + matchHeight; // hauteur label + match
                // Centre entre les deux demi-finales (positions top des demies absolues)
                const centerSemis =
                  ((round2Positions[0] + matchHeight / 2) + (round2Positions[1] + matchHeight / 2)) / 2;
                // Empilement vertical : finale au-dessus, petite finale en dessous, centrées autour de centerSemis
                // Total bloc (finale + spacing + petite finale)
                const totalHeight = blockHeight * 2 + spacing;
                const verticalOffset = 30; // léger décalage vers le bas pour un centrage visuel
                const finalTop = centerSemis - totalHeight / 2 + labelHeight + verticalOffset; // top du match sous son label
                const petiteFinaleTop = finalTop + blockHeight + spacing;
                round3Positions = [finalTop, petiteFinaleTop];
              }
            }
          }

          // Pour les tableaux de classement, calculer les positions du Tour 3 avec le même espacement que les huitièmes de finale (120px)
          let classificationTour3Positions: number[] = [];
          if (isClassificationTour3 || isClassificationTour4) {
            const tour3Matches = tableauMatches.filter((m) => m.round_number === 3);
            if (tour3Matches.length === 2) {
              // Utiliser le même espacement que les huitièmes de finale du tableau principal (120px)
              // Cela crée un espace visible de 30px entre les cadres (120 - 90 = 30)
              const firstRoundSpacing = 120;
              classificationTour3Positions = [
                0, // Premier match en haut
                firstRoundSpacing, // Deuxième match avec le même espacement que les huitièmes de finale
              ];
            }
          }

          const matchPositions = roundMatches.map((_, matchIndex) => {
            // Pour tous les premiers rounds visibles de tous les tableaux, utiliser un espacement plus grand pour créer un espace visible entre les cadres
            if (roundIndexInTableau === 0) {
              // Espacement visible sur le Tour 1 (TMC8 : plus large pour laisser place aux labels "Quarts de finale")
              const firstRoundSpacing = isTmc8 ? 180 : 120;
              return matchIndex * firstRoundSpacing;
            }
            // TMC 8 : centrer les demi-finales entre les quarts (M1/M2 et M3/M4)
            if (isSemisRound && isTmc8) {
              const firstRoundSpacing = 180; // doit rester cohérent avec le tour 1
              const matchHeight = 90;
              const quarterTops = [0, firstRoundSpacing, firstRoundSpacing * 2, firstRoundSpacing * 3];
              if (matchIndex === 0) {
                const bottomM1 = quarterTops[0] + matchHeight;
                const topM2 = quarterTops[1];
                return ((bottomM1 + topM2) / 2) - matchHeight / 2; // centré entre M1 et M2
              } else {
                const bottomM3 = quarterTops[2] + matchHeight;
                const topM4 = quarterTops[3];
                return ((bottomM3 + topM4) / 2) - matchHeight / 2; // centré entre M3 et M4
              }
            }
            // Pour le Tour 3 TMC 12, centrer le 2e match par rapport aux 2e et 3e matchs du Tour 2
            if (isSemisRound && matchIndex === 1 && round2Positions.length === 3) {
              // Centrer le 2e match des demi-finales entre les 2e et 3e matchs des quarts
              const match2Bottom = round2Positions[1] + 90; // match 2 (index 1) du Tour 2
              const match3Top = round2Positions[2]; // match 3 (index 2) du Tour 2
              const centerPosition = (match2Bottom + match3Top) / 2;
              return centerPosition - 45 + 8; // Moitié de la hauteur du match (90/2) + léger décalage vers le bas
            }
            // Pour le Tour 4 TMC 12/16 (et TMC 8 principal), centrer la finale et la petite finale
            if (isFinalRound && round3Positions.length === 2) {
              // TMC 16 : logique existante
              if (isTmc16 && roundMatches.length === 2) {
                const match0Center = round3Positions[0] + 45;
                const match1Center = round3Positions[1] + 45;
                const centerBetweenSemis = (match0Center + match1Center) / 2;
                const finalLabelHeight = 50;
                const matchHeight = 90;
                const spacing = 30;
                const petiteFinaleLabelHeight = 50;
                const totalHeight = finalLabelHeight + matchHeight + spacing + petiteFinaleLabelHeight + matchHeight;
                const topOfFinale = centerBetweenSemis - totalHeight / 2;
                if (matchIndex === 0) {
                  return topOfFinale;
                } else {
                  const finalBottom = topOfFinale + finalLabelHeight + matchHeight;
                  return finalBottom + spacing;
                }
              }
              // TMC 8 principal : utiliser round3Positions calculées (finale centrée sur les demies, petite finale en dessous)
              if (isTmc8 && roundMatches.length === 2) {
                return round3Positions[matchIndex];
              }
              // TMC 12 (un seul match en finale principale)
              const match0Bottom = round3Positions[0] + 90;
              const match1Top = round3Positions[1];
              const centerPosition = (match0Bottom + match1Top) / 2;
              return centerPosition - 45 - 50;
            }
            // Pour les tableaux de classement, Tour 3 : utiliser les positions calculées avec espacement de 120px
            if (isClassificationTour3 && classificationTour3Positions.length === 2) {
              // Cas spécifique TMC 8 places_5_8 : centrer le match 5e place sur les demies, M2 à droite même top
              if (isTmc8 && tableau.id === "places_5_8" && roundMatches.length === 2) {
                // Centrer M1 (5e place) sur les deux matchs du tour précédent (semis places_5_8),
                // et garder le même top pour M2 (7e place), le décalage horizontal étant géré plus bas.
                const matchHeight = 90;
                // Les semis de places_5_8 utilisent le spacing du premier round (TMC8 => 180)
                const semisSpacing = isTmc8 ? 180 : 120;
                const semisTop0 = 0;
                const semisTop1 = semisSpacing;
                const centerBetweenSemis =
                  ((semisTop0 + matchHeight / 2) + (semisTop1 + matchHeight / 2)) / 2;
                const topAligned = centerBetweenSemis - matchHeight / 2;
                return topAligned;
              }
              return classificationTour3Positions[matchIndex];
            }
            // Pour les tableaux de classement TMC 16, Tour 4 : positionner les matchs horizontalement (côte à côte) et centrés par rapport au Tour 3
            // Match 0 (5e, 9e, 13e place) et Match 1 (7e, 11e, 15e place) alignés horizontalement
            // IMPORTANT : Les deux matchs doivent avoir EXACTEMENT la même position verticale pour être côte à côte
            if (isClassificationTour4 && isTmc16Tournament && classificationTour3Positions.length === 2) {
              // Centrer les deux matchs du Tour 4 par rapport aux deux matchs du Tour 3
              // Calculer le centre entre les deux matchs du Tour 3
              const match0Center = classificationTour3Positions[0] + 45; // Centre du match 0 du Tour 3
              const match1Center = classificationTour3Positions[1] + 45; // Centre du match 1 du Tour 3
              const centerPosition = (match0Center + match1Center) / 2;
              // Retourner la position pour que le centre des deux matchs du Tour 4 soit au centre entre les matchs du Tour 3
              // Les deux matchs du Tour 4 ont la même hauteur (90px), donc on soustrait 45px pour obtenir le top
              return centerPosition - 45;
            }
            // Pour les tableaux de classement TMC 12, Tour 4 : centrer le match entre les deux matchs du Tour 3
            if (isClassificationTour4 && !isTmc16Tournament) {
              // Les positions du Tour 3 sont déjà calculées plus haut
              if (matchIndex === 0 && classificationTour3Positions.length === 2) {
                const match0Center = classificationTour3Positions[0] + 45; // Centre du match 0 (index 0) du Tour 3
                const match1Center = classificationTour3Positions[1] + 45; // Centre du match 1 (index 1) du Tour 3
                const centerPosition = (match0Center + match1Center) / 2;
                return centerPosition - 45; // Moitié de la hauteur du match (90/2)
              }
            }
            return calculateMatchPosition(
              matchIndex,
              roundIndexInTableau,
              roundMatches.length,
              matchesInFirstRound
            );
          });

          // Calculer les positions des labels pour les quarts et demi-finales TMC 12/16
          const matchHeight = 90;
          let quartersLabel1Position = 0;
          let quartersLabel2Position = 0;
          let quartersLabel3Position = 0;
          let semisLabelPosition = 0;

          if ((isQuartersRound && matchPositions.length >= 3) || (isTmc8 && roundNum === rounds[0] && matchPositions.length === 4)) {
            if (isTmc12 && matchPositions.length === 3) {
              // TMC 12 : 2 labels pour 3 matchs
              // Label entre match 0 et 1
              const match0Bottom = matchPositions[0] + matchHeight;
              const match1Top = matchPositions[1];
              quartersLabel1Position = (match0Bottom + match1Top) / 2 + 6;
              
              // Label entre match 1 et 2
              const match1Bottom = matchPositions[1] + matchHeight;
              const match2Top = matchPositions[2];
              quartersLabel2Position = (match1Bottom + match2Top) / 2 + 6;
            } else if ((isTmc16 || isTmc8) && matchPositions.length === 4) {
              // TMC 16 : 3 labels ; TMC 8 : 2 labels (entre M1/M2 et M3/M4)
              // Label entre match 0 et 1
              const match0Bottom = matchPositions[0] + matchHeight;
              const match1Top = matchPositions[1];
              quartersLabel1Position = (match0Bottom + match1Top) / 2 + 6;
              
              // Label entre match 1 et 2 (TMC16 uniquement)
              if (isTmc16) {
                const match1Bottom = matchPositions[1] + matchHeight;
                const match2Top = matchPositions[2];
                quartersLabel2Position = (match1Bottom + match2Top) / 2 + 6;
              }
              
              // Label entre match 2 et 3
              const match2Bottom = matchPositions[2] + matchHeight;
              const match3Top = matchPositions[3];
              quartersLabel3Position = (match2Bottom + match3Top) / 2 + 6;
            }
          }

          if (isSemisRound && matchPositions.length >= 2) {
            // Label entre match 0 et 1
            const match0Bottom = matchPositions[0] + matchHeight;
            const match1Top = matchPositions[1];
            semisLabelPosition = (match0Bottom + match1Top) / 2;
          }

          // Pour les tableaux de classement TMC 16, Tour 4 : augmenter la largeur pour contenir deux matchs côte à côte
          const isTmc16ClassificationTour4 = isClassificationTour4 && isTmc16Tournament && roundMatches.length === 2;
          // Finals places 5-8 TMC 8 : deux matchs (5e et 7e place)
          const isTmc8Places58Finals = isTmc8 && tableau.id === "places_5_8" && roundMatches.length === 2;
          const columnWidth = isTmc16ClassificationTour4
            ? "min-w-[560px]"
            : isTmc8Places58Finals
            ? "min-w-[620px]" // 2x280 + 20 spacing pour éviter le wrap
            : "min-w-[280px]";
          
          tableauColumns.push(
            <div key={`${tableau.id}-round-${roundNum}`} className={`flex-none ${columnWidth} relative`}>
              {showColumnLabel && (
                <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide mb-4">
                  {roundLabel}
                </p>
              )}
              <div
                className={isTmc8Places58Finals ? "flex gap-5 items-start" : "relative"}
                style={{ minHeight: `${minHeight}px` }}
              >
                 {/* Labels pour les quarts de finale TMC 12/16 et TMC 8 */}
                 {(isQuartersRound || isTmc8QuartersRound) && (
                  <>
                    {quartersLabel1Position > 0 && (
                      <div
                        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
                        style={{ 
                          top: `${quartersLabel1Position}px`,
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <div className="bg-black/60 backdrop-blur-sm px-5 py-1.5 rounded-md border border-white/20">
                          <p className="text-lg font-semibold text-white/90 text-center tracking-wide">
                            Quarts de finale
                          </p>
                        </div>
                      </div>
                    )}
                    {quartersLabel2Position > 0 && isTmc16 && (
                      <div
                        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
                        style={{ 
                          top: `${quartersLabel2Position}px`,
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <div className="bg-black/60 backdrop-blur-sm px-5 py-1.5 rounded-md border border-white/20">
                          <p className="text-lg font-semibold text-white/90 text-center tracking-wide">
                            Quarts de finale
                          </p>
                        </div>
                      </div>
                    )}
                    {quartersLabel3Position > 0 && (
                      <div
                        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
                        style={{ 
                          top: `${quartersLabel3Position}px`,
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <div className="bg-black/60 backdrop-blur-sm px-5 py-1.5 rounded-md border border-white/20">
                          <p className="text-lg font-semibold text-white/90 text-center tracking-wide">
                            Quarts de finale
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Label pour les demi-finales TMC 12/16 */}
                {isSemisRound && semisLabelPosition > 0 && (
                  <div
                    className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
                    style={{ 
                      top: `${semisLabelPosition}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <div className="bg-black/60 backdrop-blur-sm px-5 py-1.5 rounded-md border border-white/25">
                      <p className="text-xl font-semibold text-white text-center tracking-wide">
                        Demi-finale
                      </p>
                    </div>
                  </div>
                )}

                {roundMatches.map((match, matchIndex) => {
                  const isTmc8FirstRound = isTmc8 && roundIndexInTableau === 0;
                  // Utiliser la position pré-calculée pour TMC 12/16 (tableau principal ou tableaux de classement), sinon utiliser flex
                  // Pour les tableaux de classement TMC 16 Tour 4, utiliser la même position pour les deux matchs (côte à côte)
                  const isTmc16ClassificationTour4 = isClassificationTour4 && isTmc16Tournament && roundMatches.length === 2;
                  // FORCER la même position verticale pour les deux matchs du Tour 4 des tableaux de classement TMC 16
                  // Pour TMC 8, utiliser aussi position absolue pour permettre le centrage des labels
                  const verticalPosition = (isTmc12 || isTmc16 || isClassificationTableau || isTmc8) 
                    ? (isTmc16ClassificationTour4 ? matchPositions[0] : matchPositions[matchIndex])
                    : undefined;
                  // Pour le premier tour, ajouter une marge en bas pour créer un espace visible entre les cadres
                  const isFirstRound = roundIndexInTableau === 0;
                  // Pour le Tour 4, afficher le label de chaque match
                  const matchLabel = roundNum === 4
                    ? getRoundLabelForTmc(roundNum, tableau.id, match)
                    : null;
                  const timeLabel = match.scheduled_time
                    ? new Date(match.scheduled_time).toLocaleTimeString(
                        "fr-FR",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : "";

                  const isCompleted = match.status === "completed";
                  const hasScore =
                    !match.is_bye &&
                    (match.score?.sets?.length > 0 || !!match.score?.final_score);

                  // Pour la finale (round 4, match_order 1), déterminer quelle équipe est gagnante
                  const isFinalMatch =
                    roundNum === 4 &&
                    match.match_order === 1 &&
                    match.round_type === "final";
                  const isWinnerTeam1 =
                    isFinalMatch &&
                    isCompleted &&
                    match.winner_registration_id &&
                    match.winner_registration_id === match.team1_registration_id;
                  const isWinnerTeam2 =
                    isFinalMatch &&
                    isCompleted &&
                    match.winner_registration_id &&
                    match.winner_registration_id === match.team2_registration_id;

                  const winnerName = isWinnerTeam1
                    ? formatFullName(match.team1_name)
                    : isWinnerTeam2
                    ? formatFullName(match.team2_name)
                    : null;
                  const loserName = isWinnerTeam1
                    ? formatFullName(match.team2_name)
                    : isWinnerTeam2
                    ? formatFullName(match.team1_name)
                    : null;

                  // Afficher "Finale" au-dessus du premier match de la finale (tous TMC)
                  const showFinalLabel = isFinalRound && matchIndex === 0;
                  // Afficher "Petite finale" au-dessus du cadre third_place (tous TMC)
                  const showThirdPlaceLabel = isFinalRound && match.round_type === "third_place";

                  // Définir isTmc8Places58Finals avant son utilisation
                  const isTmc8Places58Finals =
                    isTmc8 && tableau.id === "places_5_8" && roundMatches.length === 2;

                  // Positionnement horizontal : match 0 à gauche, match 1 à droite du match 0
                  // Les deux matchs doivent être sur la même ligne (même top) et côte à côte horizontalement
                  const matchWidth = 280; // Largeur approximative d'un match
                  const spacing = 20; // Espacement entre les deux matchs
                  // Construire le style de positionnement
                  let matchStyle: React.CSSProperties | undefined = undefined;
                  if (isTmc12 || isTmc16 || isClassificationTableau || isTmc8) {
                    // Pour les tableaux de classement TMC 16 Tour 4, FORCER la même position verticale pour les deux matchs
                    const finalTop = isTmc16ClassificationTour4 
                      ? matchPositions[0] // Utiliser la position du premier match pour les deux (même ligne horizontale)
                      : verticalPosition;
                    
                    matchStyle = isTmc8Places58Finals
                      ? {
                          position: 'relative' as const,
                        }
                      : {
                          position: 'absolute' as const,
                          top: `${finalTop}px`,
                        };
                    
                    if (isTmc16ClassificationTour4) {
                      // Positionnement horizontal pour les matchs côte à côte (même ligne horizontale)
                      // Les deux matchs doivent être sur la MÊME ligne (même top) et côte à côte
                      if (matchIndex === 0) {
                        matchStyle.left = '0px';
                        matchStyle.width = `${matchWidth}px`;
                      } else {
                        // Match 1 : à droite du match 0, même position verticale
                        matchStyle.left = `${matchWidth + spacing}px`;
                        matchStyle.width = `${matchWidth}px`;
                      }
                    } else {
                      // Classement 5-8 TMC 8 : match 5e et 7e place côte à côte sur la même ligne
                      if (isTmc8Places58Finals) {
                        matchStyle.left = matchIndex === 0 ? '0px' : `${matchWidth + spacing}px`;
                        matchStyle.width = `${matchWidth}px`;
                        matchStyle.top = '0px'; // aligner les deux cadres sur la même ligne
                      } else {
                        // Finale TMC 8 : finale et petite finale l'une en dessous de l'autre (pas côte à côte)
                        matchStyle.left = '0px';
                        matchStyle.right = '0px';
                      }
                    }
                  }

                  const matchClassName =
                    isTmc8Places58Finals
                      ? "space-y-1" // flow normal pour aligner côte à côte sans position absolue
                      : (isTmc12 || isTmc16 || isClassificationTableau || isTmc8)
                      ? "absolute space-y-1"
                      : "space-y-1 mb-6";

                  return (
                    <React.Fragment key={match.id}>
                      <div
                        className={matchClassName}
                        style={isTmc8Places58Finals ? undefined : matchStyle}
                      >
                      {/* Label "Finale" au-dessus du cadre pour TMC 12/16/8 */}
                      {showFinalLabel && (
                        <div className="flex items-center justify-center mb-3">
                          <div className="bg-black/70 backdrop-blur-sm px-6 py-2 rounded-lg border border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                            <p className="text-2xl font-bold text-amber-300 text-center tracking-wide">
                              Finale
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Label "Petite finale" au-dessus du cadre third_place (même style que "Tour 2") */}
                      {isTmc8 && tableau.id === "places_5_8" && roundNum === 3 && matchIndex === 1 && (
                        <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide mb-2">
                          Match 7e place
                        </p>
                      )}
                      {showThirdPlaceLabel && (
                        <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide mb-2">
                          Petite finale
                        </p>
                      )}
                        {matchLabel && (
                          <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide mb-2">
                            {matchLabel}
                          </p>
                        )}
                      <div
                        className={`rounded-md px-2 py-1.5 space-y-1 ${
                          (matchFormat === "B1" || matchFormat === "C1") ? "min-w-[265px]" : "min-w-[240px]"
                        } flex flex-col ${
                          isFinalMatch && isCompleted && hasScore
                            ? `border ${tableau.borderColor} ${tableau.bgColor}`
                            : hasScore
                            ? "border border-emerald-400/80 bg-emerald-500/10"
                            : `border ${tableau.borderColor} ${tableau.bgColor}`
                        }`}
                        style={{
                          minHeight: scoreErrors[match.id] ? 'auto' : '90px',
                        }}
                      >
                      <div className="flex items-centered justify-between flex-shrink-0">
                        <span className="text-[10px] text-gray-400">
                          {timeLabel || "\u00A0"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          M{match.match_order ?? "—"}
                        </span>
                      </div>
                      {/* Bloc des équipes et scores */}
                      <div className="flex flex-col gap-1 flex-1 min-h-0">
                      {match.is_bye ? (
                        <>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {match.team1_seed_number && (
                                <span className="mr-1 text-[10px] text-yellow-300 font-semibold">
                                  TS{match.team1_seed_number}
                                </span>
                              )}
                              <span>{formatFullName(match.team1_name) || "À définir"}</span>
                            </p>
                          </div>
                          <p className="text-[10px] text-emerald-300 italic">
                            Directement qualifié pour le tour suivant
                          </p>
                        </>
                      ) : isFinalMatch &&
                        isCompleted &&
                        winnerName &&
                        loserName ? (
                        <>
                          <div className="rounded-sm bg-amber-500/20 px-1 py-0.5">
                            <p className="text-[11px] font-semibold text-amber-100 leading-tight break-words">
                              {match.winner_registration_id === match.team1_registration_id && match.team1_seed_number && (
                                <span className="mr-1 text-[10px] text-yellow-300 font-semibold">
                                  TS{match.team1_seed_number}
                                </span>
                              )}
                              {match.winner_registration_id === match.team2_registration_id && match.team2_seed_number && (
                                <span className="mr-1 text-[10px] text-yellow-300 font-semibold">
                                  TS{match.team2_seed_number}
                                </span>
                              )}
                              <span>{winnerName}</span>
                              <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-200/80">
                                (Vainqueurs)
                              </span>
                            </p>
                          </div>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white/80 leading-tight break-words">
                              {match.winner_registration_id === match.team1_registration_id && match.team2_seed_number && (
                                <span className="mr-1 text-[10px] text-yellow-300 font-semibold">
                                  TS{match.team2_seed_number}
                                </span>
                              )}
                              {match.winner_registration_id === match.team2_registration_id && match.team1_seed_number && (
                                <span className="mr-1 text-[10px] text-yellow-300 font-semibold">
                                  TS{match.team1_seed_number}
                                </span>
                              )}
                              <span>{loserName}</span>
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {match.team1_seed_number && (
                                <span className="mr-1 text-[10px] text-yellow-300 font-semibold">
                                  TS{match.team1_seed_number}
                                </span>
                              )}
                              <span>{formatFullName(match.team1_name) || "À définir"}</span>
                            </p>
                          </div>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {match.team2_seed_number && (
                                <span className="mr-1 text-[10px] text-yellow-300 font-semibold">
                                  TS{match.team2_seed_number}
                                </span>
                              )}
                              <span>{match.team2_name ? formatFullName(match.team2_name) : (match.is_bye ? "Bye" : "À définir")}</span>
                            </p>
                          </div>
                        </>
                      )}
                      {!match.is_bye && (
                        <>
                          <div className="flex gap-1">
                            {Array.from({
                              length: getVisibleSetSlots(matchFormat),
                            }).map((_, idx) => {
                              const key = `set${idx + 1}` as
                                | "set1"
                                | "set2"
                                | "set3";
                              const isSuperTiebreakSlot =
                                (matchFormat === "B1" || matchFormat === "C1") && idx === 2;
                              // Largeur plus grande pour laisser passer "Set 1", "Set 2" et "Super tie-break"
                              const widthClass = isSuperTiebreakSlot
                                ? "w-[150px]"
                                : (matchFormat === "B1" || matchFormat === "C1")
                                ? idx === 1 ? "w-[72px]" : "w-[70px]"
                                : "w-[78px]";
                              const alignClass = isSuperTiebreakSlot
                                ? "text-center"
                                : "";

                              return (
                                <Input
                                  key={key}
                                  value={setInputs[match.id]?.[key] ?? ""}
                                  placeholder={getSetPlaceholder(
                                    matchFormat,
                                    idx
                                  )}
                                  className={`bg-black/40 border-white/20 text-white h-7 text-[11px] ${widthClass} ${alignClass}`}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setSetInputs((prev) => ({
                                      ...prev,
                                      [match.id]: {
                                        set1: prev[match.id]?.set1 ?? "",
                                        set2: prev[match.id]?.set2 ?? "",
                                        set3: prev[match.id]?.set3 ?? "",
                                        [key]: value,
                                      },
                                    }));
                                    // Nettoyer l'erreur quand l'utilisateur modifie le score
                                    if (scoreErrors[match.id]) {
                                      setScoreErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[match.id];
                                        return updated;
                                      });
                                    }
                                    
                                    if (
                                      idx === 0 &&
                                      isValidSetScoreFormat(value) &&
                                      getVisibleSetSlots(matchFormat) > 1
                                    ) {
                                      const nextId = `set-input-${match.id}-2`;
                                      setTimeout(() => {
                                        const nextEl =
                                          document.getElementById(nextId);
                                        if (nextEl) {
                                          (nextEl as HTMLInputElement).focus();
                                        }
                                      }, 0);
                                    }
                                  }}
                                  onBlur={() => handleSetsBlur(match.id)}
                                  id={`set-input-${match.id}-${idx + 1}`}
                                />
                              );
                            })}
                          </div>
                          {scoreErrors[match.id] && (
                            <p className="text-[10px] text-red-400 mt-1 leading-tight" style={{ maxWidth: (matchFormat === "B1" || matchFormat === "C1") ? '245px' : '220px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {scoreErrors[match.id]}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    </div>
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        });

        // Ajouter la section complète du tableau
        if (tableauColumns.length > 0) {
          columns.push(
            <div
              key={`tableau-${tableau.id}`}
              className={`w-full mb-8 p-4 rounded-lg border-2 ${tableau.borderColor} ${tableau.bgColor}`}
            >
              <div className="mb-4">
                <h4 className={`text-lg font-bold ${tableau.textColor} mb-1`}>
                  {tableau.label}
                </h4>
                <p className="text-xs text-white/60">{tableau.places}</p>
              </div>
              <div className="w-full overflow-x-auto pb-2">
                <div className="flex justify-start gap-2 min-w-full">
                  {tableauColumns}
                </div>
              </div>
            </div>
          );
        }
      });
    } else if (knockoutRoundKeys.length > 0) {
      // Calculer le nombre de matchs dans le premier round pour déterminer la hauteur minimale
      const firstRoundKey = knockoutRoundKeys[0];
      const firstRoundMatches = byRound[firstRoundKey] || [];
      const matchesInFirstRound = firstRoundMatches.length;
      const matchHeight = 90; // Hauteur des cadres de match (identique aux TMC)
      // Pour TDL à 8 équipes (4 matches au premier round), augmenter l'espacement pour laisser la place aux labels "quarts de finale"
      const isTdl8Teams = matchesInFirstRound === 4;
      const firstRoundSpacing = isTdl8Teams ? 180 : 120; // Espacement entre matchs du premier round
      // Ajouter de l'espace pour le premier round (entre le libellé et le premier match)
      const firstRoundTopOffset = 40;
      const minHeight = matchesInFirstRound > 0
        ? firstRoundTopOffset + (matchesInFirstRound - 1) * firstRoundSpacing + matchHeight + 60
        : 800;

      // Stocker la position du deuxième label "Quarts de finale" pour aligner "Demi-finale" dans TDL à 8 équipes
      let tdl8SecondQuartersLabelPosition: number | null = null;

      knockoutRoundKeys.forEach((roundKey, index) => {
        const roundMatches = byRound[roundKey].slice().sort((a, b) => {
          const oa = a.match_order ?? 0;
          const ob = b.match_order ?? 0;
          return oa - ob;
        });

        const isFirstRound = index === 0;
        const isLastRound = index === knockoutRoundKeys.length - 1;
        const isFinalRound = roundKey === "final";
        const isQuartersRound = roundKey === "quarters";
        const isSemisRound = roundKey === "semis";
        // Pour TDL à 8 équipes, le premier round (4 matches) correspond aux quarts de finale
        const isTdl8QuartersRound = isTdl8Teams && isFirstRound && matchesInFirstRound === 4;

        // Fonction récursive pour calculer les positions des matchs (effet d'entonnoir)
        const topOffset = 40; // Espace entre le libellé et le premier match pour le premier round
        const calculateTdlMatchPosition = (
          matchIdx: number,
          roundIdx: number,
          matchesInRound: number
        ): number => {
          if (roundIdx === 0) {
            // Premier round : positions équidistantes avec espacement visible + offset pour l'espace avec le libellé
            return topOffset + matchIdx * firstRoundSpacing;
          }
          
          // Pour les rounds suivants, calculer la position au milieu des deux matchs parents
          const parentMatch1Index = matchIdx * 2;
          const parentMatch2Index = matchIdx * 2 + 1;
          
          // Calculer récursivement les positions des matchs parents
          const parent1Top = calculateTdlMatchPosition(
            parentMatch1Index,
            roundIdx - 1,
            matchesInRound * 2
          );
          const parent2Top = calculateTdlMatchPosition(
            parentMatch2Index,
            roundIdx - 1,
            matchesInRound * 2
          );
          
          // Calculer le centre de chaque match parent
          const parent1Center = parent1Top + matchHeight / 2;
          const parent2Center = parent2Top + matchHeight / 2;
          
          // Position au milieu (centré verticalement)
          const centerPosition = (parent1Center + parent2Center) / 2;
          return centerPosition - matchHeight / 2;
        };

        // Calculer les positions des matchs pour créer l'effet d'entonnoir
        const matchPositions = roundMatches.map((_, matchIndex) =>
          calculateTdlMatchPosition(matchIndex, index, roundMatches.length)
        );

        // Calculer les positions des labels entre les matchs pour les quarts, demis et finale
        const labelPositions: number[] = [];
        
        if (isQuartersRound || isSemisRound || isTdl8QuartersRound) {
          // Calculer les positions entre chaque paire de matchs
          // Pour TDL à 8 équipes : entre M1-M2, M2-M3, M3-M4
          for (let i = 0; i < roundMatches.length - 1; i++) {
            // Pour un centrage vertical précis, utiliser le bas du premier match et le haut du second
            const match0Bottom = matchPositions[i] + matchHeight;
            const match1Top = matchPositions[i + 1];
            // Calculer le milieu exact entre le bas du match i et le haut du match i+1
            const basePosition = match0Bottom + (match1Top - match0Bottom) / 2;
            // Baisser légèrement les textes "Quarts de finale" pour TDL à 8 équipes
            const labelPosition = basePosition + (isTdl8QuartersRound ? 8 : 0);
            labelPositions.push(labelPosition);
            
            // Stocker la position du deuxième label "Quarts de finale" (entre M2 et M3) pour TDL à 8 équipes
            if (isTdl8QuartersRound && i === 1) {
              tdl8SecondQuartersLabelPosition = labelPosition;
            }
          }
        }

        columns.push(
          <div key={roundKey} className="flex-none min-w-[280px] relative">
            <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide">
              {formatRoundLabel(roundKey)}
            </p>
            <div
              className="relative"
              style={{ minHeight: `${minHeight}px` }}
            >
              {/* Labels entre les matchs pour quarts, demis et finale */}
              {(isQuartersRound || isTdl8QuartersRound) && labelPositions.map((pos, idx) => (
                <div
                  key={`quarters-label-${idx}`}
                  className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
                  style={{ 
                    top: `${pos}px`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <div className="bg-black/60 backdrop-blur-sm px-5 py-1.5 rounded-md border border-white/20">
                    <p className="text-lg font-semibold text-white/90 text-center tracking-wide">
                      Quarts de finale
                    </p>
                  </div>
                </div>
              ))}
              {isSemisRound && labelPositions.map((pos, idx) => {
                // Pour TDL à 8 équipes, aligner le label "Demi-finale" avec le deuxième label "Quarts de finale"
                const semisLabelPosition = isTdl8Teams && tdl8SecondQuartersLabelPosition !== null 
                  ? tdl8SecondQuartersLabelPosition 
                  : pos;
                return (
                  <div
                    key={`semis-label-${idx}`}
                    className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
                    style={{ 
                      top: `${semisLabelPosition}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <div className="bg-black/60 backdrop-blur-sm px-5 py-1.5 rounded-md border border-white/25">
                      <p className="text-xl font-semibold text-white text-center tracking-wide">
                        Demi-finales
                      </p>
                    </div>
                  </div>
                );
              })}
              {roundMatches.map((match, matchIndex) => {
                // Afficher le label "Finale" au-dessus du premier match de la finale
                const showFinalLabel = isFinalRound && matchIndex === 0;
                const timeLabel = match.scheduled_time
                  ? new Date(match.scheduled_time).toLocaleTimeString(
                      "fr-FR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "";

                const isCompleted = match.status === "completed";
                const hasScore =
                  !match.is_bye &&
                  (match.score?.sets?.length > 0 || !!match.score?.final_score);

                // Pour la finale, déterminer quelle équipe est gagnante pour l'affichage
                const isWinnerTeam1 =
                  isFinalRound &&
                  isCompleted &&
                  match.winner_registration_id &&
                  match.winner_registration_id === match.team1_registration_id;
                const isWinnerTeam2 =
                  isFinalRound &&
                  isCompleted &&
                  match.winner_registration_id &&
                  match.winner_registration_id === match.team2_registration_id;

                const winnerName = isWinnerTeam1
                  ? formatFullName(match.team1_name)
                  : isWinnerTeam2
                  ? formatFullName(match.team2_name)
                  : null;
                const loserName = isWinnerTeam1
                  ? formatFullName(match.team2_name)
                  : isWinnerTeam2
                  ? formatFullName(match.team1_name)
                  : null;

                return (
                  <React.Fragment key={match.id}>
                    {/* Label "Finale" au-dessus du premier match de la finale */}
                    {showFinalLabel && (
                      <div 
                        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
                        style={{
                          top: `${matchPositions[matchIndex] - 80}px`,
                        }}
                      >
                        <div className="bg-black/70 backdrop-blur-sm px-6 py-2 rounded-lg border border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                          <p className="text-2xl font-bold text-amber-300 text-center tracking-wide">
                            Finale
                          </p>
                        </div>
                      </div>
                    )}
                    <div
                      className={`absolute rounded-md px-2 py-1.5 space-y-1 ${
                        (matchFormat === "B1" || matchFormat === "C1") ? "min-w-[265px]" : "min-w-[240px]"
                      } flex flex-col ${
                        // Bordure "verte" uniquement si un score a vraiment été saisi par le club
                        isFinalRound && isCompleted && hasScore
                          ? "border border-amber-400/90 bg-amber-500/10"
                          : hasScore
                          ? "border border-emerald-400/80 bg-emerald-500/10"
                          : "border border-white/15 bg-black/50"
                      }`}
                      style={{
                        top: `${matchPositions[matchIndex]}px`,
                        // Pour les Byes, utiliser une taille fixe qui correspond à la taille réelle des matchs normaux
                        // Les matchs normaux ont : header (~20px) + 2 équipes (~40px) + champs score (28px) + padding/espacements (~20px) = ~108px
                        height: match.is_bye ? '108px' : 'auto',
                        minHeight: match.is_bye ? '108px' : (scoreErrors[match.id] ? 'auto' : '90px'),
                        // Pour les Byes, utiliser une largeur légèrement plus grande que les matchs normaux
                        // Les matchs normaux utilisent min-w-[265px] ou min-w-[240px]
                        ...(match.is_bye ? {
                          width: (matchFormat === "B1" || matchFormat === "C1") ? "272px" : "247px",
                          minWidth: (matchFormat === "B1" || matchFormat === "C1") ? "272px" : "247px",
                        } : {})
                      }}
                    >
                    <div className="flex items-centered justify-between flex-shrink-0">
                      <span className="text-[10px] text-gray-400">
                        {timeLabel || "\u00A0"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        M{match.match_order ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-h-0">
                      {match.is_bye ? (
                        <>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {formatFullName(match.team1_name) || "À définir"}
                              {match.team1_seed_number && (
                                <span className="ml-1 text-[10px] text-yellow-300 font-semibold">
                                  (TS{match.team1_seed_number})
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5 min-h-[20px]">
                            {/* Espace vide pour maintenir la même hauteur que la deuxième équipe */}
                          </div>
                          <p className="text-[10px] text-emerald-300 italic mb-1">
                            Directement qualifié pour le tour suivant
                          </p>
                          <div className="flex gap-1 h-[28px] items-center">
                            {/* Espace vide pour les champs de score - hauteur fixe de 28px (h-7) pour correspondre exactement aux matchs normaux */}
                          </div>
                        </>
                      ) : isFinalRound && isCompleted && winnerName && loserName ? (
                        <>
                          <div className="rounded-sm bg-amber-500/20 px-1 py-0.5">
                            <p className="text-[11px] font-semibold text-amber-100 leading-tight break-words">
                              {winnerName}
                              {match.winner_registration_id === match.team1_registration_id && match.team1_seed_number && (
                                <span className="ml-1 text-[10px] text-yellow-300 font-semibold">
                                  (TS{match.team1_seed_number})
                                </span>
                              )}
                              {match.winner_registration_id === match.team2_registration_id && match.team2_seed_number && (
                                <span className="ml-1 text-[10px] text-yellow-300 font-semibold">
                                  (TS{match.team2_seed_number})
                                </span>
                              )}
                              <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-200/80">
                                (Vainqueurs)
                              </span>
                            </p>
                          </div>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white/80 leading-tight break-words">
                              {loserName}
                              {match.winner_registration_id === match.team1_registration_id && match.team2_seed_number && (
                                <span className="ml-1 text-[10px] text-yellow-300 font-semibold">
                                  (TS{match.team2_seed_number})
                                </span>
                              )}
                              {match.winner_registration_id === match.team2_registration_id && match.team1_seed_number && (
                                <span className="ml-1 text-[10px] text-yellow-300 font-semibold">
                                  (TS{match.team1_seed_number})
                                </span>
                              )}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {formatFullName(match.team1_name) || "À définir"}
                              {match.team1_seed_number && (
                                <span className="ml-1 text-[10px] text-yellow-300 font-semibold">
                                  (TS{match.team1_seed_number})
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {match.team2_name ? formatFullName(match.team2_name) :
                                (match.is_bye ? "Bye" : "À définir")}
                              {match.team2_seed_number && (
                                <span className="ml-1 text-[10px] text-yellow-300 font-semibold">
                                  (TS{match.team2_seed_number})
                                </span>
                              )}
                            </p>
                          </div>
                        </>
                      )}
                      {!match.is_bye && (
                        <>
                          <div className="flex gap-1">
                            {Array.from({
                              length: getVisibleSetSlots(matchFormat),
                            }).map((_, idx) => {
                              const key = `set${idx + 1}` as
                                | "set1"
                                | "set2"
                                | "set3";
                              const isSuperTiebreakSlot =
                                (matchFormat === "B1" || matchFormat === "C1") && idx === 2;
                              const widthClass = isSuperTiebreakSlot
                                ? "w-[130px]"
                                : (matchFormat === "B1" || matchFormat === "C1")
                                ? idx === 1 ? "w-[59px]" : "w-[58px]"
                                : "w-[64px]";
                              const alignClass = isSuperTiebreakSlot
                                ? "text-center"
                                : "";

                              return (
                                <Input
                                  key={key}
                                  value={setInputs[match.id]?.[key] ?? ""}
                                  placeholder={getSetPlaceholder(
                                    matchFormat,
                                    idx
                                  )}
                                  className={`bg-black/40 border-white/20 text-white h-7 text-[11px] ${widthClass} ${alignClass}`}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setSetInputs((prev) => ({
                                      ...prev,
                                      [match.id]: {
                                        set1: prev[match.id]?.set1 ?? "",
                                        set2: prev[match.id]?.set2 ?? "",
                                        set3: prev[match.id]?.set3 ?? "",
                                        [key]: value,
                                      },
                                    }));
                                    // Nettoyer l'erreur quand l'utilisateur modifie le score
                                    if (scoreErrors[match.id]) {
                                      setScoreErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[match.id];
                                        return updated;
                                      });
                                    }

                                    // Si on est sur Set 1 et que le format est valide, passer au champ suivant immédiatement
                                    if (
                                      idx === 0 &&
                                      isValidSetScoreFormat(value) &&
                                      getVisibleSetSlots(matchFormat) > 1
                                    ) {
                                      const nextId = `set-input-${match.id}-2`;
                                      // léger délai pour laisser React appliquer le setState
                                      setTimeout(() => {
                                        const nextEl =
                                          document.getElementById(nextId);
                                        if (nextEl) {
                                          (nextEl as HTMLInputElement).focus();
                                        }
                                      }, 0);
                                    }
                                  }}
                                  onBlur={() => handleSetsBlur(match.id)}
                                  id={`set-input-${match.id}-${idx + 1}`}
                                />
                              );
                            })}
                          </div>
                          {scoreErrors[match.id] && (
                            <p className="text-[10px] text-red-400 mt-1 leading-tight" style={{ maxWidth: (matchFormat === "B1" || matchFormat === "C1") ? '245px' : '220px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {scoreErrors[match.id]}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      });
    } else {
      const poolIds = Array.from(
        new Set(
          (poolMatches as Match[])
            .map((m) => m.pool_id)
            .filter((id): id is string => Boolean(id))
        )
      );
      const numPools = poolIds.length;
      const qualifiedCount = numPools * 2;
      const rounds = getKnockoutRounds(qualifiedCount);

      if (!qualifiedCount || rounds.length === 0) {
        return null;
      }

      let matchesThisRound = qualifiedCount / 2;

      for (const roundKey of rounds) {
        const cards = Array.from(
          { length: matchesThisRound },
          (_, i) => i + 1
        );

        columns.push(
          <div key={roundKey} className="flex-none min-w-[280px] space-y-3">
            <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide">
              {formatRoundLabel(roundKey)}
            </p>
            {cards.map((order) => (
              <div
                key={order}
                className="rounded-md px-3 py-2.5 space-y-1 min-h-[104px] flex flex-col justify-between border border-white/15 bg-black/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">&nbsp;</span>
                  <span className="text-[10px] text-gray-500">M{order}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="rounded-sm bg-white/5 px-1 py-0.5">
                    <p className="text-[11px] font-medium text-white/60 truncate">
                      À définir
                    </p>
                  </div>
                  <div className="rounded-sm bg-white/5 px-1 py-0.5">
                    <p className="text-[11px] font-medium text-white/60 truncate">
                      À définir
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

        matchesThisRound = Math.max(1, matchesThisRound / 2);
      }
    }

    if (columns.length === 0) {
      return null;
    }

    return (
      <div className="space-y-6">
        {/* Affichage du classement final en haut pour TMC */}
        {tournamentType === "tmc" && (() => {
          // Déterminer le nombre d'équipes pour savoir quel tour est le dernier
          const tour1Matches = matches.filter((m) => m.round_number === 1);
          const uniqueTeams = new Set<string>();
          tour1Matches.forEach((m) => {
            if (m.team1_registration_id) uniqueTeams.add(m.team1_registration_id);
            if (m.team2_registration_id) uniqueTeams.add(m.team2_registration_id);
          });
          const numTeams = uniqueTeams.size;
          const finalRoundNumber = numTeams === 8 ? 3 : 4;
          
          return (
          <div className="mb-6 p-6 rounded-xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-500/20 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-2xl font-bold text-amber-200 flex items-center gap-2">
                <span className="text-3xl">🏆</span>
                Classement Final
              </h4>
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={calculatingRanking || !canCalculateFinalRanking}
                onClick={() => void handleCalculateFinalRanking()}
                className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculatingRanking
                  ? "Calcul en cours..."
                  : canCalculateFinalRanking
                  ? "Calculer le classement final"
                  : `Complétez le Tour ${finalRoundNumber} pour calculer le classement`}
              </Button>
            </div>
            {finalRankings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {finalRankings
                  .sort((a, b) => {
                    // Trier : d'abord les classés (rank non null), puis les non classés
                    if (a.rank === null && b.rank === null) return 0;
                    if (a.rank === null) return 1;
                    if (b.rank === null) return -1;
                    return a.rank - b.rank;
                  })
                  .map((ranking) => (
                  <div
                    key={ranking.registrationId}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      ranking.rank !== null
                        ? "bg-gradient-to-r from-amber-600/30 to-amber-700/20 border-amber-400/40 shadow-md"
                        : "bg-black/40 border-white/10 opacity-70"
                    }`}
                  >
                    <span
                      className={`text-xl font-bold min-w-[40px] text-center ${
                        ranking.rank !== null
                          ? "text-amber-200"
                          : "text-gray-400"
                      }`}
                    >
                      {ranking.rank !== null ? ranking.rank : "-"}
                    </span>
                    <div className="flex flex-col flex-1 min-w-0">
                      {ranking.seedNumber && (
                        <span className="text-xs font-bold text-amber-400/90">
                          TS{ranking.seedNumber}
                        </span>
                      )}
                      <span
                        className={`text-sm font-medium truncate ${
                          ranking.rank !== null ? "text-white" : "text-gray-400"
                        }`}
                      >
                        {ranking.teamName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Aucun classement disponible. Complétez le Tour {finalRoundNumber} pour calculer le classement final.</p>
              </div>
            )}
          </div>
          );
        })()}

        <div className="flex items-center justify-between">
          <h3 className="text-md font-semibold text-white">
            {tournamentType === "tmc" ? "Tableaux TMC" : "Tableau final"}
          </h3>
          <div className="flex gap-2">
            {canAdvanceFinal && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={advancingFinal}
                onClick={() =>
                  void (tournamentType === "tmc"
                    ? handleAdvanceTmcRound()
                    : handleAdvanceFinalRound())
                }
              >
                {advancingFinal
                  ? "Calcul en cours..."
                  : "Afficher le tour suivant"}
              </Button>
            )}
          </div>
        </div>

        {tournamentType === "tmc" ? (
          <div className="space-y-6">{columns}</div>
        ) : (
          <div className="w-full overflow-x-auto pb-2">
            <div className="flex justify-start gap-2 min-w-full">{columns}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Tableau et matchs</h2>
      </div>

      {infoMessage && (
        <p className="text-sm text-emerald-300">{infoMessage}</p>
      )}

      {/* Bloc des poules */}
      {poolMatches.length > 0 && (
        <div className="space-y-4">
          {/* Ligne des poules avec les paires (affichées en ligne au-dessus) */}
          <div className="flex flex-wrap gap-4">
            {poolsList.length === 0 ? (
              <p className="text-xs text-gray-400">
                Les poules seront affichées ici une fois générées.
              </p>
            ) : (
              poolsList.map((pool) => (
                <div
                  key={pool.id}
                  className="flex-1 min-w-[260px] max-w-[320px] rounded-md border border-white/10 bg-black/40 px-4 py-3 space-y-1"
                >
                  <p className="text-xs font-semibold text-white/80 mb-1">
                    {pool.label}
                  </p>
                  {pool.teams.map((team, idx) => (
                    <p
                      key={team.registrationId}
                      className="text-[11px] text-white/80"
                    >
                      {idx + 1}. {formatFullName(team.name)}{" "}
                      {team.wins > 0 && (
                        <span className="text-[10px] text-emerald-300">
                          ({team.wins}V)
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Matchs de poules en colonnes, organisés par numéro de match
              (1er match / 2e match sur une ligne, 3e / 4e en dessous, etc.) */}
          <div className="w-full overflow-x-auto pb-2">
            {(() => {
              // Regroupe les matchs de poule par numéro de match (match_order)
              const orders = Array.from(
                new Set(
                  poolMatches
                    .map((m) => m.match_order ?? 0)
                    .filter((n) => n > 0)
                )
              ).sort((a, b) => a - b);

              // Paires de numéros de match : [1,2], [3,4], ...
              const orderPairs: number[][] = [];
              for (let i = 0; i < orders.length; i += 2) {
                orderPairs.push(orders.slice(i, i + 2));
              }

              return orderPairs.map((pair) => (
                <div
                  key={pair.join("-")}
                  className="flex justify-center gap-6 w-full mb-7 last:mb-0"
                >
                  {pair.map((roundNumber) => {
                    const roundMatchesForOrder = poolMatches
                      .filter(
                        (m) =>
                          (m.match_order ?? 0) === roundNumber &&
                          m.round_type === "pool"
                      )
                      .sort((a, b) => {
                        const oa = a.match_order ?? 0;
                        const ob = b.match_order ?? 0;
                        return oa - ob;
                      });

                    if (roundMatchesForOrder.length === 0) return null;

                    return (
                      <div
                        key={roundNumber}
                        className="flex-1 max-w-[420px] space-y-3"
                      >
                        <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide">
                          {roundNumber === 1
                            ? "1er match de poule"
                            : roundNumber === 2
                            ? "2e match de poule"
                            : roundNumber === 3
                            ? "3e match de poule"
                            : `${roundNumber}e match de poule`}
                        </p>
                        {roundMatchesForOrder.map((match) => {
                      const timeLabel = match.scheduled_time
                        ? new Date(match.scheduled_time).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : "";

                      const isCompleted = match.status === "completed";

                      return (
                        <div
                          key={match.id}
                          className={`rounded-md px-3 py-2.5 space-y-1 flex flex-col ${
                            isCompleted
                              ? "border border-emerald-400/80 bg-emerald-500/10"
                              : "border border-white/15 bg-black/50"
                          }`}
                          style={{
                            minHeight: scoreErrors[match.id] ? 'auto' : '104px',
                          }}
                        >
                          <div className="flex items-center justify-between flex-shrink-0">
                            <span className="text-[10px] text-gray-400">
                              {timeLabel || "\u00A0"}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              M{match.match_order ?? "—"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 flex-1 min-h-0">
                    <div className="rounded-sm bg-white/5 px-1 py-0.5">
                      <p className="text-[11px] font-medium text-white leading-tight whitespace-nowrap">
                                {formatFullName(match.team1_name) || "À définir"}
                              </p>
                            </div>
                            <div className="rounded-sm bg-white/5 px-1 py-0.5">
                      <p className="text-[11px] font-medium text-white leading-tight whitespace-nowrap">
                                {match.team2_name ? formatFullName(match.team2_name) :
                                  (match.is_bye ? "Bye" : "À définir")}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {Array.from({
                                length: getVisibleSetSlots(matchFormat),
                              }).map((_, idx) => {
                                const key = `set${idx + 1}` as
                                  | "set1"
                                  | "set2"
                                  | "set3";
                                const isSuperTiebreakSlot =
                                  matchFormat === "B1" && idx === 2;
                                const widthClass = isSuperTiebreakSlot
                                  ? "w-[130px]"
                                  : matchFormat === "B1"
                                  ? idx === 1 ? "w-[59px]" : "w-[58px]"
                                  : "w-[64px]";
                                const alignClass = isSuperTiebreakSlot
                                  ? "text-center"
                                  : "";

                                return (
                                  <Input
                                    key={key}
                                    value={setInputs[match.id]?.[key] ?? ""}
                                    placeholder={getSetPlaceholder(
                                      matchFormat,
                                      idx
                                    )}
                                    className={`bg-black/40 border-white/20 text-white h-7 text-[11px] ${widthClass} ${alignClass}`}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setSetInputs((prev) => ({
                                        ...prev,
                                        [match.id]: {
                                          set1: prev[match.id]?.set1 ?? "",
                                          set2: prev[match.id]?.set2 ?? "",
                                          set3: prev[match.id]?.set3 ?? "",
                                          [key]: value,
                                        },
                                      }));
                                      // Nettoyer l'erreur quand l'utilisateur modifie le score
                                      if (scoreErrors[match.id]) {
                                        setScoreErrors((prev) => {
                                          const updated = { ...prev };
                                          delete updated[match.id];
                                          return updated;
                                        });
                                      }

                                      if (
                                        idx === 0 &&
                                        isValidSetScoreFormat(value) &&
                                        getVisibleSetSlots(matchFormat) > 1
                                      ) {
                                        const nextId = `set-input-${match.id}-2`;
                                        setTimeout(() => {
                                          const nextEl =
                                            document.getElementById(nextId);
                                          if (nextEl) {
                                            (nextEl as HTMLInputElement).focus();
                                          }
                                        }, 0);
                                      }
                                    }}
                                    onBlur={() => handleSetsBlur(match.id)}
                                    id={`set-input-${match.id}-${idx + 1}`}
                                  />
                                );
                              })}
                            </div>
                            {scoreErrors[match.id] && (
                              <p className="text-[10px] text-red-400 mt-1 leading-tight" style={{ maxWidth: '280px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                {scoreErrors[match.id]}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>

          {tournamentType === "official_pools" && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!allPoolsCompleted || calculating}
                title={
                  !allPoolsCompleted
                    ? "Tous les matchs de poule doivent être terminés pour calculer le tableau final."
                    : undefined
                }
                onClick={() => void handleCalculateFromPools()}
              >
                {calculating ? "Calcul en cours..." : "Calculer le tableau final"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bloc du tableau final */}
      {renderFinalBracket()}
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
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
  team1_registration_id: string | null;
  team2_registration_id: string | null;
  team1_name: string | null;
  team2_name: string | null;
  is_bye: boolean;
  status: MatchStatus;
  winner_registration_id: string | null;
  score?: any;
};

type BracketTabProps = {
  tournamentId: string;
  tournamentType: string;
  matchFormat: string;
};

function formatRoundLabel(roundType: string) {
  switch (roundType) {
    case "round_of_64":
      return "1/32";
    case "round_of_32":
      return "1/16";
    case "round_of_16":
      return "1/8";
    case "quarters":
      return "1/4";
    case "semis":
      return "1/2";
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

export default function TournamentBracket({
  tournamentId,
  tournamentType,
  matchFormat,
}: BracketTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setInputs, setSetInputs] = useState<
    Record<string, { set1: string; set2: string; set3: string }>
  >({});
  const [calculating, setCalculating] = useState(false);
  const [advancingFinal, setAdvancingFinal] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

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
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du tableau");
    } finally {
      setLoading(false);
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
    if (format === "B1" && index === 2) {
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
      alert(err.message || "Erreur lors de la mise à jour du score. Vérifie le format du score.");
    }
  }

  function handleSetsBlur(matchId: string) {
    const sets = setInputs[matchId] || { set1: "", set2: "", set3: "" };
    const s1 = sets.set1.trim();
    const s2 = sets.set2.trim();
    const s3 = sets.set3.trim();

    // Règles spécifiques selon le format de match
    if (matchFormat === "B1") {
      // B1 : 2 sets obligatoires + super tie-break obligatoire en cas de 1 set partout
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
          alert(
            "Format B1 : en cas de 1 set partout, le super tie-break est obligatoire."
          );
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
    return (
      <p className="text-sm text-gray-300">
        Aucun match n&apos;a encore été généré. Utilisez le bouton &quot;Générer le tableau&quot; dans l&apos;onglet
        &quot;Infos&quot; une fois les inscriptions clôturées.
      </p>
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

  function renderFinalBracket() {
    const shouldShowFinal =
      knockoutRoundKeys.length > 0 ||
      ((tournamentType === "official_pools" ||
        tournamentType === "pools_triple_draw") &&
        poolMatches.length > 0);

    if (!shouldShowFinal) {
      return null;
    }

    const columns: JSX.Element[] = [];

    // Vérifie s'il existe au moins un tour pour lequel on peut générer le tour suivant côté client
    let canAdvanceFinal = false;
    if (knockoutRoundKeys.length > 0) {
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

    if (knockoutRoundKeys.length > 0) {
      knockoutRoundKeys.forEach((roundKey, index) => {
        const roundMatches = byRound[roundKey].slice().sort((a, b) => {
          const oa = a.match_order ?? 0;
          const ob = b.match_order ?? 0;
          return oa - ob;
        });

        const isFirstRound = index === 0;
        const isLastRound = index === knockoutRoundKeys.length - 1;
        const isFinalRound = roundKey === "final";

        columns.push(
          <div key={roundKey} className="flex-none min-w-[280px]">
            <p className="text-xs font-semibold text-white/70 text-center uppercase tracking-wide">
              {formatRoundLabel(roundKey)}
            </p>
            <div
              className={
                isFirstRound
                  ? "mt-4 space-y-3"
                  : isLastRound
                  ? "mt-12 flex flex-col justify-center gap-8"
                  : "mt-24 flex flex-col gap-[72px]"
              }
            >
              {roundMatches.map((match) => {
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
                  ? match.team1_name
                  : isWinnerTeam2
                  ? match.team2_name
                  : null;
                const loserName = isWinnerTeam1
                  ? match.team2_name
                  : isWinnerTeam2
                  ? match.team1_name
                  : null;

                return (
                  <div
                    key={match.id}
                    className={`rounded-md px-3 py-2.5 space-y-1 min-h-[104px] min-w-[260px] flex flex-col justify-between ${
                      // Bordure "verte" uniquement si un score a vraiment été saisi par le club
                      isFinalRound && isCompleted && hasScore
                        ? "border border-amber-400/90 bg-amber-500/10"
                        : hasScore
                        ? "border border-emerald-400/80 bg-emerald-500/10"
                        : "border border-white/15 bg-black/50"
                    }`}
                  >
                    <div className="flex items-centered justify-between">
                      <span className="text-[10px] text-gray-400">
                        {timeLabel || "\u00A0"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        M{match.match_order ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {match.is_bye ? (
                        <>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {match.team1_name || "À définir"}
                            </p>
                          </div>
                          <p className="text-[10px] text-emerald-300 italic">
                            Directement qualifié pour le tour suivant
                          </p>
                        </>
                      ) : isFinalRound && isCompleted && winnerName && loserName ? (
                        <>
                          <div className="rounded-sm bg-amber-500/20 px-1 py-0.5">
                            <p className="text-[11px] font-semibold text-amber-100 leading-tight break-words">
                              {winnerName}
                              <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-200/80">
                                (Vainqueurs)
                              </span>
                            </p>
                          </div>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white/80 leading-tight break-words">
                              {loserName}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {match.team1_name || "À définir"}
                            </p>
                          </div>
                          <div className="rounded-sm bg-white/5 px-1 py-0.5">
                            <p className="text-[11px] font-medium text-white leading-tight break-words">
                              {match.team2_name ||
                                (match.is_bye ? "Bye" : "À définir")}
                            </p>
                          </div>
                        </>
                      )}
                      {!match.is_bye && (
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
                              ? "w-[136px]"
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
                      )}
                    </div>
                  </div>
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-semibold text-white">Tableau final</h3>
          {canAdvanceFinal && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={advancingFinal}
              onClick={() => void handleAdvanceFinalRound()}
            >
              {advancingFinal
                ? "Calcul en cours..."
                : "Afficher le tour suivant"}
            </Button>
          )}
        </div>

        <div className="w-full overflow-x-auto pb-2">
          <div className="flex justify-start gap-2 min-w-full">{columns}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Tableau et matchs</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchMatches()}
        >
          Rafraîchir
        </Button>
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
                      {idx + 1}. {team.name}{" "}
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
                          className={`rounded-md px-3 py-2.5 space-y-1 min-h-[104px] flex flex-col justify-between ${
                            isCompleted
                              ? "border border-emerald-400/80 bg-emerald-500/10"
                              : "border border-white/15 bg-black/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400">
                              {timeLabel || "\u00A0"}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              M{match.match_order ?? "—"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                    <div className="rounded-sm bg-white/5 px-1 py-0.5">
                      <p className="text-[11px] font-medium text-white leading-tight whitespace-nowrap">
                                {match.team1_name || "À définir"}
                              </p>
                            </div>
                            <div className="rounded-sm bg-white/5 px-1 py-0.5">
                      <p className="text-[11px] font-medium text-white leading-tight whitespace-nowrap">
                                {match.team2_name ||
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
                                  ? "w-[136px]"
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

          {(tournamentType === "official_pools" ||
            tournamentType === "pools_triple_draw") && (
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


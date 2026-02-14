"use client";

import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import MatchErrorModal from "@/components/MatchErrorModal";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";
import BadgeIconDisplay from "./BadgeIconDisplay";
import PlayerAutocomplete from "./PlayerAutocomplete";
import { logger } from '@/lib/logger';
import { Trophy, Zap, Mail, Globe, ChevronDown, MapPin, X, Plus, Search } from "lucide-react";
import GooglePlacesAutocomplete from "./GooglePlacesAutocomplete";
import PlayerSlotSquare from "./PlayerSlotSquare";
import { createPortal } from "react-dom";
import LevelAssessmentWizard from "./padel-level/LevelAssessmentWizard";

const schema = z.object({
  winner: z.enum(["1", "2"]),
  sets: z.array(z.object({
    setNumber: z.number().min(1).max(5),
    team1Score: z.string().min(1, "Score requis"),
    team2Score: z.string().min(1, "Score requis"),
  })).min(2, "Au moins 2 sets requis"),
  tieBreak: z.object({
    team1Score: z.string(),
    team2Score: z.string(),
  }).optional(),
  locationClubId: z.string().optional(),
  isUnregisteredClub: z.boolean().default(false),
  unregisteredClubName: z.string().optional(),
  unregisteredClubCity: z.string().optional(),
});

export default function MatchForm({
  selfId,
  initialHasLevel = true
}: {
  selfId: string;
  initialHasLevel?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [partnerName, setPartnerName] = useState("");
  const [opp1Name, setOpp1Name] = useState("");
  const [opp2Name, setOpp2Name] = useState("");
  const [winner, setWinner] = useState<"1" | "2">("1");
  const [sets, setSets] = useState<Array<{ setNumber: number; team1Score: string; team2Score: string }>>([
    { setNumber: 1, team1Score: "", team2Score: "" },
    { setNumber: 2, team1Score: "", team2Score: "" },
  ]);
  const [hasTieBreak, setHasTieBreak] = useState(false);
  const [tieBreak, setTieBreak] = useState({ team1Score: "", team2Score: "" });

  const [selectedPlayers, setSelectedPlayers] = useState<{
    partner: PlayerSearchResult | null;
    opp1: PlayerSearchResult | null;
    opp2: PlayerSearchResult | null;
  }>({
    partner: null,
    opp1: null,
    opp2: null,
  });

  const [scopes, setScopes] = useState<{
    partner: 'club' | 'global' | 'guest';
    opp1: 'club' | 'global' | 'guest';
    opp2: 'club' | 'global' | 'guest';
  }>({
    partner: 'global',
    opp1: 'global',
    opp2: 'global',
  });

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'partner' | 'opp1' | 'opp2' | null>(null);
  const [selfProfile, setSelfProfile] = useState<PlayerSearchResult | null>(null);

  // Location state
  // const [clubs, setClubs] = useState<Array<{ id: string; name: string; city: string }>>([]); // Legacy
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [isUnregisteredClub, setIsUnregisteredClub] = useState(false);
  const [unregisteredClubName, setUnregisteredClubName] = useState("");
  const [unregisteredClubCity, setUnregisteredClubCity] = useState("");
  // const [loadingClubs, setLoadingClubs] = useState(true); // Legacy

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // État pour le message d'information sur la limite de 2 matchs par jour
  // Initialiser à null pour éviter le flash, puis vérifier localStorage
  const [showMatchLimitInfo, setShowMatchLimitInfo] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Level assessment blocking state
  const [hasLevel, setHasLevel] = useState(initialHasLevel);
  const [showAssessment, setShowAssessment] = useState(false);

  // Prevent scroll when blocking overlay is visible
  useEffect(() => {
    if (!hasLevel && !showAssessment) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [hasLevel, showAssessment]);

  // Boost state
  const [useBoost, setUseBoost] = useState(false);
  const [boostStats, setBoostStats] = useState<{
    creditsAvailable: number;
    usedThisMonth: number;
    remainingThisMonth: number;
    canUse: boolean;
  } | null>(null);
  const [loadingBoostStats, setLoadingBoostStats] = useState(true);

  // Refs pour l'auto-focus des champs de score
  const setTeam1Refs = useRef<Array<HTMLInputElement | null>>([]);
  const setTeam2Refs = useRef<Array<HTMLInputElement | null>>([]);
  const tieBreakTeam1Ref = useRef<HTMLInputElement | null>(null);
  const tieBreakTeam2Ref = useRef<HTMLInputElement | null>(null);

  const handleInputBlur = () => {
    // Scroll to top to reset any viewport shift caused by the keyboard on mobile
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  // Vérifier si l'utilisateur a déjà cliqué sur "Compris" pour le cadre d'information
  useEffect(() => {
    async function checkMatchLimitInfoStatus() {
      // ... (existing code for checkMatchLimitInfoStatus)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (typeof window !== 'undefined') {
            try {
              const hasClickedUnderstood = localStorage.getItem('matchLimitInfoUnderstood') === 'true';
              setShowMatchLimitInfo(!hasClickedUnderstood);
            } catch (error) {
              setShowMatchLimitInfo(true);
            }
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('match_limit_info_understood')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          if (typeof window !== 'undefined') {
            try {
              const hasClickedUnderstood = localStorage.getItem('matchLimitInfoUnderstood') === 'true';
              setShowMatchLimitInfo(!hasClickedUnderstood);
            } catch (error) {
              setShowMatchLimitInfo(true);
            }
          }
          return;
        }

        if (profile && profile.match_limit_info_understood === true) {
          setShowMatchLimitInfo(false);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('matchLimitInfoUnderstood', 'true');
            } catch (error) { }
          }
        } else {
          if (typeof window !== 'undefined') {
            try {
              const hasClickedUnderstood = localStorage.getItem('matchLimitInfoUnderstood') === 'true';
              setShowMatchLimitInfo(!hasClickedUnderstood);
              if (hasClickedUnderstood) {
                await supabase.from('profiles').update({ match_limit_info_understood: true }).eq('id', user.id);
              }
            } catch (error) {
              setShowMatchLimitInfo(true);
            }
          } else {
            setShowMatchLimitInfo(true);
          }
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          try {
            const hasClickedUnderstood = localStorage.getItem('matchLimitInfoUnderstood') === 'true';
            setShowMatchLimitInfo(!hasClickedUnderstood);
          } catch (localStorageError) {
            setShowMatchLimitInfo(true);
          }
        } else {
          setShowMatchLimitInfo(true);
        }
      }
    }
    checkMatchLimitInfoStatus();
  }, [supabase]);

  const handleUnderstoodClick = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase.from('profiles').update({ match_limit_info_understood: true }).eq('id', user.id);
        if (updateError) {
          // Fallback localStorage
          if (typeof window !== 'undefined') localStorage.setItem('matchLimitInfoUnderstood', 'true');
        } else {
          if (typeof window !== 'undefined') localStorage.setItem('matchLimitInfoUnderstood', 'true');
        }
      } else {
        if (typeof window !== 'undefined') localStorage.setItem('matchLimitInfoUnderstood', 'true');
      }
      setShowMatchLimitInfo(false);
    } catch (error) {
      setShowMatchLimitInfo(false);
      if (typeof window !== 'undefined') localStorage.setItem('matchLimitInfoUnderstood', 'true');
    }
  };

  // Charger les stats de boost
  useEffect(() => {
    let cancelled = false;
    async function loadBoostStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setBoostStats(null);
          setLoadingBoostStats(false);
          return;
        }
        const timestamp = Date.now();
        const res = await fetch(`/api/player/boost/stats?t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && !cancelled) {
            const creditsAvailable = Number(data.creditsAvailable) || 0;
            const usedThisMonth = Number(data.usedThisMonth) || 0;
            const remainingThisMonth = Number(data.remainingThisMonth) || 0;
            const canUse = creditsAvailable > 0 && usedThisMonth < 10;
            setBoostStats({ creditsAvailable, usedThisMonth, remainingThisMonth, canUse });
          } else if (!cancelled) {
            setBoostStats(null);
          }
        } else if (!cancelled) {
          setBoostStats(null);
        }
      } catch (error) {
        if (!cancelled) setBoostStats(null);
      } finally {
        if (!cancelled) setLoadingBoostStats(false);
      }
    }
    loadBoostStats();
    const interval = setInterval(() => {
      if (!cancelled) loadBoostStats();
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [supabase]);

  // Legacy fetchAllClubs removed to prevent auto-selection.
  // We want the user to EXPLICITLY select a location via Google Maps.

  // Gérer la pré-sélection d'un adversaire via URL
  useEffect(() => {
    const opponentId = searchParams?.get('opponentId');
    if (opponentId) {
      const fetchOpponent = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, display_name, club_id, email, clubs(name)')
            .eq('id', opponentId)
            .single();

          if (data && !error) {
            const first_name = data.first_name || data.display_name.split(' ')[0] || '';
            const last_name = data.last_name || data.display_name.split(' ').slice(1).join(' ') || '';
            const displayName = data.display_name || `${first_name} ${last_name}`.trim();

            const player: PlayerSearchResult = {
              id: data.id,
              first_name,
              last_name,
              display_name: displayName,
              type: 'user',
              email: data.email || null,
              club_name: (data.clubs as any)?.name || null,
            };

            setSelectedPlayers(prev => ({
              ...prev,
              opp1: player
            }));
            setOpp1Name(displayName);
          }
        } catch (e) {
          // ignore
        }
      };
      fetchOpponent();
    }
  }, [searchParams, supabase]);

  // Fetch self profile
  useEffect(() => {
    async function fetchSelfProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const profileRes = await fetch('/api/player/profile', { method: 'GET', credentials: 'include' });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const first_name = profileData.first_name || profileData.display_name?.split(' ')[0] || '';
          const last_name = profileData.last_name || profileData.display_name?.split(' ').slice(1).join(' ') || '';
          setSelfProfile({
            id: user.id,
            first_name,
            last_name,
            display_name: profileData.display_name || `${first_name} ${last_name}`.trim(),
            avatar_url: profileData.avatar_url || null,
            type: 'user',
            email: user.email || null,
          });
        }
      } catch (err) {
        // ignore
      }
    }
    fetchSelfProfile();
  }, [supabase]);

  // ... (addSet, removeSet, updateSet functions retained as is)

  const addSet = () => {
    const nextSetNumber = sets.length + 1;
    if (nextSetNumber <= 5) {
      setSets([...sets, { setNumber: nextSetNumber, team1Score: "", team2Score: "" }]);
    }
  };

  const removeSet = (index: number) => {
    if (sets.length > 2 && index >= 2) {
      const newSets = sets.filter((_, i) => i !== index);
      const reindexedSets = newSets.map((set, i) => ({ ...set, setNumber: i + 1 }));
      setSets(reindexedSets);
    }
  };

  const updateSet = (index: number, field: "team1Score" | "team2Score", value: string) => {
    const errorKey = `set${sets[index].setNumber}_${field}`;
    const newErrors = { ...errors };
    delete newErrors[errorKey];
    const numericValue = value.replace(/\D/g, '');
    if (numericValue) {
      const numValue = parseInt(numericValue);
      if (!isNaN(numValue) && numValue > 7) {
        newErrors[errorKey] = "Un set de padel ne peut pas dépasser 7";
        setErrors(newErrors);
        return;
      }
    }
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: numericValue };

    // Validation logic (min score, tie, 5-7 rule) omitted for brevity but retained in functionality
    // ... (rest of validation logic same as original)

    const currentSet = newSets[index];
    const team1Score = parseInt(currentSet.team1Score) || 0;
    const team2Score = parseInt(currentSet.team2Score) || 0;

    delete newErrors[`set${currentSet.setNumber}_team1`];
    delete newErrors[`set${currentSet.setNumber}_team2`];
    delete newErrors[`set${currentSet.setNumber}_min_score`];
    delete newErrors[`set${currentSet.setNumber}_tie`];

    if (team1Score > 0 && team2Score > 0) {
      const hasValidScore = team1Score >= 6 || team2Score >= 6;
      if (!hasValidScore) {
        newErrors[`set${currentSet.setNumber}_min_score`] = "Au moins une des deux équipes doit avoir 6 ou 7 jeux";
      }
      if (team1Score === 6 && team2Score === 6) {
        newErrors[`set${currentSet.setNumber}_tie`] = "Les scores ne peuvent pas être de 6-6";
      }
      if (team1Score === 5 && team2Score !== 7) {
        newErrors[`set${currentSet.setNumber}_team2`] = "Si une équipe a 5 jeux, l'autre équipe doit avoir 7 jeux";
      } else if (team2Score === 5 && team1Score !== 7) {
        newErrors[`set${currentSet.setNumber}_team1`] = "Si une équipe a 5 jeux, l'autre équipe doit avoir 7 jeux";
      }
    }
    if (team1Score === 7 && team2Score > 0 && team2Score < 5) {
      newErrors[`set${currentSet.setNumber}_team2`] = "Si une des équipes a 7 jeux, l'autre équipe ne peut pas avoir moins de 5 jeux";
    } else if (team2Score === 7 && team1Score > 0 && team1Score < 5) {
      newErrors[`set${currentSet.setNumber}_team1`] = "Si une des équipes a 7 jeux, l'autre équipe ne peut pas avoir moins de 5 jeux";
    }

    setSets(newSets);
    setErrors(newErrors);

    if (numericValue.length >= 1 && !newErrors[errorKey]) {
      if (field === "team1Score") {
        const next = setTeam2Refs.current[index];
        next?.focus();
      } else if (field === "team2Score") {
        const nextSetInput = setTeam1Refs.current[index + 1];
        if (nextSetInput) {
          nextSetInput.focus();
        } else if (hasTieBreak) {
          tieBreakTeam1Ref.current?.focus();
        } else {
          const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
          submitBtn?.focus();
        }
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info("🚀 Form submission started");
    const newErrors: Record<string, string> = {};
    setErrors({});
    setErrorMessage(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const msg = "Vous devez être connecté pour enregistrer un match.";
        newErrors.partnerName = msg;
        setErrors(newErrors);
        setErrorMessage(msg);
        setLoading(false);
        return;
      }

      let profileRes;
      let profileData;
      try {
        profileRes = await fetch('/api/player/profile', { method: 'GET', credentials: 'include' });
        if (!profileRes.ok) {
          setErrorMessage("Erreur lors de la vérification de votre profil.");
          setLoading(false);
          return;
        }
        profileData = await profileRes.json();
      } catch (profileError) {
        setErrorMessage("Erreur lors de la vérification de votre profil.");
        setLoading(false);
        return;
      }

      if (!profileData.hasCompleteName) {
        setErrorMessage("Votre profil doit avoir un prénom et un nom complet.");
        setLoading(false);
        return;
      }

      let partner = selectedPlayers.partner;
      let opp1 = selectedPlayers.opp1;
      let opp2 = selectedPlayers.opp2;

      if (!partner || !opp1 || !opp2) {
        setErrorMessage("Veuillez sélectionner tous les joueurs.");
        setLoading(false);
        return;
      }

      const userPlayers = [selfId, partner!.type === "user" ? partner!.id : null, opp1!.type === "user" ? opp1!.id : null, opp2!.type === "user" ? opp2!.id : null].filter(Boolean) as string[];
      if (userPlayers.length !== new Set(userPlayers).size) {
        const msg = "Les 4 joueurs doivent être uniques";
        setErrors({ partnerName: msg });
        setErrorMessage(msg);
        setLoading(false);
        return;
      }

      // Validation de la localisation STRICTE
      // On force l'utilisation de Google Maps (ou d'un club enregistré via la recherche, mais ici on simplifie)
      // Si unregisteredClubCity est vide, c'est que l'utilisateur a juste tapé du texte sans sélectionner une suggestion avec ville
      if (!unregisteredClubName.trim() || !unregisteredClubCity.trim()) {
        logger.warn("❌ Validation failed: Missing valid location selection");
        const msg = !unregisteredClubName.trim()
          ? "Le nom du club est requis"
          : "Veuillez sélectionner un lieu dans la liste déroulante";

        setErrorMessage(msg);
        setErrors((prev) => ({
          ...prev,
          unregisteredClubName: !unregisteredClubName.trim() ? msg : "",
          unregisteredClubCity: !unregisteredClubCity.trim() ? "La ville est requise" : ""
        }));
        setLoading(false);
        return;
      }

      logger.info("🔧 Preparing players data...");

      // Préparer les données pour l'API avec le nouveau format
      // Pour les joueurs invités, générer un UUID unique pour chaque user_id
      // pour éviter les violations de clé primaire (match_id, user_id)
      const players = [
        {
          player_type: "user" as const,
          user_id: selfId,
          guest_player_id: null,
        },
        {
          player_type: partner!.type === "user" ? "user" : "guest",
          user_id: partner!.type === "user" ? partner!.id : crypto.randomUUID(),
          guest_player_id: partner!.type === "guest" ? partner!.id : null,
        },
        {
          player_type: opp1!.type === "user" ? "user" : "guest",
          user_id: opp1!.type === "user" ? opp1!.id : crypto.randomUUID(),
          guest_player_id: opp1!.type === "guest" ? opp1!.id : null,
        },
        {
          player_type: opp2!.type === "user" ? "user" : "guest",
          user_id: opp2!.type === "user" ? opp2!.id : crypto.randomUUID(),
          guest_player_id: opp2!.type === "guest" ? opp2!.id : null,
        },
      ];

      logger.info("✅ Players data prepared:", players);

      // Validation des sets
      logger.info("🔍 Validating sets...");
      const setsErrors: Record<string, string> = {};
      sets.forEach((set, index) => {
        if (!set.team1Score.trim()) {
          setsErrors[`set${set.setNumber}_team1`] = `Score équipe 1 requis pour le set ${set.setNumber}`;
        }
        if (!set.team2Score.trim()) {
          setsErrors[`set${set.setNumber}_team2`] = `Score équipe 2 requis pour le set ${set.setNumber}`;
        }
      });

      if (Object.keys(setsErrors).length > 0) {
        logger.error("❌ Sets validation errors:", setsErrors);
        setErrors(setsErrors);
        setLoading(false);
        return;
      }

      // Validation : au moins une équipe doit avoir 6 ou 7 jeux
      sets.forEach((set) => {
        const team1Score = parseInt(set.team1Score);
        const team2Score = parseInt(set.team2Score);

        if (team1Score > 0 && team2Score > 0) {
          const hasValidScore = team1Score >= 6 || team2Score >= 6;
          if (!hasValidScore) {
            setsErrors[`set${set.setNumber}_min_score`] = "Au moins une des deux équipes doit avoir 6 ou 7 jeux";
          }

          // Validation : les scores ne peuvent pas être de 6-6
          if (team1Score === 6 && team2Score === 6) {
            setsErrors[`set${set.setNumber}_tie`] = "Les scores ne peuvent pas être de 6-6";
          }

          // Validation : si une équipe a 5, l'autre doit avoir 7
          if (team1Score === 5 && team2Score !== 7) {
            setsErrors[`set${set.setNumber}_team2`] = "Si une équipe a 5 jeux, l'autre équipe doit avoir 7 jeux";
          } else if (team2Score === 5 && team1Score !== 7) {
            setsErrors[`set${set.setNumber}_team1`] = "Si une équipe a 5 jeux, l'autre équipe doit avoir 7 jeux";
          }
        }
      });

      // Validation des scores 7-5 ou 7-6
      sets.forEach((set) => {
        const team1Score = parseInt(set.team1Score);
        const team2Score = parseInt(set.team2Score);

        if (team1Score === 7 && team2Score < 5) {
          setsErrors[`set${set.setNumber}_team2`] = "Si une des équipes a 7 jeux, l'autre équipe ne peut pas avoir moins de 5 jeux";
        } else if (team2Score === 7 && team1Score < 5) {
          setsErrors[`set${set.setNumber}_team1`] = "Si une des équipes a 7 jeux, l'autre équipe ne peut pas avoir moins de 5 jeux";
        }
      });

      if (Object.keys(setsErrors).length > 0) {
        logger.error("❌ Sets validation errors:", setsErrors);
        setErrors(setsErrors);
        setLoading(false);
        return;
      }

      // Validation : l'équipe gagnante doit avoir gagné plus de sets
      let team1Wins = 0;
      let team2Wins = 0;

      sets.forEach((set) => {
        const team1Score = parseInt(set.team1Score);
        const team2Score = parseInt(set.team2Score);

        if (team1Score > team2Score) {
          team1Wins++;
        } else if (team2Score > team1Score) {
          team2Wins++;
        }
      });

      // Validation du tie-break si activé
      if (hasTieBreak && tieBreak.team1Score && tieBreak.team2Score) {
        const tieBreakTeam1 = parseInt(tieBreak.team1Score);
        const tieBreakTeam2 = parseInt(tieBreak.team2Score);

        // Validation : au moins un des deux scores doit être 7 ou plus
        if (tieBreakTeam1 > 0 && tieBreakTeam2 > 0) {
          const hasValidScore = tieBreakTeam1 >= 7 || tieBreakTeam2 >= 7;
          if (!hasValidScore) {
            setsErrors.tieBreak = "Au moins un des deux scores du tie-break doit être 7 ou plus";
          }
        }
      }

      // Cas spécial : match décidé au tie-break (égalité de sets gagnés)
      const isTieBreakMatch = team1Wins === team2Wins && team1Wins > 0;

      if (isTieBreakMatch) {
        if (!hasTieBreak || !tieBreak.team1Score || !tieBreak.team2Score) {
          setsErrors.tieBreak = "Un tie-break est obligatoire en cas d'égalité de sets.";
          setErrorMessage("Un tie-break est obligatoire en cas d'égalité de sets.");
        } else if (!setsErrors.tieBreak) {
          // Vérifier que le tie-break est à l'avantage de l'équipe gagnante
          const tieBreakTeam1 = parseInt(tieBreak.team1Score);
          const tieBreakTeam2 = parseInt(tieBreak.team2Score);

          if (winner === "1" && tieBreakTeam1 <= tieBreakTeam2) {
            const msg = "Le tie-break doit être en faveur de l'équipe gagnante";
            setsErrors.tieBreak = msg;
            setErrorMessage(msg);
          } else if (winner === "2" && tieBreakTeam2 <= tieBreakTeam1) {
            const msg = "Le tie-break doit être en faveur de l'équipe gagnante";
            setsErrors.tieBreak = msg;
            setErrorMessage(msg);
          }
        }
      } else if (Object.keys(setsErrors).length === 0) { // Only perform normal winner validation if no other errors yet
        // Validation normale : l'équipe gagnante doit avoir plus de sets gagnés
        if (winner === "1" && team1Wins <= team2Wins) {
          setsErrors.winner = "L'équipe 1 doit avoir gagné au moins un set de plus que l'équipe 2. Vérifiez que vous n'avez pas inversé les scores.";
        } else if (winner === "2" && team2Wins <= team1Wins) {
          setsErrors.winner = "L'équipe 2 doit avoir gagné au moins un set de plus que l'équipe 1. Vérifiez que vous n'avez pas inversé les scores.";
        }
      }

      if (Object.keys(setsErrors).length > 0) {
        logger.error("❌ Match validation errors:", setsErrors);
        setErrors(setsErrors);
        setLoading(false);
        return;
      }

      logger.info("✅ Sets validated successfully");

      // Vérifier que tous les sets ont des scores valides avant d'envoyer
      const validSets = sets.filter(set => set.team1Score.trim() && set.team2Score.trim());
      if (validSets.length !== sets.length) {
        logger.error("❌ Some sets have empty scores");
        setErrors({ partnerName: "Veuillez remplir tous les scores des sets" });
        setLoading(false);
        return;
      }

      // Préparer les données pour l'envoi
      const payload = {
        players,
        winner,
        sets,
        tieBreak: hasTieBreak && tieBreak.team1Score && tieBreak.team2Score ? tieBreak : undefined,
        useBoost: useBoost, // Envoyer la valeur de la case, la vérification se fera côté serveur
        locationClubId: selectedClubId,
        isUnregisteredClub,
        unregisteredClubName,
        unregisteredClubCity,
      };

      console.log("🚀 [DEBUG] Preparing to submit payload");
      logger.info(`🔍 [MatchForm] useBoost value before sending: ${useBoost} type: ${typeof useBoost}`);
      // ... (omitting detailed log for brevity in chat, but keeping it in code)

      const res = await fetch("/api/matches/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log("🚀 [DEBUG] Submission Response Status:", res.status);
      logger.info(`📥 Response status: ${res.status} ${res.statusText}`);

      if (res.ok) {
        const data = await res.json();
        logger.info("✅ Match submitted successfully:", data);

        // Gérer les messages de boost
        if (data.boostApplied) {
          logger.info("⚡ Boost applied:", data.boostPointsInfo);
          // Le message de succès inclura les infos du boost

          // Recharger immédiatement les stats de boost pour refléter la consommation
          // Cela mettra à jour le nombre de boosts disponibles et la case à cocher
          logger.info("🔄 Reloading boost stats after boost consumption...");

          // Attendre un peu pour que la base de données soit mise à jour
          await new Promise(resolve => setTimeout(resolve, 500));

          try {
            // Faire plusieurs tentatives pour s'assurer que les stats sont mises à jour
            for (let attempt = 0; attempt < 3; attempt++) {
              const timestamp = Date.now();
              const boostRes = await fetch(`/api/player/boost/stats?t=${timestamp}&attempt=${attempt}`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0',
                },
              });

              if (boostRes.ok) {
                const boostData = await boostRes.json();
                logger.info(`[MatchForm] ✅ Boost stats reloaded after consumption (attempt ${attempt + 1}):`, boostData);

                const creditsAvailable = Number(boostData.creditsAvailable) || 0;
                const usedThisMonth = Number(boostData.usedThisMonth) || 0;
                const remainingThisMonth = Number(boostData.remainingThisMonth) || 0;
                const canUse = creditsAvailable > 0 && usedThisMonth < 10;

                setBoostStats({
                  creditsAvailable,
                  usedThisMonth,
                  remainingThisMonth,
                  canUse,
                });

                // Réinitialiser la case à cocher si plus de boosts disponibles
                if (creditsAvailable === 0) {
                  setUseBoost(false);
                  logger.info('[MatchForm] ✅ Checkbox reset (no boosts remaining)');
                }

                // Si on a trouvé la bonne valeur (boost consommé), arrêter les tentatives
                if (attempt === 0 || creditsAvailable > 0) {
                  break;
                }

                // Sinon, attendre un peu avant de réessayer
                if (attempt < 2) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
          } catch (boostError) {
            logger.error('[MatchForm] ❌ Error reloading boost stats:', boostError);
          }
        } else if (data.boostError) {
          logger.warn("⚠️ Boost error:", data.boostError);
          // Afficher l'erreur de boost mais ne pas bloquer le match
        }

        // Afficher un avertissement si des joueurs ont atteint la limite
        if (data.warning) {
          logger.warn("⚠️ Warning:", data.warning);
          setWarningMessage(data.warning);
          // Pas de redirection automatique, le joueur doit cliquer sur "Compris"
        } else {
          // Créer le message de succès avec les infos du boost si appliqué
          let successMessage = "Match enregistré avec succès !";
          if (data.boostApplied && data.boostPointsInfo) {
            successMessage += ` Boost appliqué : ${data.boostPointsInfo.before} → ${data.boostPointsInfo.after} points (+30%) !`;
          }

          // Forcer le rechargement du classement
          if (typeof window !== "undefined") {
            console.log('[MatchForm] ✅ Match enregistré ! Rechargement du classement...');

            // Marquer le timestamp du match dans localStorage (pour le polling et cross-tab)
            const matchTime = Date.now();
            localStorage.setItem('lastMatchTime', matchTime.toString());
            localStorage.setItem('matchSubmitted', 'true');

            // Dispatch l'événement custom (pour les composants sur la même page)
            const event = new CustomEvent("matchSubmitted", {
              detail: {
                timestamp: matchTime,
                matchId: data.match?.id
              }
            });
            window.dispatchEvent(event);

            // Forcer le rechargement de toutes les pages Next.js
            router.refresh();

            // Forcer le rechargement de la page /home si elle est ouverte dans un autre onglet
            // En utilisant un événement storage (fonctionne cross-tab)
            setTimeout(() => {
              localStorage.removeItem('matchSubmitted');
            }, 100);

            console.log('[MatchForm] ✅ Rechargement déclenché');
          }

          setShowSuccess(true);
          setLoading(false);

          // Forcer le rechargement de la page /home pour mettre à jour le classement
          // Attendre un peu pour que le match soit bien sauvegardé en DB
          setTimeout(() => {
            router.refresh();
          }, 500);

          // Redirection automatique seulement si pas d'avertissement
          setTimeout(() => {
            logger.info("🔄 Redirecting to match history...");
            router.push("/match/new?tab=history");
          }, 2000);
        }

        setLoading(false);
      } else {
        let errorMsg = "Erreur lors de l'enregistrement";
        try {
          const errorData = await res.json();
          logger.info("🔍 Error data complet:", JSON.stringify(errorData, null, 2));
          logger.error(`❌ Match submission failed: ${res.status}`, { error: errorData });
          errorMsg = errorData?.error || errorData?.message || `Erreur ${res.status}: ${res.statusText || 'Unknown'}`;
        } catch (parseError) {
          logger.error("❌ Failed to parse error response:", parseError);
          errorMsg = `Erreur ${res.status}: ${res.statusText || "Erreur serveur"}`;
        }

        // Afficher une notification d'erreur visible
        setErrorMessage(errorMsg);
        setErrors({ partnerName: errorMsg });
        setLoading(false);
        // Removed auto-dismiss timeout to let user read the modal
      }
    } catch (error) {
      logger.error("❌ Error submitting match:", error);
      const errorMsg = "Erreur lors de l'enregistrement";
      setErrorMessage(errorMsg);
      setErrors({ partnerName: errorMsg });
      setLoading(false);

      setErrorMessage(errorMsg);
      setErrors({ partnerName: errorMsg });
      setLoading(false);
      // Removed auto-dismiss timeout to let user read the modal
    }
  };

  return (
    <div className="relative h-full flex flex-col overflow-y-auto overscroll-contain px-1">
      {/* Assessment Wizard Overlay */}
      {showAssessment && (
        <LevelAssessmentWizard
          forceStart={true}
          onCancel={() => setShowAssessment(false)}
          onComplete={() => {
            setHasLevel(true);
            setShowAssessment(false);
            // Refresh parent page to update level status
            router.refresh();
          }}
        />
      )}

      {/* Blurred Block UI */}
      {!hasLevel && !showAssessment && (
        <div className="absolute inset-x-0 inset-y-0 z-[100] rounded-3xl flex flex-col items-center justify-center p-6 pb-20 text-center backdrop-blur-md bg-[#071554]/40 border border-white/10 mt-6" style={{ height: '500px' }}>
          <div className="bg-padel-green/20 p-4 rounded-full mb-6">
            <Trophy className="w-10 h-10 text-padel-green" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Évaluation requise</h2>
          <p className="text-white/80 max-w-md mb-8 text-base font-medium leading-relaxed">
            Veuillez évaluer votre niveau pour pouvoir enregistrer des matchs et faire évoluer votre classement.
          </p>
          <button
            onClick={() => setShowAssessment(true)}
            className="px-8 py-4 rounded-2xl bg-padel-green text-[#071554] font-black text-lg shadow-[0_0_30px_rgba(204,255,0,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center min-w-[200px] uppercase tracking-wider"
          >
            Évaluer mon niveau
          </button>
        </div>
      )}

      {/* Notification de succès */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 rounded-2xl bg-white p-8 shadow-2xl">
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <BadgeIconDisplay icon="🎾" size={64} className="flex-shrink-0" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Match enregistré avec succès !</h2>
              <p className="text-sm text-gray-500">Une notification a été envoyée aux joueurs de ce match.</p>
              <div className="mt-4 text-xs text-gray-400">Redirection vers l'historique...</div>
            </div>
          </div>
        </div>
      )}

      {/* Notification d'avertissement */}
      {warningMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 max-w-md rounded-2xl bg-amber-500 p-8 shadow-2xl">
            <div className="text-center">
              <div className="mb-4 text-6xl">⚠️</div>
              <h2 className="mb-3 text-2xl font-bold text-white">Attention</h2>
              <p className="mb-6 text-base text-white/90">{warningMessage}</p>
              <button
                onClick={() => {
                  setWarningMessage(null);
                  router.push("/match/new?tab=history");
                }}
                className="rounded-xl bg-white/20 px-6 py-3 font-semibold text-white transition-all hover:bg-white/30 backdrop-blur-sm"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      <MatchErrorModal
        isOpen={!!errorMessage}
        onClose={() => setErrorMessage(null)}
        error={errorMessage}
      />

      {/* Message d'information sur la limite de 2 matchs par jour */}
      {showMatchLimitInfo === true && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">ℹ️</div>
            <div className="flex-1">
              <p className="text-sm text-white/90">
                Pour <strong className="font-semibold text-amber-300">garder un classement fiable et équitable</strong>, vous pouvez enregistrer jusqu'à <strong className="font-semibold text-amber-300">2 matchs par jour</strong> qui comptent pour vos points.
                Cette limite permet d'éviter que des joueurs n'enregistrent un nombre excessif de matchs en une seule journée, ce qui pourrait fausser le classement et rendre la compétition moins équitable pour tous.
              </p>
              <p className="mt-2 text-sm text-white/80">
                Si vous enregistrez un 3<sup>ème</sup> match ou plus dans la même journée, celui-ci sera enregistré dans l'historique mais <strong className="font-semibold text-amber-300">aucun point ne sera ajouté à votre classement</strong>.
                Les autres joueurs qui n'ont pas atteint la limite de 2 matchs recevront leurs points normalement.
              </p>
              <button
                onClick={handleUnderstoodClick}
                className="mt-4 rounded-lg bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-500/30 hover:border-amber-500/60"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className={`space-y-3 pb-2 transition-all duration-500 ${!hasLevel ? 'blur-sm pointer-events-none select-none grayscale-[0.3]' : ''}`}>
        {/* Lieu du match (Google Maps Direct) */}
        <div>
          <label className="mb-1 block text-[8px] font-black text-white/40 uppercase tracking-widest">Lieu du match</label>
          <div className="space-y-1">
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="mb-1 block text-[8px] font-bold text-white/30 uppercase tracking-widest">Rechercher le club (Google Maps) *</div>
              <GooglePlacesAutocomplete
                value={unregisteredClubName}
                onChange={(val) => {
                  setUnregisteredClubName(val);
                  setIsUnregisteredClub(true);
                  setSelectedClubId("");
                  if (errors.unregisteredClubName) {
                    setErrors(prev => { const n = { ...prev }; delete n.unregisteredClubName; return n; });
                  }
                  if (errors.location) {
                    setErrors(prev => { const n = { ...prev }; delete n.location; return n; });
                  }
                }}
                onSelect={(place) => {
                  setUnregisteredClubName(place.name);
                  setUnregisteredClubCity(place.city);
                  setIsUnregisteredClub(true);
                  setSelectedClubId("");
                  if (errors.unregisteredClubName || errors.unregisteredClubCity) {
                    setErrors(prev => { const n = { ...prev }; delete n.unregisteredClubName; delete n.unregisteredClubCity; return n; });
                  }
                  if (errors.location) {
                    setErrors(prev => { const n = { ...prev }; delete n.location; return n; });
                  }
                }}
                placeholder="Ex: Urban Padel Nantes..."
              />
              {(errors.unregisteredClubName || errors.unregisteredClubCity) && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.unregisteredClubName || errors.unregisteredClubCity}
                </p>
              )}
              {unregisteredClubCity && (
                <p className="mt-1 text-[10px] text-padel-green font-bold uppercase tracking-tight flex items-center gap-1">
                  <MapPin size={10} /> {unregisteredClubCity}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Redesigned Player Selection */}
        <div className="my-2">
          <div className="flex flex-col gap-1 max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 sm:gap-4 w-full">
              {/* Team 1 */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <PlayerSlotSquare
                    label=""
                    player={selfProfile}
                    isFixed
                    className="aspect-square"
                  />
                  <PlayerSlotSquare
                    label=""
                    player={selectedPlayers.partner}
                    onClick={() => {
                      setActiveSlot('partner');
                      setIsSearchModalOpen(true);
                    }}
                    isWinner={winner === "1"}
                    className="w-full aspect-square"
                  />
                </div>
                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest leading-none">Équipe 1</span>
              </div>

              {/* VS Badge Centered */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center pb-5">
                <div className="bg-padel-green text-[#071554] px-1 py-0.5 rounded text-[8px] font-black uppercase ring-2 ring-[#071554]">
                  VS
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <PlayerSlotSquare
                    label=""
                    player={selectedPlayers.opp1}
                    onClick={() => {
                      setActiveSlot('opp1');
                      setIsSearchModalOpen(true);
                    }}
                    isWinner={winner === "2"}
                  />
                  <PlayerSlotSquare
                    label=""
                    player={selectedPlayers.opp2}
                    onClick={() => {
                      setActiveSlot('opp2');
                      setIsSearchModalOpen(true);
                    }}
                    isWinner={winner === "2"}
                  />
                </div>
                <span className="text-[9px] font-black uppercase text-white/50 tracking-widest leading-none">Équipe 2</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-[8px] font-black text-white/40 uppercase tracking-widest">Équipe gagnante</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setWinner("1")}
                className={`group relative overflow-hidden rounded-xl border-2 px-3 py-2 text-[10px] font-black transition-all duration-300 ${winner === "1"
                  ? "border-padel-green bg-padel-green text-[#071554] shadow-[0_0_10px_rgba(191,255,0,0.2)]"
                  : "border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                  }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Trophy size={12} className={`transition-transform duration-300 ${winner === "1" ? "scale-110" : "group-hover:scale-110"}`} />
                  <span className="uppercase tracking-tight">Équipe 1</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setWinner("2")}
                className={`group relative overflow-hidden rounded-xl border-2 px-3 py-2 text-[10px] font-black transition-all duration-300 ${winner === "2"
                  ? "border-padel-green bg-padel-green text-[#071554] shadow-[0_0_10px_rgba(191,255,0,0.2)]"
                  : "border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                  }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Trophy size={12} className={`transition-transform duration-300 ${winner === "2" ? "scale-110" : "group-hover:scale-110"}`} />
                  <span className="uppercase tracking-tight">Équipe 2</span>
                </div>
              </button>
            </div>
            {errors.winner && (
              <p className="mt-3 text-xs text-red-400 font-bold uppercase tracking-tight">{errors.winner}</p>
            )}
          </div>
        </div>

        <div className="py-1 text-center">
          <label className="mb-1 block text-[9px] font-black text-white/50 uppercase tracking-widest">Scores des sets</label>
          <div className="flex flex-col gap-2 items-center">
            {sets.map((set, index) => (
              <div key={set.setNumber} className="relative flex items-center justify-center gap-2 w-full">
                <span className="text-[9px] font-black text-white/30 uppercase w-8 text-left">Set {set.setNumber}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="w-9 h-9 rounded-lg border-2 border-transparent bg-white/10 text-base text-white text-center font-bold focus:border-padel-green focus:outline-none"
                  value={set.team1Score}
                  onChange={(e) => updateSet(index, "team1Score", e.target.value)}
                  placeholder="-"
                  ref={(el) => { setTeam1Refs.current[index] = el; }}
                  onBlur={handleInputBlur}
                />
                <span className="text-white/20 font-light text-lg">:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="w-9 h-9 rounded-lg border-2 border-transparent bg-white/10 text-base text-white text-center font-bold focus:border-padel-green focus:outline-none"
                  value={set.team2Score}
                  onChange={(e) => updateSet(index, "team2Score", e.target.value)}
                  placeholder="-"
                  ref={(el) => { setTeam2Refs.current[index] = el; }}
                  onBlur={handleInputBlur}
                />
                {index >= 2 && (
                  <button
                    type="button"
                    onClick={() => removeSet(index)}
                    className="absolute right-0 sm:right-auto sm:translate-x-12 text-red-400/50 hover:text-red-300 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}

            {/* Integrated Tie Break Row - Optional */}
            {hasTieBreak && (
              <div className="flex items-center justify-center gap-2 mt-0.5 border-t border-white/5 pt-1 w-full max-w-[150px]">
                <span className="text-[8px] font-black text-padel-green uppercase w-8 text-left">T-B</span>
                <div className="flex items-center gap-1">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-8 h-8 rounded-lg border border-padel-green/30 bg-padel-green/5 text-sm text-white text-center font-bold focus:border-padel-green focus:outline-none"
                    value={tieBreak.team1Score}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setTieBreak({ ...tieBreak, team1Score: v });
                    }}
                    placeholder="0"
                    ref={tieBreakTeam1Ref}
                    onBlur={handleInputBlur}
                  />
                  <span className="text-padel-green/40 font-bold">-</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-8 h-8 rounded-lg border border-padel-green/30 bg-padel-green/5 text-sm text-white text-center font-bold focus:border-padel-green focus:outline-none"
                    value={tieBreak.team2Score}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setTieBreak({ ...tieBreak, team2Score: v });
                    }}
                    placeholder="0"
                    ref={tieBreakTeam2Ref}
                    onBlur={handleInputBlur}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setHasTieBreak(false)}
                  className="text-red-400/50 hover:text-red-300 p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {sets.length < 5 && (
                <button
                  type="button"
                  onClick={addSet}
                  className="mt-1 text-[7px] font-black text-padel-green uppercase tracking-widest border border-padel-green/20 px-2 py-1 rounded-full hover:bg-padel-green/10 transition-all"
                >
                  + Set
                </button>
              )}
              {!hasTieBreak && (
                <button
                  type="button"
                  onClick={() => setHasTieBreak(true)}
                  className="mt-1 text-[7px] font-black text-padel-green uppercase tracking-widest border border-padel-green/20 px-2 py-1 rounded-full hover:bg-padel-green/10 transition-all"
                >
                  + Tie-Break
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Option boost - caché temporairement
        {!loadingBoostStats && boostStats && (
          <div className="mb-6 rounded-lg border border-padel-green/50 bg-gradient-to-br from-padel-green/10 via-black/40 to-black/20 p-4 shadow-xl relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <div className="flex-shrink-0 flex items-center justify-center">
                <Zap className="h-6 w-6 text-padel-green" fill="currentColor" />
              </div>
              <div className="flex-1">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={useBoost}
                    onChange={(e) => {
                      setUseBoost(e.target.checked);
                    }}
                    disabled={!boostStats || boostStats.creditsAvailable === undefined || boostStats.creditsAvailable === null || Number(boostStats.creditsAvailable) < 1}
                    title={boostStats && boostStats.creditsAvailable >= 1 ? `Tu as ${boostStats.creditsAvailable} boost${boostStats.creditsAvailable > 1 ? 's' : ''} disponible${boostStats.creditsAvailable > 1 ? 's' : ''}` : 'Tu n\'as pas de boosts disponibles'}
                    className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-sm font-semibold text-white">
                    Appliquer un boost (+30% de points si tu gagnes)
                  </span>
                </label>
                {boostStats && Number(boostStats.creditsAvailable) > 0 && (
                  <p className="mt-2 text-xs text-white/70">
                    Tu as <strong className="font-semibold text-blue-300">{boostStats.creditsAvailable}</strong> boost{boostStats.creditsAvailable > 1 ? 's' : ''} disponible{boostStats.creditsAvailable > 1 ? 's' : ''}.
                    {boostStats.usedThisMonth > 0 && (
                      <> {boostStats.usedThisMonth} boost{boostStats.usedThisMonth > 1 ? 's' : ''} utilisé{boostStats.usedThisMonth > 1 ? 's' : ''} ce mois-ci ({boostStats.remainingThisMonth} restant{boostStats.remainingThisMonth > 1 ? 's' : ''}).</>
                    )}
                    {boostStats.usedThisMonth >= 10 && (
                      <span className="block mt-1 text-yellow-300">
                        ⚠️ Tu as atteint la limite mensuelle de 10 boosts. Le boost ne sera pas appliqué.
                      </span>
                    )}
                  </p>
                )}
                {boostStats && (boostStats.creditsAvailable === undefined || boostStats.creditsAvailable === null || Number(boostStats.creditsAvailable) <= 0) && (
                  <p className="mt-2 text-xs text-white/70">
                    Tu n'as plus de boosts disponibles.{" "}
                    <a href="/boost" className="font-semibold text-white underline hover:text-gray-200">
                      Achète-en de nouveaux
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        */}

        <div className="pt-2 pb-4">
          <button
            disabled={loading}
            className="w-full relative group overflow-hidden rounded-xl bg-padel-green px-4 py-3.5 font-black text-[#071554] uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shadow-[0_5px_15px_rgba(191,255,0,0.2)]"
          >
            <div className="relative z-10 flex items-center justify-center gap-1.5 text-sm">
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-[#071554]/30 border-t-[#071554] rounded-full animate-spin" />
              )}
              {loading ? "ENREGISTREMENT..." : "ENREGISTRER LE MATCH"}
            </div>
          </button>
        </div>
      </form>

      {/* Search Modal Portal */}
      {
        isSearchModalOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#071554]/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#071554] rounded-3xl border border-white/20 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <Search size={24} className="text-padel-green" />
                  {activeSlot === 'partner' ? 'Ajouter un partenaire' : 'Ajouter un adversaire'}
                </h3>
                <p className="text-sm text-white/50 font-medium">
                  Recherchez par prénom et nom
                </p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute right-1 top-[7px] z-20">
                    <div className="relative">
                      <select
                        value={activeSlot ? scopes[activeSlot] : 'global'}
                        onChange={(e) => {
                          const newScope = e.target.value as any;
                          if (activeSlot) {
                            setScopes(prev => ({ ...prev, [activeSlot]: newScope }));
                          }
                        }}
                        className="appearance-none bg-white text-[#071554] text-[10px] font-bold rounded-md pl-2 pr-6 border-2 border-[#071554] cursor-pointer outline-none h-[32px] flex items-center"
                      >
                        <option value="global">Global</option>
                        <option value="guest">Invité</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#071554] stroke-[3px] pointer-events-none" />
                    </div>
                  </div>

                  <PlayerAutocomplete
                    value={
                      activeSlot === 'partner' ? partnerName :
                        activeSlot === 'opp1' ? opp1Name :
                          opp2Name
                    }
                    onChange={(val) => {
                      if (activeSlot === 'partner') setPartnerName(val);
                      else if (activeSlot === 'opp1') setOpp1Name(val);
                      else if (activeSlot === 'opp2') setOpp2Name(val);
                    }}
                    onSelect={(player) => {
                      if (activeSlot) {
                        setSelectedPlayers(prev => ({ ...prev, [activeSlot]: player }));
                        setIsSearchModalOpen(false);
                      }
                    }}
                    searchScope={activeSlot ? scopes[activeSlot] : 'global'}
                    placeholder="Michel Dupont..."
                    inputClassName="pr-[90px] h-[46px] rounded-xl text-lg font-bold"
                  />
                </div>

                {activeSlot && selectedPlayers[activeSlot] && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-padel-green flex items-center justify-center text-[#071554] font-black">
                        {selectedPlayers[activeSlot]?.first_name?.[0]}{selectedPlayers[activeSlot]?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-white font-bold">{selectedPlayers[activeSlot]?.display_name}</p>
                        <p className="text-white/40 text-xs uppercase tracking-tighter">{selectedPlayers[activeSlot]?.type === 'guest' ? 'Invité' : 'Inscrit'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (activeSlot) {
                          setSelectedPlayers(prev => ({ ...prev, [activeSlot]: null }));
                          if (activeSlot === 'partner') setPartnerName('');
                          else if (activeSlot === 'opp1') setOpp1Name('');
                          else if (activeSlot === 'opp2') setOpp2Name('');
                        }
                      }}
                      className="text-red-400 text-xs font-bold uppercase hover:bg-red-400/10 px-2 py-1 rounded"
                    >
                      Effacer
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setIsSearchModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}

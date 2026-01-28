"use client";

import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";
import BadgeIconDisplay from "./BadgeIconDisplay";
import PlayerAutocomplete from "./PlayerAutocomplete";
import { logger } from '@/lib/logger';
import { Trophy, Zap, Mail, Globe, ChevronDown } from "lucide-react";

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
  selfId
}: {
  selfId: string;
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
    partner: 'club',
    opp1: 'club',
    opp2: 'club',
  });

  // Location state
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; city: string }>>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selfClubName, setSelfClubName] = useState<string | null>(null);
  const [isUnregisteredClub, setIsUnregisteredClub] = useState(false);
  const [unregisteredClubName, setUnregisteredClubName] = useState("");
  const [unregisteredClubCity, setUnregisteredClubCity] = useState("");
  const [loadingClubs, setLoadingClubs] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // État pour le message d'information sur la limite de 2 matchs par jour
  // Initialiser à null pour éviter le flash, puis vérifier localStorage
  const [showMatchLimitInfo, setShowMatchLimitInfo] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

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

  // Vérifier si l'utilisateur a déjà cliqué sur "Compris" pour le cadre d'information
  // Afficher le message seulement si l'utilisateur ne l'a jamais vu
  // Vérification dans la base de données (persistant même après déconnexion/reconnexion)
  useEffect(() => {
    async function checkMatchLimitInfoStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Si pas d'utilisateur, vérifier localStorage comme fallback
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

        // Vérifier dans la base de données (table profiles)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('match_limit_info_understood')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          logger.warn('[MatchForm] Error fetching profile:', profileError);
          // Fallback sur localStorage en cas d'erreur
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

        // Si le champ existe dans la base de données, l'utiliser
        if (profile && profile.match_limit_info_understood === true) {
          setShowMatchLimitInfo(false);
          // Synchroniser localStorage pour la rétrocompatibilité
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('matchLimitInfoUnderstood', 'true');
            } catch (error) {
              // Ignorer les erreurs localStorage
            }
          }
        } else {
          // Vérifier localStorage comme fallback (pour les utilisateurs existants)
          if (typeof window !== 'undefined') {
            try {
              const hasClickedUnderstood = localStorage.getItem('matchLimitInfoUnderstood') === 'true';
              setShowMatchLimitInfo(!hasClickedUnderstood);
              // Si trouvé dans localStorage mais pas en DB, synchroniser en DB
              if (hasClickedUnderstood) {
                await supabase
                  .from('profiles')
                  .update({ match_limit_info_understood: true })
                  .eq('id', user.id);
              }
            } catch (error) {
              setShowMatchLimitInfo(true);
            }
          } else {
            setShowMatchLimitInfo(true);
          }
        }
      } catch (error) {
        logger.warn('[MatchForm] Error checking match limit info status:', error);
        // En cas d'erreur, vérifier localStorage comme fallback
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
        // Sauvegarder dans la base de données (persistant même après déconnexion/reconnexion)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ match_limit_info_understood: true })
          .eq('id', user.id);

        if (updateError) {
          logger.warn('[MatchForm] Error saving to database:', updateError);
          // Fallback sur localStorage en cas d'erreur
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('matchLimitInfoUnderstood', 'true');
            } catch (localStorageError) {
              logger.warn('[MatchForm] Error saving to localStorage:', localStorageError);
            }
          }
        } else {
          // Synchroniser localStorage pour la rétrocompatibilité
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('matchLimitInfoUnderstood', 'true');
            } catch (localStorageError) {
              // Ignorer les erreurs localStorage, la DB est la source de vérité
            }
          }
        }
      } else {
        // Si pas d'utilisateur, utiliser localStorage comme fallback
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('matchLimitInfoUnderstood', 'true');
          } catch (error) {
            logger.warn('[MatchForm] Error saving to localStorage:', error);
          }
        }
      }

      setShowMatchLimitInfo(false);
    } catch (error) {
      logger.warn('[MatchForm] Error in handleUnderstoodClick:', error);
      // Masquer le message même en cas d'erreur
      setShowMatchLimitInfo(false);
      // Essayer de sauvegarder dans localStorage comme fallback
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('matchLimitInfoUnderstood', 'true');
        } catch (localStorageError) {
          // Ignorer
        }
      }
    }
  };

  // Charger les stats de boost au montage et les recharger périodiquement
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

        // Forcer le rechargement avec un timestamp unique
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
          logger.info('[MatchForm] ===== RAW API RESPONSE =====');
          logger.info('[MatchForm] Raw boost stats response:', JSON.stringify(data, null, 2));

          if (data && typeof data === 'object' && !cancelled) {
            // Utiliser directement les valeurs de l'API - FORCER LA CONVERSION EN NOMBRE
            const creditsAvailable = Number(data.creditsAvailable) || 0;
            const usedThisMonth = Number(data.usedThisMonth) || 0;
            const remainingThisMonth = Number(data.remainingThisMonth) || 0;
            const canUse = creditsAvailable > 0 && usedThisMonth < 10;

            const stats = {
              creditsAvailable,
              usedThisMonth,
              remainingThisMonth,
              canUse,
            };

            logger.info('[MatchForm] ===== BOOST STATS PARSED =====');
            logger.info(`[MatchForm] creditsAvailable: ${creditsAvailable} type: ${typeof creditsAvailable}`);
            logger.info(`[MatchForm] Number(creditsAvailable): ${Number(creditsAvailable)}`);
            logger.info(`[MatchForm] creditsAvailable >= 1? ${creditsAvailable >= 1}`);
            logger.info(`[MatchForm] Checkbox will be: ${creditsAvailable >= 1 ? '✅ ENABLED' : '❌ DISABLED'}`);
            logger.debug('[MatchForm] Full stats', { stats });
            logger.info('[MatchForm] =============================');

            if (!cancelled) {
              setBoostStats(stats);
              logger.debug('[MatchForm] State updated with stats', { stats });
            }
          } else if (!cancelled) {
            logger.error('[MatchForm] ❌ Invalid boost stats data', { data });
            setBoostStats(null);
          }
        } else if (!cancelled) {
          const errorText = await res.text();
          logger.error(`[MatchForm] Failed to load boost stats: ${res.status} ${res.statusText}`, { error: errorText });
          setBoostStats(null);
        }
      } catch (error) {
        if (!cancelled && error instanceof Error && !error.message.includes('404')) {
          logger.error('[MatchForm] Error loading boost stats:', error);
        }
        if (!cancelled) {
          setBoostStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingBoostStats(false);
        }
      }
    }

    loadBoostStats();

    // Recharger toutes les 2 secondes pour s'assurer que les données sont à jour
    const interval = setInterval(() => {
      if (!cancelled) {
        loadBoostStats();
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [supabase]);

  // Fetch user's clubs
  useEffect(() => {
    async function fetchAllClubs() {
      try {
        setLoadingClubs(true);
        const { data: { user } } = await supabase.auth.getUser();

        // Récupérer TOUS les clubs enregistrés
        const { data: allClubs, error: clubsError } = await supabase
          .from('clubs')
          .select('id, name, city')
          .order('name');

        if (clubsError) {
          logger.error('Error fetching all clubs:', clubsError);
        }

        if (allClubs) {
          setClubs(allClubs);

          // Tenter de pré-sélectionner le club de l'utilisateur
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('club_id, clubs(name)')
              .eq('id', user.id)
              .maybeSingle();

            if (profile?.club_id) {
              if (allClubs.some((c: any) => c.id === profile.club_id)) {
                setSelectedClubId(profile.club_id);
              }
              setSelfClubName((profile.clubs as any)?.name || null);
            } else if (allClubs.length > 0) {
              setSelectedClubId(allClubs[0].id);
            }
          } else if (allClubs.length > 0) {
            setSelectedClubId(allClubs[0].id);
          }
        }
      } catch (err) {
        logger.error('Error in fetchAllClubs:', err);
      } finally {
        setLoadingClubs(false);
      }
    }

    fetchAllClubs();
  }, [supabase]);

  // Gérer la pré-sélection d'un adversaire via URL (ex: "Défier ce joueur")
  useEffect(() => {
    const opponentId = searchParams?.get('opponentId');
    if (opponentId) {
      const fetchOpponent = async () => {
        try {
          // Utiliser l'API de validation pour récupérer les détails complets du joueur (club, etc.)
          // On triche un peu en utilisant validate-exact avec un ID simulé ou via une autre API
          // Mieux : utiliser l'API search ou batch profile

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
              // is_external calculé dynamiquement
            };

            // Mettre à jour l'état
            setSelectedPlayers(prev => ({
              ...prev,
              opp1: player
            }));
            setOpp1Name(displayName);
            logger.info(`[MatchForm] Opponent pre-selected from URL: ${displayName}`);
          }
        } catch (e) {
          logger.error("[MatchForm] Error fetching pre-selected opponent", e);
        }
      };

      fetchOpponent();
    }
  }, [searchParams, supabase]);

  const addSet = () => {
    const nextSetNumber = sets.length + 1;
    if (nextSetNumber <= 5) {
      setSets([...sets, { setNumber: nextSetNumber, team1Score: "", team2Score: "" }]);
    }
  };

  const removeSet = (index: number) => {
    if (sets.length > 2 && index >= 2) {
      const newSets = sets.filter((_, i) => i !== index);
      // Réindexer les sets
      const reindexedSets = newSets.map((set, i) => ({ ...set, setNumber: i + 1 }));
      setSets(reindexedSets);
    }
  };

  const updateSet = (index: number, field: "team1Score" | "team2Score", value: string) => {
    // Nettoyer les erreurs précédentes pour ce champ
    const errorKey = `set${sets[index].setNumber}_${field}`;
    const newErrors = { ...errors };
    delete newErrors[errorKey];

    // Filtrer uniquement les chiffres
    const numericValue = value.replace(/\D/g, '');

    // Validation : un set de padel ne peut pas dépasser 7
    if (numericValue) {
      const numValue = parseInt(numericValue);
      if (!isNaN(numValue) && numValue > 7) {
        newErrors[errorKey] = "Un set de padel ne peut pas dépasser 7";
        setErrors(newErrors);
        // Ne pas mettre à jour la valeur si > 7
        return;
      }
    }

    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: numericValue };

    // Validation : si un set est à 7, l'autre doit être 5 ou 6
    const currentSet = newSets[index];
    const team1Score = parseInt(currentSet.team1Score) || 0;
    const team2Score = parseInt(currentSet.team2Score) || 0;

    // Nettoyer toutes les erreurs de ce set pour réévaluer
    delete newErrors[`set${currentSet.setNumber}_team1`];
    delete newErrors[`set${currentSet.setNumber}_team2`];
    delete newErrors[`set${currentSet.setNumber}_min_score`];
    delete newErrors[`set${currentSet.setNumber}_tie`];

    // Validation : au moins une équipe doit avoir 6 ou 7 jeux
    if (team1Score > 0 && team2Score > 0) {
      const hasValidScore = team1Score >= 6 || team2Score >= 6;
      if (!hasValidScore) {
        newErrors[`set${currentSet.setNumber}_min_score`] = "Au moins une des deux équipes doit avoir 6 ou 7 jeux";
      }

      // Validation : les scores ne peuvent pas être de 6-6
      if (team1Score === 6 && team2Score === 6) {
        newErrors[`set${currentSet.setNumber}_tie`] = "Les scores ne peuvent pas être de 6-6";
      }

      // Validation : si une équipe a 5, l'autre doit avoir 7
      if (team1Score === 5 && team2Score !== 7) {
        newErrors[`set${currentSet.setNumber}_team2`] = "Si une équipe a 5 jeux, l'autre équipe doit avoir 7 jeux";
      } else if (team2Score === 5 && team1Score !== 7) {
        newErrors[`set${currentSet.setNumber}_team1`] = "Si une équipe a 5 jeux, l'autre équipe doit avoir 7 jeux";
      }
    }

    // Validation : si un set est à 7, l'autre doit être au moins 5
    if (team1Score === 7 && team2Score > 0 && team2Score < 5) {
      newErrors[`set${currentSet.setNumber}_team2`] = "Si une des équipes a 7 jeux, l'autre équipe ne peut pas avoir moins de 5 jeux";
    } else if (team2Score === 7 && team1Score > 0 && team1Score < 5) {
      newErrors[`set${currentSet.setNumber}_team1`] = "Si une des équipes a 7 jeux, l'autre équipe ne peut pas avoir moins de 5 jeux";
    }

    setSets(newSets);
    setErrors(newErrors);

    // Auto-focus: si on remplit la 1ère case → aller à la 2ème, puis au set suivant
    if (numericValue.length >= 1 && !newErrors[errorKey]) {
      if (field === "team1Score") {
        // Aller à la case équipe 2 du même set
        const next = setTeam2Refs.current[index];
        next?.focus();
      } else if (field === "team2Score") {
        // Aller au set suivant (équipe 1) s'il existe, sinon tie-break ou bouton submit
        const nextSetInput = setTeam1Refs.current[index + 1];
        if (nextSetInput) {
          nextSetInput.focus();
        } else if (hasTieBreak) {
          tieBreakTeam1Ref.current?.focus();
        } else {
          // Fallback: focus sur le bouton d'enregistrement
          const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
          submitBtn?.focus();
        }
      }
    }
  };

  // Fonction pour valider un joueur en temps réel (appelée lors du blur)
  const validatePlayerField = async (fieldName: 'partnerName' | 'opp1Name' | 'opp2Name', playerName: string) => {
    if (!playerName.trim()) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
      return;
    }

    const validation = await validateExactPlayer(playerName);

    if (!validation.valid) {
      setErrors((prev) => ({ ...prev, [fieldName]: validation.error || `Aucun joueur trouvé avec le nom exact "${playerName}".` }));
      return;
    }

    if (!validation.player) {
      setErrors((prev) => ({ ...prev, [fieldName]: `Aucun joueur trouvé avec le nom exact "${playerName}".` }));
      return;
    }

    // Vérifier que le joueur a un prénom ET un nom dans la base de données
    const firstName = validation.player.first_name || '';
    const lastName = validation.player.last_name || '';

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      setErrors((prev) => ({ ...prev, [fieldName]: "Ce joueur doit avoir un prénom et un nom complet. Veuillez compléter les informations du joueur dans son profil." }));
      return;
    }

    // Vérifier que le nom saisi correspond exactement à "prénom nom" du joueur
    const expectedFullName = `${firstName} ${lastName}`.trim();
    const normalizedInput = playerName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedExpected = expectedFullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalizedInput !== normalizedExpected) {
      setErrors((prev) => ({ ...prev, [fieldName]: `Le nom doit être écrit exactement comme "${expectedFullName}" (prénom et nom complet).` }));
      return;
    }

    // Le joueur est valide et le nom saisi correspond exactement, on nettoie l'erreur
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    // Stocker le joueur validé dans selectedPlayers (sans modifier le champ de saisie)
    if (fieldName === 'partnerName') {
      setSelectedPlayers((prev) => ({ ...prev, partner: (validation.player ?? null) as PlayerSearchResult | null }));
    } else if (fieldName === 'opp1Name') {
      setSelectedPlayers((prev) => ({ ...prev, opp1: (validation.player ?? null) as PlayerSearchResult | null }));
    } else if (fieldName === 'opp2Name') {
      setSelectedPlayers((prev) => ({ ...prev, opp2: (validation.player ?? null) as PlayerSearchResult | null }));
    }
  };

  // Fonction pour valider exactement un nom de joueur (sans création automatique)
  const validateExactPlayer = async (name: string): Promise<{ valid: boolean; player?: PlayerSearchResult | null; error?: string }> => {
    if (!name.trim()) {
      return { valid: false, error: "Le nom du joueur est requis" };
    }

    try {
      const response = await fetch("/api/players/validate-exact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ playerName: name.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        logger.error(`Validate exact API error: ${response.status} ${response.statusText}`, { error: errorData });

        if (response.status === 401) {
          return { valid: false, error: "Erreur d'authentification. Veuillez vous reconnecter." };
        }

        const errorMessage = errorData.error || 'Erreur lors de la validation du joueur';
        return { valid: false, error: errorMessage };
      }

      const data = await response.json();

      if (!data.valid || !data.player) {
        const errorMessage = data.error || `Aucun joueur trouvé avec le nom exact "${name.trim()}". Vérifiez l'orthographe (lettres, espaces, accents).`;
        return { valid: false, error: errorMessage };
      }

      const player = data.player;

      // Utiliser UNIQUEMENT first_name et last_name de la base de données
      // Ne pas extraire depuis display_name - si ces champs sont vides, c'est une erreur
      const first_name = player.first_name || "";
      const last_name = player.last_name || "";

      // Construire le nom complet avec prénom + nom
      const fullName = (first_name && first_name.trim() && last_name && last_name.trim())
        ? `${first_name.trim()} ${last_name.trim()}`.trim()
        : player.display_name || "";

      logger.info(`Player validated for "${name}":`, {
        id: player.id,
        display_name: fullName,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        type: player.type,
        hasCompleteName: !!(first_name && first_name.trim() && last_name && last_name.trim())
      });

      const type: "user" | "guest" = (player.type || (player.email ? "user" : "guest")) as "user" | "guest";

      return {
        valid: true,
        player: {
          id: player.id,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          type,
          display_name: type === "guest" ? `${fullName} 👤` : fullName,
          email: player.email || null,
          club_name: player.club_name || null,
          is_external: player.type === "user" && player.club_id !== undefined ? true : undefined, // On verra plus tard si on a besoin de is_external précis
        },
      };
    } catch (error) {
      logger.error("Error validating exact player:", error instanceof Error ? error.message : String(error));
      return {
        valid: false,
        error: `Erreur lors de la validation du joueur "${name.trim()}". Veuillez réessayer.`
      };
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info("🚀 Form submission started");
    const newErrors: Record<string, string> = {};
    setErrors({});
    setLoading(true);

    try {
      logger.info("📋 Current state:", { partnerName, opp1Name, opp2Name, selectedPlayers });

      // Vérifier d'abord que le joueur connecté (selfId) a un prénom et un nom
      // Utiliser l'API pour récupérer le profil du joueur connecté AVANT de valider les autres joueurs
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          newErrors.partnerName = "Vous devez être connecté pour enregistrer un match.";
          setErrors(newErrors);
          setLoading(false);
          return;
        }

        // Utiliser l'API pour récupérer le profil (évite les problèmes RLS)
        const profileRes = await fetch('/api/player/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (!profileRes.ok) {
          logger.error(`❌ Error fetching self profile from API: ${profileRes.status} ${profileRes.statusText}`);
          if (profileRes.status === 404) {
            setErrorMessage("Votre profil n'a pas été trouvé. Veuillez contacter le support.");
          } else {
            setErrorMessage("Erreur lors de la vérification de votre profil. Veuillez réessayer.");
          }
          setLoading(false);
          return;
        }

        const profileData = await profileRes.json();

        logger.info("🔍 Self profile data received:", {
          id: profileData.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          display_name: profileData.display_name,
          hasFirstName: profileData.hasFirstName,
          hasLastName: profileData.hasLastName,
          hasCompleteName: profileData.hasCompleteName
        });

        // Vérifier que le profil a un prénom ET un nom (non vides)
        if (!profileData.hasCompleteName) {
          logger.error("❌ Self profile missing first_name or last_name:", profileData);
          setErrorMessage("Votre profil doit avoir un prénom et un nom complet pour enregistrer un match. Veuillez compléter vos informations dans les paramètres de votre profil.");
          setLoading(false);
          return;
        }

        logger.info("✅ Self profile validated:", {
          first_name: profileData.first_name,
          last_name: profileData.last_name
        });
      } catch (profileError) {
        logger.error("❌ Error checking self profile:", profileError);
        setErrorMessage("Erreur lors de la vérification de votre profil. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      // Valider exactement chaque joueur (sans création automatique)
      let partner: PlayerSearchResult | null = null;
      let opp1: PlayerSearchResult | null = null;
      let opp2: PlayerSearchResult | null = null;

      // Validation du partenaire
      if (!partnerName.trim()) {
        newErrors.partnerName = "Indiquez un partenaire (prénom et nom complet)";
      } else {
        logger.info("🔍 Validating partner:", partnerName);
        const partnerValidation = await validateExactPlayer(partnerName);
        if (!partnerValidation.valid) {
          logger.error("❌ Partner validation failed:", partnerValidation.error);
          newErrors.partnerName = partnerValidation.error || `Aucun joueur trouvé avec le nom exact "${partnerName}". Vérifiez l'orthographe (lettres, espaces, accents).`;
        } else if (partnerValidation.player) {
          // Vérifier que le joueur a un prénom ET un nom dans la base de données
          const partnerFirstName = partnerValidation.player.first_name || '';
          const partnerLastName = partnerValidation.player.last_name || '';

          // Vérifier que le joueur a un prénom ET un nom (non vides dans la DB)
          if (!partnerFirstName || !partnerFirstName.trim() || !partnerLastName || !partnerLastName.trim()) {
            newErrors.partnerName = "Ce joueur doit avoir un prénom et un nom complet. Veuillez compléter les informations du joueur dans son profil.";
          } else {
            // Vérifier que le nom saisi correspond exactement à "prénom nom"
            const expectedFullName = `${partnerFirstName} ${partnerLastName}`.trim();
            const normalizeForComparison = (str: string) => str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normalizedInput = normalizeForComparison(partnerName);
            const normalizedExpected = normalizeForComparison(expectedFullName);

            if (normalizedInput !== normalizedExpected) {
              newErrors.partnerName = `Le nom doit être écrit exactement comme "${expectedFullName}" (prénom et nom complet).`;
            } else {
              partner = partnerValidation.player;
              setSelectedPlayers((prev) => ({ ...prev, partner }));
              logger.info("✅ Partner validated:", partner);
            }
          }
        }
      }

      // Validation de l'opposant 1
      if (!opp1Name.trim()) {
        newErrors.opp1Name = "Indiquez un joueur (prénom et nom complet)";
      } else {
        logger.info("🔍 Validating opp1:", opp1Name);
        const opp1Validation = await validateExactPlayer(opp1Name);
        if (!opp1Validation.valid) {
          logger.error("❌ Opp1 validation failed:", opp1Validation.error);
          newErrors.opp1Name = opp1Validation.error || `Aucun joueur trouvé avec le nom exact "${opp1Name}". Vérifiez l'orthographe (lettres, espaces, accents).`;
        } else if (opp1Validation.player) {
          // Vérifier que le joueur a un prénom ET un nom dans la base de données
          const opp1FirstName = opp1Validation.player.first_name || '';
          const opp1LastName = opp1Validation.player.last_name || '';

          // Vérifier que le joueur a un prénom ET un nom (non vides dans la DB)
          if (!opp1FirstName || !opp1FirstName.trim() || !opp1LastName || !opp1LastName.trim()) {
            newErrors.opp1Name = "Ce joueur doit avoir un prénom et un nom complet. Veuillez compléter les informations du joueur dans son profil.";
          } else {
            // Vérifier que le nom saisi correspond exactement à "prénom nom"
            const expectedFullName = `${opp1FirstName} ${opp1LastName}`.trim();
            const normalizeForComparison = (str: string) => str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normalizedInput = normalizeForComparison(opp1Name);
            const normalizedExpected = normalizeForComparison(expectedFullName);

            if (normalizedInput !== normalizedExpected) {
              newErrors.opp1Name = `Le nom doit être écrit exactement comme "${expectedFullName}" (prénom et nom complet).`;
            } else {
              opp1 = opp1Validation.player;
              setSelectedPlayers((prev) => ({ ...prev, opp1 }));
              logger.info("✅ Opp1 validated:", opp1);
            }
          }
        }
      }

      // Validation de l'opposant 2
      if (!opp2Name.trim()) {
        newErrors.opp2Name = "Indiquez un joueur (prénom et nom complet)";
      } else {
        logger.info("🔍 Validating opp2:", opp2Name);
        const opp2Validation = await validateExactPlayer(opp2Name);
        if (!opp2Validation.valid) {
          logger.error("❌ Opp2 validation failed:", opp2Validation.error);
          newErrors.opp2Name = opp2Validation.error || `Aucun joueur trouvé avec le nom exact "${opp2Name}". Vérifiez l'orthographe (lettres, espaces, accents).`;
        } else if (opp2Validation.player) {
          // Vérifier que le joueur a un prénom ET un nom dans la base de données
          const opp2FirstName = opp2Validation.player.first_name || '';
          const opp2LastName = opp2Validation.player.last_name || '';

          // Vérifier que le joueur a un prénom ET un nom (non vides dans la DB)
          if (!opp2FirstName || !opp2FirstName.trim() || !opp2LastName || !opp2LastName.trim()) {
            newErrors.opp2Name = "Ce joueur doit avoir un prénom et un nom complet. Veuillez compléter les informations du joueur dans son profil.";
          } else {
            // Vérifier que le nom saisi correspond exactement à "prénom nom"
            const expectedFullName = `${opp2FirstName} ${opp2LastName}`.trim();
            const normalizeForComparison = (str: string) => str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normalizedInput = normalizeForComparison(opp2Name);
            const normalizedExpected = normalizeForComparison(expectedFullName);

            if (normalizedInput !== normalizedExpected) {
              newErrors.opp2Name = `Le nom doit être écrit exactement comme "${expectedFullName}" (prénom et nom complet).`;
            } else {
              opp2 = opp2Validation.player;
              setSelectedPlayers((prev) => ({ ...prev, opp2 }));
              logger.info("✅ Opp2 validated:", opp2);
            }
          }
        }
      }

      // Vérifier s'il y a des erreurs de validation
      const errorKeys = Object.keys(newErrors);
      const hasErrors = errorKeys.length > 0 && errorKeys.some(key => newErrors[key]);

      if (hasErrors) {
        // Filtrer les erreurs vides avant de les logger
        const filteredErrors = Object.fromEntries(
          Object.entries(newErrors).filter(([_, value]) => value)
        );
        logger.error("❌ Validation errors:", filteredErrors);
        setErrors(filteredErrors);
        setLoading(false);
        return; // Ne pas effacer les données du formulaire
      }

      // S'assurer que tous les joueurs sont validés
      if (!partner || !opp1 || !opp2) {
        logger.error("❌ Some players are missing after validation");
        setErrors({
          partnerName: !partner ? "Erreur de validation du partenaire" : "",
          opp1Name: !opp1 ? "Erreur de validation du joueur 1" : "",
          opp2Name: !opp2 ? "Erreur de validation du joueur 2" : "",
        });
        setLoading(false);
        return;
      }

      logger.info("✅ All players validated:", { partner, opp1, opp2 });

      // À ce stade, on sait que tous les joueurs sont résolus (validation faite plus haut)
      // TypeScript sait que partner, opp1, opp2 sont non-null grâce à la validation

      // Vérifier les joueurs users (ne doivent pas avoir le même ID)
      const userPlayers = [
        selfId,
        partner!.type === "user" ? partner!.id : null,
        opp1!.type === "user" ? opp1!.id : null,
        opp2!.type === "user" ? opp2!.id : null,
      ].filter(Boolean) as string[];

      if (userPlayers.length !== new Set(userPlayers).size) {
        setErrors({ partnerName: "Les 4 joueurs doivent être uniques" });
        setLoading(false);
        return;
      }

      // Vérifier les joueurs guests (ne doivent pas avoir le même guest_player_id)
      const guestPlayers = [
        partner!.type === "guest" ? partner!.id : null,
        opp1!.type === "guest" ? opp1!.id : null,
        opp2!.type === "guest" ? opp2!.id : null,
      ].filter(Boolean) as string[];

      if (guestPlayers.length !== new Set(guestPlayers).size) {
        setErrors({ partnerName: "Les joueurs invités doivent être uniques" });
        setLoading(false);
        return;
      }

      // Validation de la localisation
      if (!isUnregisteredClub && !selectedClubId) {
        setErrors((prev) => ({ ...prev, location: "Veuillez sélectionner un club" }));
        setLoading(false);
        return;
      }

      if (isUnregisteredClub) {
        if (!unregisteredClubName.trim()) {
          setErrors((prev) => ({ ...prev, unregisteredClubName: "Le nom du club est requis" }));
          setLoading(false);
          return;
        }
        if (!unregisteredClubCity.trim()) {
          setErrors((prev) => ({ ...prev, unregisteredClubCity: "La ville est requise" }));
          setLoading(false);
          return;
        }
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

      // Cas spécial : match décidé au tie-break (1-1 avec tie-break)
      const isTieBreakMatch = team1Wins === 1 && team2Wins === 1 && hasTieBreak && tieBreak.team1Score && tieBreak.team2Score;

      if (isTieBreakMatch && !setsErrors.tieBreak) {
        // Vérifier que le tie-break est à l'avantage de l'équipe gagnante
        const tieBreakTeam1 = parseInt(tieBreak.team1Score);
        const tieBreakTeam2 = parseInt(tieBreak.team2Score);

        if (winner === "1" && tieBreakTeam1 <= tieBreakTeam2) {
          setsErrors.tieBreak = "L'équipe 1 doit avoir un score supérieur à celui de l'équipe 2";
        } else if (winner === "2" && tieBreakTeam2 <= tieBreakTeam1) {
          setsErrors.tieBreak = "L'équipe 2 doit avoir un score supérieur à celui de l'équipe 1";
        }
      } else if (!isTieBreakMatch) {
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

      logger.info(`🔍 [MatchForm] useBoost value before sending: ${useBoost} type: ${typeof useBoost}`);
      logger.info("📤 Données envoyées à l'API [Payload omit log for brevity]");
      logger.info("📤 Structure détaillée:", {
        playersCount: players.length,
        players: players.map(p => ({
          player_type: p.player_type,
          user_id: p.user_id,
          guest_player_id: p.guest_player_id,
        })),
        winner,
        setsCount: sets.length,
        sets: sets.map(s => ({
          setNumber: s.setNumber,
          team1Score: s.team1Score,
          team2Score: s.team2Score,
        })),
        tieBreak: payload.tieBreak,
      });

      const res = await fetch("/api/matches/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

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

        // Fermer automatiquement la notification après 5 secondes
        setTimeout(() => {
          setErrorMessage(null);
        }, 5000);
      }
    } catch (error) {
      logger.error("❌ Error submitting match:", error);
      const errorMsg = "Erreur lors de l'enregistrement";
      setErrorMessage(errorMsg);
      setErrors({ partnerName: errorMsg });
      setLoading(false);

      // Fermer automatiquement la notification après 5 secondes
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  return (
    <>
      {/* Notification de succès */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ animation: "fadeIn 0.3s ease-in" }}>
          <div className="relative mx-4 rounded-2xl bg-white p-8 shadow-2xl" style={{ animation: "zoomIn 0.3s ease-out" }}>
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center" style={{ animation: "bounce 1s ease-in-out infinite" }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ animation: "fadeIn 0.3s ease-in" }}>
          <div className="relative mx-4 max-w-md rounded-2xl bg-amber-500 p-8 shadow-2xl" style={{ animation: "zoomIn 0.3s ease-out" }}>
            <div className="text-center">
              <div className="mb-4 text-6xl">⚠️</div>
              <h2 className="mb-3 text-2xl font-bold text-white">Attention</h2>
              <p className="mb-6 text-base text-white/90">{warningMessage}</p>
              <button
                onClick={() => {
                  setWarningMessage(null);
                  // Forcer le rechargement du classement
                  if (typeof window !== "undefined") {
                    console.log('[MatchForm] ✅ Match confirmé ! Rechargement du classement...');

                    // Marquer le timestamp du match dans localStorage (pour le polling et cross-tab)
                    const matchTime = Date.now();
                    localStorage.setItem('lastMatchTime', matchTime.toString());
                    localStorage.setItem('matchSubmitted', 'true');

                    // Dispatch l'événement custom (pour les composants sur la même page)
                    const event = new CustomEvent("matchSubmitted", {
                      detail: {
                        timestamp: matchTime
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
                  // Rediriger vers l'historique après avoir cliqué sur "Compris"
                  setTimeout(() => {
                    logger.info("🔄 Redirecting to match history...");
                    router.push("/match/new?tab=history");
                  }, 300);
                }}
                className="rounded-xl bg-white/20 px-6 py-3 font-semibold text-white transition-all hover:bg-white/30 backdrop-blur-sm"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification d'erreur */}
      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ animation: "fadeIn 0.3s ease-in" }}>
          <div className="relative mx-4 max-w-md rounded-2xl bg-red-600 p-8 shadow-2xl" style={{ animation: "zoomIn 0.3s ease-out" }}>
            <div className="text-center">
              <div className="mb-4 text-6xl">⚠️</div>
              <h2 className="mb-3 text-2xl font-bold text-white">Erreur</h2>
              <p className="mb-6 text-base text-white/90">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage(null)}
                className="rounded-xl bg-white/20 px-6 py-3 font-semibold text-white transition-all hover:bg-white/30 backdrop-blur-sm"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

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

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <div className="mb-3 text-base font-semibold text-white">Lieu du match</div>
          <div className="space-y-4">
            <div className="relative">
              <select
                value={isUnregisteredClub ? "other" : selectedClubId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "other") {
                    setIsUnregisteredClub(true);
                    setSelectedClubId("");
                  } else {
                    setIsUnregisteredClub(false);
                    setSelectedClubId(val);
                  }
                  // Clear error
                  if (errors.location) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.location;
                      return newErrors;
                    });
                  }
                }}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white transition-all focus:border-padel-green focus:ring-1 focus:ring-padel-green outline-none"
                disabled={loadingClubs}
              >
                {!loadingClubs && clubs.length === 0 && <option value="" disabled>Aucun club rejoint</option>}
                {clubs.map((club) => (
                  <option key={club.id} value={club.id} className="text-gray-900">
                    {club.name} ({club.city})
                  </option>
                ))}
                <option value="other" className="text-gray-900 font-medium text-padel-green">
                  + Autre club (non listé)
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            {errors.location && (
              <p className="text-xs text-red-400">{errors.location}</p>
            )}

            {isUnregisteredClub && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/70">Nom du club *</label>
                  <input
                    type="text"
                    value={unregisteredClubName}
                    onChange={(e) => {
                      setUnregisteredClubName(e.target.value);
                      if (errors.unregisteredClubName) {
                        setErrors(prev => { const n = { ...prev }; delete n.unregisteredClubName; return n; });
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-all focus:border-padel-green focus:ring-1 focus:ring-padel-green outline-none placeholder:text-white/20"
                    placeholder="Ex: Urban Padel..."
                  />
                  {errors.unregisteredClubName && (
                    <p className="mt-1 text-xs text-red-400">{errors.unregisteredClubName}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/70">Ville *</label>
                  <input
                    type="text"
                    value={unregisteredClubCity}
                    onChange={(e) => {
                      setUnregisteredClubCity(e.target.value);
                      if (errors.unregisteredClubCity) {
                        setErrors(prev => { const n = { ...prev }; delete n.unregisteredClubCity; return n; });
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-all focus:border-padel-green focus:ring-1 focus:ring-padel-green outline-none placeholder:text-white/20"
                    placeholder="Ex: Nantes"
                  />
                  {errors.unregisteredClubCity && (
                    <p className="mt-1 text-xs text-red-400">{errors.unregisteredClubCity}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 text-base font-semibold text-white">Équipe 1</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">Vous</label>
              <input className="w-full cursor-not-allowed rounded-md border bg-gray-100 px-4 py-3 text-sm text-[#071554]/60" disabled value="Vous (connecté)" />
              {selfClubName && (
                <p className="mt-1.5 text-xs text-white/50 flex items-center gap-1.5 animate-in fade-in duration-300">
                  <Globe size={12} className="text-padel-green flex-shrink-0" />
                  <span>points pour classement de (<strong>{selfClubName}</strong>)</span>
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white">Partenaire</label>
              <div className="relative group">
                <PlayerAutocomplete
                  value={partnerName}
                  onChange={(value) => {
                    setPartnerName(value);
                    // Nettoyer l'erreur quand l'utilisateur tape
                    if (errors.partnerName) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.partnerName;
                        return newErrors;
                      });
                    }
                  }}
                  onSelect={(player) => {
                    setSelectedPlayers((prev) => ({ ...prev, partner: player }));
                    setScopes((prev) => ({ ...prev, partner: 'club' }));
                  }}
                  placeholder="Prénom et nom complet"
                  error={errors.partnerName}
                  searchScope={scopes.partner}
                  inputClassName="pr-[90px]"
                />
                <div className={`absolute z-10 flex items-center ${scopes.partner === 'guest'
                  ? 'top-3 right-5'
                  : 'right-1 top-[7px]'
                  }`}>
                  <div className="relative">
                    <select
                      value={scopes.partner}
                      onChange={(e) => setScopes(prev => ({ ...prev, partner: e.target.value as any }))}
                      className="appearance-none bg-white text-[#071554] text-[10px] font-bold rounded-md pl-2 pr-6 border-2 border-[#071554] cursor-pointer outline-none h-[32px] flex items-center"
                    >
                      <option value="club">Club</option>
                      <option value="global">Global</option>
                      <option value="guest">Invité</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#071554] stroke-[3px] pointer-events-none" />
                  </div>
                </div>
              </div>
              {selectedPlayers.partner && (
                <div className="mt-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  {selectedPlayers.partner.type === "user" ? (
                    <p className="text-xs text-white/50 flex items-center gap-1.5">
                      <Globe size={12} className="text-padel-green flex-shrink-0" />
                      <span>points pour classement de (<strong>{selectedPlayers.partner.club_name || "son club"}</strong>)</span>
                    </p>
                  ) : selectedPlayers.partner.email ? (
                    <p className="text-xs text-blue-300 flex items-center gap-1.5">
                      <Mail size={12} className="flex-shrink-0" />
                      <span>Une invitation sera envoyée par email</span>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-base font-semibold text-white">Équipe 2</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">Joueur 1</label>
              <div className="relative group">
                <PlayerAutocomplete
                  value={opp1Name}
                  onChange={(value) => {
                    setOpp1Name(value);
                    // Nettoyer l'erreur quand l'utilisateur tape
                    if (errors.opp1Name) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.opp1Name;
                        return newErrors;
                      });
                    }
                  }}
                  onSelect={(player) => {
                    setSelectedPlayers((prev) => ({ ...prev, opp1: player }));
                    setScopes((prev) => ({ ...prev, opp1: 'club' }));
                  }}
                  placeholder="Prénom et nom complet"
                  error={errors.opp1Name}
                  searchScope={scopes.opp1}
                  inputClassName="pr-[90px]"
                />
                <div className={`absolute z-10 flex items-center ${scopes.opp1 === 'guest'
                  ? 'top-3 right-5'
                  : 'right-1 top-[7px]'
                  }`}>
                  <div className="relative">
                    <select
                      value={scopes.opp1}
                      onChange={(e) => setScopes(prev => ({ ...prev, opp1: e.target.value as any }))}
                      className="appearance-none bg-white text-[#071554] text-[10px] font-bold rounded-md pl-2 pr-6 border-2 border-[#071554] cursor-pointer outline-none h-[32px] flex items-center"
                    >
                      <option value="club">Club</option>
                      <option value="global">Global</option>
                      <option value="guest">Invité</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#071554] stroke-[3px] pointer-events-none" />
                  </div>
                </div>
              </div>
              {selectedPlayers.opp1 && (
                <div className="mt-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  {selectedPlayers.opp1.type === "user" ? (
                    <p className="text-xs text-white/50 flex items-center gap-1.5">
                      <Globe size={12} className="text-padel-green flex-shrink-0" />
                      <span>points pour classement de (<strong>{selectedPlayers.opp1.club_name || "son club"}</strong>)</span>
                    </p>
                  ) : selectedPlayers.opp1.email ? (
                    <p className="text-xs text-blue-300 flex items-center gap-1.5">
                      <Mail size={12} className="flex-shrink-0" />
                      <span>Une invitation sera envoyée par email</span>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white">Joueur 2</label>
              <div className="relative group">
                <PlayerAutocomplete
                  value={opp2Name}
                  onChange={(value) => {
                    setOpp2Name(value);
                    // Nettoyer l'erreur quand l'utilisateur tape
                    if (errors.opp2Name) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.opp2Name;
                        return newErrors;
                      });
                    }
                  }}
                  onSelect={(player) => {
                    setSelectedPlayers((prev) => ({ ...prev, opp2: player }));
                    setScopes((prev) => ({ ...prev, opp2: 'club' }));
                  }}
                  placeholder="Prénom et nom complet"
                  error={errors.opp2Name}
                  searchScope={scopes.opp2}
                  inputClassName="pr-[90px]"
                />
                <div className={`absolute z-10 flex items-center ${scopes.opp2 === 'guest'
                  ? 'top-3 right-5'
                  : 'right-1 top-[7px]'
                  }`}>
                  <div className="relative">
                    <select
                      value={scopes.opp2}
                      onChange={(e) => setScopes(prev => ({ ...prev, opp2: e.target.value as any }))}
                      className="appearance-none bg-white text-[#071554] text-[10px] font-bold rounded-md pl-2 pr-6 border-2 border-[#071554] cursor-pointer outline-none h-[32px] flex items-center"
                    >
                      <option value="club">Club</option>
                      <option value="global">Global</option>
                      <option value="guest">Invité</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#071554] stroke-[3px] pointer-events-none" />
                  </div>
                </div>
              </div>
              {selectedPlayers.opp2 && (
                <div className="mt-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  {selectedPlayers.opp2.type === "user" ? (
                    <p className="text-xs text-white/50 flex items-center gap-1.5">
                      <Globe size={12} className="text-padel-green flex-shrink-0" />
                      <span>points pour classement de (<strong>{selectedPlayers.opp2.club_name || "son club"}</strong>)</span>
                    </p>
                  ) : selectedPlayers.opp2.email ? (
                    <p className="text-xs text-blue-300 flex items-center gap-1.5">
                      <Mail size={12} className="flex-shrink-0" />
                      <span>Une invitation sera envoyée par email</span>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-3 block text-sm font-medium text-white">Équipe gagnante</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWinner("1")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${winner === "1"
                  ? "border-padel-green bg-padel-green text-[#071554] shadow-lg shadow-padel-green/50"
                  : "border-white/30 bg-white/5 text-white hover:border-white/50 hover:bg-white/10"
                  }`}
              >
                <span className="flex items-center gap-1.5"><Trophy size={16} className={`flex-shrink-0 ${winner === "1" ? "text-[#071554]" : "text-white"}`} /> Équipe 1</span>
              </button>
              <button
                type="button"
                onClick={() => setWinner("2")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${winner === "2"
                  ? "border-padel-green bg-padel-green text-[#071554] shadow-lg shadow-padel-green/50"
                  : "border-white/30 bg-white/5 text-white hover:border-white/50 hover:bg-white/10"
                  }`}
              >
                <span className="flex items-center gap-1.5"><Trophy size={16} className={`flex-shrink-0 ${winner === "2" ? "text-[#071554]" : "text-white"}`} /> Équipe 2</span>
              </button>
            </div>
            {errors.winner && (
              <p className="mt-2 text-xs text-red-400">{errors.winner}</p>
            )}
          </div>
        </div>

        {/* Section Sets */}
        <div>
          <label className="mb-3 block text-sm font-medium text-white">Scores des sets *</label>
          <div className="space-y-4">
            {sets.map((set, index) => (
              <div key={set.setNumber} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white min-w-[80px]">Set {set.setNumber}</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-[#071554] text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={set.team1Score}
                    onChange={(e) => updateSet(index, "team1Score", e.target.value)}
                    placeholder="0"
                    ref={(el) => { setTeam1Refs.current[index] = el; }}
                  />
                  <span className="text-white">-</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-[#071554] text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={set.team2Score}
                    onChange={(e) => updateSet(index, "team2Score", e.target.value)}
                    placeholder="0"
                    ref={(el) => { setTeam2Refs.current[index] = el; }}
                  />
                  {errors[`set${set.setNumber}_team1`] && (
                    <span className="text-xs text-red-400">{errors[`set${set.setNumber}_team1`]}</span>
                  )}
                  {errors[`set${set.setNumber}_team2`] && (
                    <span className="text-xs text-red-400">{errors[`set${set.setNumber}_team2`]}</span>
                  )}
                  {errors[`set${set.setNumber}_min_score`] && (
                    <span className="text-xs text-red-400">{errors[`set${set.setNumber}_min_score`]}</span>
                  )}
                  {errors[`set${set.setNumber}_tie`] && (
                    <span className="text-xs text-red-400">{errors[`set${set.setNumber}_tie`]}</span>
                  )}
                </div>
                {/* Bouton supprimer pour les sets ajoutés (3, 4, 5) */}
                {index >= 2 && (
                  <button
                    type="button"
                    onClick={() => removeSet(index)}
                    className="ml-auto rounded-md border border-red-300 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    ✕ Supprimer
                  </button>
                )}
              </div>
            ))}
            {/* Bouton ajouter un set en dessous du 2e set */}
            {sets.length < 5 && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={addSet}
                  className="rounded-md border border-white/30 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition-all"
                >
                  + Ajouter un {sets.length === 2 ? "3e" : sets.length === 3 ? "4e" : "5e"} set
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tie Break */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <label className="block text-sm font-medium text-white">Tie Break</label>
            <button
              type="button"
              onClick={() => setHasTieBreak(!hasTieBreak)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${hasTieBreak
                ? "border-[#BFFF00] bg-[#BFFF00] text-black"
                : "border-white/30 bg-white/5 text-white hover:border-white/50"
                }`}
            >
              {hasTieBreak ? "✓ Activé" : "+ Ajouter"}
            </button>
          </div>
          {hasTieBreak && (
            <div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-[#071554] tabular-nums"
                  value={tieBreak.team1Score}
                  onChange={(e) => {
                    // Filtrer uniquement les chiffres (pas de limite pour le tie-break)
                    const v = e.target.value.replace(/\D/g, '');
                    const newTieBreak = { ...tieBreak, team1Score: v };
                    setTieBreak(newTieBreak);

                    // Nettoyer et réévaluer les erreurs du tie-break
                    const newErrors = { ...errors };
                    delete newErrors.tieBreak;

                    // Validation : au moins un des deux scores doit être 7 ou plus
                    const team1Score = parseInt(newTieBreak.team1Score) || 0;
                    const team2Score = parseInt(newTieBreak.team2Score) || 0;

                    if (team1Score > 0 && team2Score > 0) {
                      const hasValidScore = team1Score >= 7 || team2Score >= 7;
                      if (!hasValidScore) {
                        newErrors.tieBreak = "Au moins un des deux scores du tie-break doit être 7 ou plus";
                      }
                    }

                    setErrors(newErrors);

                    if (v.length >= 1) {
                      tieBreakTeam2Ref.current?.focus();
                    }
                  }}
                  placeholder="0"
                  ref={tieBreakTeam1Ref}
                />
                <span className="text-white">-</span>
                <input
                  type="text"
                  className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-[#071554] tabular-nums"
                  value={tieBreak.team2Score}
                  onChange={(e) => {
                    // Filtrer uniquement les chiffres (pas de limite pour le tie-break)
                    const v = e.target.value.replace(/\D/g, '');
                    const newTieBreak = { ...tieBreak, team2Score: v };
                    setTieBreak(newTieBreak);

                    // Nettoyer et réévaluer les erreurs du tie-break
                    const newErrors = { ...errors };
                    delete newErrors.tieBreak;

                    // Validation : au moins un des deux scores doit être 7 ou plus
                    const team1Score = parseInt(newTieBreak.team1Score) || 0;
                    const team2Score = parseInt(newTieBreak.team2Score) || 0;

                    if (team1Score > 0 && team2Score > 0) {
                      const hasValidScore = team1Score >= 7 || team2Score >= 7;
                      if (!hasValidScore) {
                        newErrors.tieBreak = "Au moins un des deux scores du tie-break doit être 7 ou plus";
                      }
                    }

                    setErrors(newErrors);

                    if (v.length >= 1) {
                      const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]');
                      submitBtn?.focus();
                    }
                  }}
                  placeholder="0"
                  ref={tieBreakTeam2Ref}
                />
              </div>
              {errors.tieBreak && (
                <p className="mt-2 text-xs text-red-400">{errors.tieBreak}</p>
              )}
            </div>
          )}
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

        <button disabled={loading} className="w-full rounded-md bg-padel-green px-4 py-3 font-semibold text-blue-950 transition-all hover:bg-padel-green/90 hover:shadow-lg disabled:opacity-50">Enregistrer</button>
      </form>
    </>
  );
}

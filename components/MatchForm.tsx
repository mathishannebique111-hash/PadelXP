"use client";

import { useRef, useState, useEffect } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";
import BadgeIconDisplay from "./BadgeIconDisplay";

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
});

export default function MatchForm({ 
  selfId
}: { 
  selfId: string;
}) {
  const router = useRouter();
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMatchLimitInfo, setShowMatchLimitInfo] = useState(true);
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
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasClickedUnderstood = localStorage.getItem('matchLimitInfoUnderstood') === 'true';
      setShowMatchLimitInfo(!hasClickedUnderstood);
    }
  }, []);
  
  const handleUnderstoodClick = () => {
    // Sauvegarder dans localStorage que l'utilisateur a compris
    if (typeof window !== 'undefined') {
      localStorage.setItem('matchLimitInfoUnderstood', 'true');
      setShowMatchLimitInfo(false);
    }
  };

  // Charger les stats de boost au montage
  useEffect(() => {
    async function loadBoostStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setBoostStats(null);
          setLoadingBoostStats(false);
          return;
        }

        const res = await fetch('/api/player/boost/stats');
        if (res.ok) {
          const data = await res.json();
          setBoostStats(data);
        } else {
          // Ne pas afficher d'erreur console si l'utilisateur n'a pas de profil (compte club)
          // Les comptes club n'ont pas besoin de stats de boost
          if (res.status !== 404) {
            console.error('Failed to load boost stats:', res.status, res.statusText);
          }
          setBoostStats(null);
        }
      } catch (error) {
        // Ne pas afficher d'erreur console si c'est une erreur silencieuse (compte club)
        if (error instanceof Error && !error.message.includes('404')) {
          console.error('Error loading boost stats:', error);
        }
        setBoostStats(null);
      } finally {
        setLoadingBoostStats(false);
      }
    }

    loadBoostStats();
  }, [supabase]);

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
      setSelectedPlayers((prev) => ({ ...prev, partner: validation.player }));
    } else if (fieldName === 'opp1Name') {
      setSelectedPlayers((prev) => ({ ...prev, opp1: validation.player }));
    } else if (fieldName === 'opp2Name') {
      setSelectedPlayers((prev) => ({ ...prev, opp2: validation.player }));
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
        console.error("Validate exact API error:", response.status, response.statusText, errorData);
        
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

      console.log(`Player validated for "${name}":`, {
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
        },
      };
    } catch (error) {
      console.error("Error validating exact player:", error instanceof Error ? error.message : String(error));
      return { 
        valid: false, 
        error: `Erreur lors de la validation du joueur "${name.trim()}". Veuillez réessayer.` 
      };
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Form submission started");
    const newErrors: Record<string, string> = {};
    setErrors({});
    setLoading(true);

    try {
      console.log("📋 Current state:", { partnerName, opp1Name, opp2Name, selectedPlayers });
      
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
          console.error("❌ Error fetching self profile from API:", profileRes.status, profileRes.statusText);
          if (profileRes.status === 404) {
            setErrorMessage("Votre profil n'a pas été trouvé. Veuillez contacter le support.");
          } else {
            setErrorMessage("Erreur lors de la vérification de votre profil. Veuillez réessayer.");
          }
          setLoading(false);
          return;
        }
        
        const profileData = await profileRes.json();
        
        console.log("🔍 Self profile data received:", {
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
          console.error("❌ Self profile missing first_name or last_name:", profileData);
          setErrorMessage("Votre profil doit avoir un prénom et un nom complet pour enregistrer un match. Veuillez compléter vos informations dans les paramètres de votre profil.");
          setLoading(false);
          return;
        }
        
        console.log("✅ Self profile validated:", {
          first_name: profileData.first_name,
          last_name: profileData.last_name
        });
      } catch (profileError) {
        console.error("❌ Error checking self profile:", profileError);
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
        console.log("🔍 Validating partner:", partnerName);
        const partnerValidation = await validateExactPlayer(partnerName);
        if (!partnerValidation.valid) {
          console.error("❌ Partner validation failed:", partnerValidation.error);
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
              console.log("✅ Partner validated:", partner);
            }
          }
        }
      }
      
      // Validation de l'opposant 1
      if (!opp1Name.trim()) {
        newErrors.opp1Name = "Indiquez un joueur (prénom et nom complet)";
      } else {
        console.log("🔍 Validating opp1:", opp1Name);
        const opp1Validation = await validateExactPlayer(opp1Name);
        if (!opp1Validation.valid) {
          console.error("❌ Opp1 validation failed:", opp1Validation.error);
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
              console.log("✅ Opp1 validated:", opp1);
            }
          }
        }
      }
      
      // Validation de l'opposant 2
      if (!opp2Name.trim()) {
        newErrors.opp2Name = "Indiquez un joueur (prénom et nom complet)";
      } else {
        console.log("🔍 Validating opp2:", opp2Name);
        const opp2Validation = await validateExactPlayer(opp2Name);
        if (!opp2Validation.valid) {
          console.error("❌ Opp2 validation failed:", opp2Validation.error);
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
              console.log("✅ Opp2 validated:", opp2);
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
        console.error("❌ Validation errors:", filteredErrors);
        setErrors(filteredErrors);
        setLoading(false);
        return; // Ne pas effacer les données du formulaire
      }

      // S'assurer que tous les joueurs sont validés
      if (!partner || !opp1 || !opp2) {
        console.error("❌ Some players are missing after validation");
        setErrors({ 
          partnerName: !partner ? "Erreur de validation du partenaire" : "",
          opp1Name: !opp1 ? "Erreur de validation du joueur 1" : "",
          opp2Name: !opp2 ? "Erreur de validation du joueur 2" : "",
        });
        setLoading(false);
        return;
      }

      console.log("✅ All players validated:", { partner, opp1, opp2 });

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

      console.log("🔧 Preparing players data...");
      
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
      
      console.log("✅ Players data prepared:", players);

      // Validation des sets
      console.log("🔍 Validating sets...");
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
        console.error("❌ Sets validation errors:", setsErrors);
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
        console.error("❌ Sets validation errors:", setsErrors);
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
        console.error("❌ Match validation errors:", setsErrors);
        setErrors(setsErrors);
        setLoading(false);
        return;
      }
      
      console.log("✅ Sets validated successfully");

      // Vérifier que tous les sets ont des scores valides avant d'envoyer
      const validSets = sets.filter(set => set.team1Score.trim() && set.team2Score.trim());
      if (validSets.length !== sets.length) {
        console.error("❌ Some sets have empty scores");
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
        useBoost: useBoost && boostStats?.canUse, // Seulement si le joueur peut utiliser un boost
      };
      
      console.log("📤 Données envoyées à l'API:", JSON.stringify(payload, null, 2));
      console.log("📤 Structure détaillée:", {
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
      
      console.log("📥 Response status:", res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log("✅ Match submitted successfully:", data);
        
        // Gérer les messages de boost
        if (data.boostApplied) {
          console.log("⚡ Boost applied:", data.boostPointsInfo);
          // Le message de succès inclura les infos du boost
        } else if (data.boostError) {
          console.warn("⚠️ Boost error:", data.boostError);
          // Afficher l'erreur de boost mais ne pas bloquer le match
        }

        // Afficher un avertissement si des joueurs ont atteint la limite
        if (data.warning) {
          console.warn("⚠️ Warning:", data.warning);
          setWarningMessage(data.warning);
          // Pas de redirection automatique, le joueur doit cliquer sur "Compris"
        } else {
          // Créer le message de succès avec les infos du boost si appliqué
          let successMessage = "Match enregistré avec succès !";
          if (data.boostApplied && data.boostPointsInfo) {
            successMessage += ` Boost appliqué : ${data.boostPointsInfo.before} → ${data.boostPointsInfo.after} points (+30%) !`;
          }
          
          setShowSuccess(true);
          setLoading(false);
          // Redirection automatique seulement si pas d'avertissement
          setTimeout(() => {
            console.log("🔄 Redirecting to match history...");
            window.location.href = "/matches/history";
          }, 2000);
        }
        
        setLoading(false);
      } else {
        let errorMsg = "Erreur lors de l'enregistrement";
        try {
          const errorData = await res.json();
          console.log("🔍 Error data complet:", JSON.stringify(errorData, null, 2));
          console.error("❌ Match submission failed:", res.status, errorData);
          errorMsg = errorData?.error || errorData?.message || `Erreur ${res.status}: ${res.statusText}`;
        } catch (parseError) {
          console.error("❌ Failed to parse error response:", parseError);
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
      console.error("❌ Error submitting match:", error);
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
              <p className="text-sm text-gray-500">Le classement a été mis à jour automatiquement.</p>
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
                  // Rediriger vers l'historique après avoir cliqué sur "Compris"
                  setTimeout(() => {
                    console.log("🔄 Redirecting to match history...");
                    window.location.href = "/matches/history";
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
      {showMatchLimitInfo && (
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
        <div className="mb-3 text-base font-semibold text-white">Équipe 1</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Vous</label>
            <input className="w-full cursor-not-allowed rounded-md border bg-gray-100 px-4 py-3 text-sm text-gray-600" disabled value="Vous (connecté)" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Partenaire</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => {
                setPartnerName(e.target.value);
                // Nettoyer l'erreur quand l'utilisateur tape
                if (errors.partnerName) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.partnerName;
                    return newErrors;
                  });
                }
              }}
              onBlur={() => {
                if (partnerName.trim()) {
                  validatePlayerField('partnerName', partnerName);
                }
              }}
              placeholder="Prénom et nom complet"
              className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.partnerName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {errors.partnerName && (
              <div className="mt-1 text-xs text-red-400">{errors.partnerName}</div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 text-base font-semibold text-white">Équipe 2</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Joueur 1</label>
            <input
              type="text"
              value={opp1Name}
              onChange={(e) => {
                setOpp1Name(e.target.value);
                // Nettoyer l'erreur quand l'utilisateur tape
                if (errors.opp1Name) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.opp1Name;
                    return newErrors;
                  });
                }
              }}
              onBlur={() => {
                if (opp1Name.trim()) {
                  validatePlayerField('opp1Name', opp1Name);
                }
              }}
              placeholder="Prénom et nom complet"
              className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.opp1Name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {errors.opp1Name && (
              <div className="mt-1 text-xs text-red-400">{errors.opp1Name}</div>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Joueur 2</label>
            <input
              type="text"
              value={opp2Name}
              onChange={(e) => {
                setOpp2Name(e.target.value);
                // Nettoyer l'erreur quand l'utilisateur tape
                if (errors.opp2Name) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.opp2Name;
                    return newErrors;
                  });
                }
              }}
              onBlur={() => {
                if (opp2Name.trim()) {
                  validatePlayerField('opp2Name', opp2Name);
                }
              }}
              placeholder="Prénom et nom complet"
              className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.opp2Name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {errors.opp2Name && (
              <div className="mt-1 text-xs text-red-400">{errors.opp2Name}</div>
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
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                winner === "1"
                  ? "border-[#BFFF00] bg-[#BFFF00] text-black shadow-lg shadow-[#BFFF00]/50"
                  : "border-white/30 bg-white/5 text-white hover:border-white/50 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-1.5"><BadgeIconDisplay icon="🏆" size={16} className="flex-shrink-0" /> Équipe 1</span>
            </button>
            <button
              type="button"
              onClick={() => setWinner("2")}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                winner === "2"
                  ? "border-[#BFFF00] bg-[#BFFF00] text-black shadow-lg shadow-[#BFFF00]/50"
                  : "border-white/30 bg-white/5 text-white hover:border-white/50 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-1.5"><BadgeIconDisplay icon="🏆" size={16} className="flex-shrink-0" /> Équipe 2</span>
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
                  type="text"
                  className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-gray-900 tabular-nums"
                  value={set.team1Score}
                  onChange={(e) => updateSet(index, "team1Score", e.target.value)}
                  placeholder="0"
                  maxLength={2}
                  ref={(el) => (setTeam1Refs.current[index] = el)}
                />
                <span className="text-white">-</span>
                <input
                  type="text"
                  className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-gray-900 tabular-nums"
                  value={set.team2Score}
                  onChange={(e) => updateSet(index, "team2Score", e.target.value)}
                  placeholder="0"
                  maxLength={2}
                  ref={(el) => (setTeam2Refs.current[index] = el)}
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
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
              hasTieBreak
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
                className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-gray-900 tabular-nums"
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
                className="w-20 rounded-md border bg-white px-3 py-2 text-sm text-gray-900 tabular-nums"
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

      {/* Option boost - placé juste avant le bouton Enregistrer */}
      {!loadingBoostStats && boostStats && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex items-center justify-center">
              <Image 
                src="/images/Éclair page avis.png" 
                alt="Éclair" 
                width={24} 
                height={24} 
                className="flex-shrink-0"
                unoptimized
              />
            </div>
            <div className="flex-1">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={useBoost}
                  onChange={(e) => setUseBoost(e.target.checked)}
                  disabled={!boostStats.canUse}
                  className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-sm font-semibold text-white">
                  Appliquer un boost (+30% de points si tu gagnes)
                </span>
              </label>
              {boostStats.canUse && (
                <p className="mt-2 text-xs text-white/70">
                  Tu as <strong className="font-semibold text-blue-300">{boostStats.creditsAvailable}</strong> boost{boostStats.creditsAvailable > 1 ? 's' : ''} disponible{boostStats.creditsAvailable > 1 ? 's' : ''}. 
                  {boostStats.usedThisMonth > 0 && (
                    <> {boostStats.usedThisMonth} boost{boostStats.usedThisMonth > 1 ? 's' : ''} utilisé{boostStats.usedThisMonth > 1 ? 's' : ''} ce mois-ci ({boostStats.remainingThisMonth} restant{boostStats.remainingThisMonth > 1 ? 's' : ''}).</>
                  )}
                </p>
              )}
              {!boostStats.canUse && (
                <p className="mt-2 text-xs text-white/70">
                  {boostStats.creditsAvailable === 0 
                    ? "Tu n'as plus de boosts disponibles. " 
                    : `Tu as déjà utilisé ${boostStats.usedThisMonth} boost${boostStats.usedThisMonth > 1 ? 's' : ''} ce mois-ci (limite de 10). `}
                  <a href="/boost" className="font-semibold text-blue-300 underline hover:text-blue-200">
                    Achète-en de nouveaux
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <button disabled={loading} className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg disabled:opacity-50">Enregistrer</button>
    </form>
    </>
  );
}

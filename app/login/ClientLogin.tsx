"use client";

import PlayerClubGate from "@/components/auth/PlayerClubGate";
import ProfilePhotoCrop from "@/components/auth/ProfilePhotoCrop";
import { useState, useRef } from "react";
import { logger } from '@/lib/logger';
import { createClient } from "@/lib/supabase/client";
import { capitalizeFullName } from "@/lib/utils/name-utils";
import Image from "next/image";

export default function ClientLogin() {
  const [step, setStep] = useState(1);
  const [clubInfo, setClubInfo] = useState<{ name: string; slug: string; invitationCode: string; code: string }>({ name: "", slug: "", invitationCode: "", code: "" });
  const [showClubInvalid, setShowClubInvalid] = useState(false);
  const [showReferralCode, setShowReferralCode] = useState(false);
  
  // Données de l'étape 1 stockées localement
  const [step1Data, setStep1Data] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    profilePhoto: File | null;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    profilePhoto: null,
  });

  // Photo de profil (avatar rond 80x80px)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Code de parrainage
  const [referralCode, setReferralCode] = useState("");
  const [referralCodeValidating, setReferralCodeValidating] = useState(false);
  const [referralCodeStatus, setReferralCodeStatus] = useState<{
    valid: boolean;
    error?: string;
    referrerName?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step1Session, setStep1Session] = useState<any>(null); // Session créée à l'étape 1

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Veuillez sélectionner une image");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("L'image est trop grande (maximum 5MB)");
        return;
      }
      // Afficher le modal de recadrage
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageSrc = reader.result as string;
        setImageToCrop(imageSrc);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Convertir le Blob en File
    const croppedFile = new File([croppedImageBlob], "profile-photo.png", {
      type: "image/png",
    });
    
    // Mettre à jour les données
    setStep1Data({ ...step1Data, profilePhoto: croppedFile });
    
    // Créer une preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    
    // Fermer le modal
    setShowCropModal(false);
    setImageToCrop(null);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validation du code de parrainage
  const validateReferralCode = async (code: string) => {
    if (!code || code.trim().length === 0) {
      setReferralCodeStatus(null);
      return;
    }

    setReferralCodeValidating(true);
    try {
      const response = await fetch("/api/referrals/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur lors de la validation" }));
        setReferralCodeStatus({
          valid: false,
          error: errorData.error || "Erreur lors de la validation",
        });
        return;
      }

      const data = await response.json();
      setReferralCodeStatus({
        valid: data.valid || false,
        error: data.error || undefined,
        referrerName: data.referrerName || undefined,
      });
    } catch (error) {
      setReferralCodeStatus({
        valid: false,
        error: "Erreur lors de la validation",
      });
    } finally {
      setReferralCodeValidating(false);
    }
  };

  const handleReferralCodeChange = (value: string) => {
    setReferralCode(value);
    setReferralCodeStatus(null);
    if (value.trim().length > 0) {
      setTimeout(() => validateReferralCode(value), 500);
    }
  };

  // Gestion de la soumission de l'étape 1
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!step1Data.firstName.trim() || !step1Data.lastName.trim() || !step1Data.email.trim() || !step1Data.password.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Capitaliser les noms
      const { firstName: capitalizedFirstName, lastName: capitalizedLastName } = capitalizeFullName(
        step1Data.firstName.trim(),
        step1Data.lastName.trim()
      );

      // Essayer de créer le compte pour vérifier si l'email existe déjà
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: step1Data.email.trim(),
        password: step1Data.password,
        options: {
          data: {
            first_name: capitalizedFirstName,
            last_name: capitalizedLastName,
          },
        },
      });

      if (signUpError) {
        logger.error("[ClientLogin] SignUp error at step 1:", signUpError);
        
        // Vérifier si l'erreur indique que l'email existe déjà
        const errorMessage = signUpError.message?.toLowerCase() || '';
        if (
          errorMessage.includes('user already registered') ||
          errorMessage.includes('email already registered') ||
          errorMessage.includes('already registered') ||
          errorMessage.includes('user already exists') ||
          errorMessage.includes('email already exists')
        ) {
          setError("Un compte est déjà associé à cette adresse email.");
          setLoading(false);
          return;
        }

        // Pour les autres erreurs, on affiche le message d'erreur générique
        if (signUpError.message?.includes("Database") || signUpError.message?.includes("database")) {
          setError("Erreur lors de la vérification. Veuillez réessayer ou contacter le support.");
        } else {
          setError(signUpError.message || "Erreur lors de la vérification. Veuillez réessayer.");
        }
        setLoading(false);
        return;
      }

      // Si le compte a été créé avec succès, on stocke la session pour l'étape 2
      // Si l'email nécessite une confirmation, data.session sera null mais le compte est créé
      // Dans ce cas, on passera quand même à l'étape 2 et on se reconnectera à l'étape 2
      
      if (data) {
        setStep1Session(data);
      }
      
      setStep(2);
      setLoading(false);
    } catch (e: any) {
      logger.error("[ClientLogin] Unexpected error at step 1:", e);
      setError(e?.message || "Erreur lors de la vérification. Veuillez réessayer.");
      setLoading(false);
    }
  };

  // Soumission finale de l'étape 2
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Vérifier le code d'invitation
      const slug = (clubInfo.slug || "").trim();
      const expected = (clubInfo.invitationCode || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
      const input = (clubInfo.code || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");

      if (!slug) {
        setError("Sélectionnez votre club / complexe");
        setShowClubInvalid(true);
        setLoading(false);
        return;
      }

      if (!expected) {
        setError("Le code d'invitation du club est indisponible. Réessayez ou contactez le club.");
        setLoading(false);
        return;
      }

      if (!input) {
        setError("Saisissez le code d'invitation reçu");
        setShowClubInvalid(true);
        setLoading(false);
        return;
      }

      if (input !== expected) {
        setError("Code d'invitation incorrect pour ce club / complexe");
        setShowClubInvalid(true);
        setLoading(false);
        return;
      }

      // Vérifier le code de parrainage si fourni
      if (referralCode.trim().length > 0) {
        if (!referralCodeStatus || !referralCodeStatus.valid) {
          setError(referralCodeStatus?.error || "Code de parrainage invalide");
          setLoading(false);
          return;
        }
      }

      // Capitaliser les noms
      const { firstName: capitalizedFirstName, lastName: capitalizedLastName } = capitalizeFullName(
        step1Data.firstName.trim(),
        step1Data.lastName.trim()
      );

      // Obtenir le token d'accès
      // Si le compte a déjà été créé à l'étape 1, utiliser la session existante
      let accessToken: string | null = null;
      
      if (step1Session?.session?.access_token) {
        // Utiliser la session de l'étape 1
        accessToken = step1Session.session.access_token;
      } else {
        // Le compte a été créé à l'étape 1 mais sans session (email confirmation requise)
        // Se connecter pour obtenir le token
        const supabase = createClient();
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
          email: step1Data.email, 
          password: step1Data.password 
        });
        if (signInError || !signInData.session) {
          throw new Error("Connexion nécessaire pour finaliser l'inscription");
        }
        accessToken = signInData.session?.access_token || null;
      }

      if (!accessToken) {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData.session?.access_token || null;
      }

      // Attacher le club
      const displayName = `${capitalizedFirstName} ${capitalizedLastName}`.trim();
      const response = await fetch('/api/player/attach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          slug,
          code: input,
          firstName: capitalizedFirstName,
          lastName: capitalizedLastName,
          displayName,
          email: step1Data.email,
          referralCode: referralCode.trim().length > 0 ? referralCode.trim() : undefined,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Impossible d'attacher le club");
      }

      const attachData = await response.json();
      
      // Uploader la photo de profil
      if (step1Data.profilePhoto && accessToken) {
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(step1Data.profilePhoto!);
          });

          await fetch('/api/player/profile-photo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              photo_payload: {
                data: base64Data,
                mime: step1Data.profilePhoto.type,
                filename: step1Data.profilePhoto.name,
              },
            }),
          });
        } catch (photoError) {
          logger.error('[ClientLogin] Error uploading profile photo:', photoError);
          // Ne pas bloquer l'inscription si l'upload de la photo échoue
        }
      }

      if (attachData.referralProcessed) {
        sessionStorage.setItem("referral_reward_received", "true");
      }

      window.location.href = "/home";
    } catch (e: any) {
      logger.error("[ClientLogin] Error:", e);
      setError(e?.message || "Impossible de créer le compte");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
              step >= 1 ? 'bg-[#0066FF] text-white' : 'bg-white/10 text-white/50'
            }`}>
              1
            </div>
            <span className={`text-sm font-medium transition-colors duration-300 ${step >= 1 ? 'text-white' : 'text-white/50'}`}>
              Vos informations
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors duration-300 ${step >= 2 ? 'text-white' : 'text-white/50'}`}>
              Votre club
            </span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
              step >= 2 ? 'bg-[#0066FF] text-white' : 'bg-white/10 text-white/50'
            }`}>
              2
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#0066FF] to-[#003D99] transition-all duration-300 ease-out"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>
        <p className="text-center text-xs text-white/50 mt-2">
          Étape {step}/2
        </p>
      </div>

      <h1 className={`text-xl font-extrabold mb-2 transition-all duration-300 ${step === 1 ? 'opacity-100' : 'opacity-70'}`}>
        {step === 1 ? "Vos informations" : "Votre club"}
      </h1>
      <p className="text-white/70 mb-5 text-xs opacity-70">
        {step === 1 
          ? "Créez votre compte en quelques secondes" 
          : "Associez votre compte à votre club / complexe"}
      </p>

      {error && (
        <div className="rounded-md border border-red-400 bg-red-900/20 px-3 py-2 text-xs text-red-400 mb-4">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form
          onSubmit={handleStep1Submit}
          className="space-y-4 transition-all duration-300"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          {/* Prénom + Nom côte à côte */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] text-white/70 mb-0.5">
                Prénom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Prénom"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                value={step1Data.firstName}
                onChange={(e) => setStep1Data({ ...step1Data, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/70 mb-0.5">
                Nom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nom"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                value={step1Data.lastName}
                onChange={(e) => setStep1Data({ ...step1Data, lastName: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] text-white/70 mb-0.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="Email"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              value={step1Data.email}
              onChange={(e) => setStep1Data({ ...step1Data, email: e.target.value })}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-[10px] text-white/70 mb-0.5">
              Mot de passe <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="Mot de passe"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              value={step1Data.password}
              onChange={(e) => setStep1Data({ ...step1Data, password: e.target.value })}
            />
          </div>

          {/* Bouton Continuer */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
          >
            {loading ? "Vérification..." : "Continuer"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleFinalSubmit}
          className="space-y-4 transition-all duration-300"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          {/* Club / complexe */}
          <PlayerClubGate 
            onChange={setClubInfo} 
            showInvalidState={showClubInvalid} 
          />

          {/* Code d'invitation */}
          {/* Le PlayerClubGate contient déjà le champ code d'invitation */}

          {/* Photo de profil - Avatar rond 80x80px cliquable */}
          <div>
            <label className="block text-[10px] text-white/70 mb-2">
              Photo de profil (optionnel)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden hover:border-white/20 transition-colors cursor-pointer flex-shrink-0"
              >
                {profilePhotoPreview ? (
                  <Image
                    src={profilePhotoPreview}
                    alt="Photo de profil"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-8 h-8 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 opacity-70">
                  Cliquez pour ajouter une photo de profil
                </p>
                {profilePhotoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePhotoPreview(null);
                      setStep1Data({ ...step1Data, profilePhoto: null });
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="mt-1 text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Code de parrainage - Caché par défaut */}
          {showReferralCode && (
            <div className="space-y-2 transition-all duration-300 animate-fadeIn">
              <label className="block text-[10px] text-white/70 mb-0.5">
                Code de parrainage (optionnel)
              </label>
              <input
                type="text"
                placeholder="Code de parrainage"
                className={`w-full rounded-lg bg-white/5 border px-2.5 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 ${
                  referralCodeStatus?.valid
                    ? "border-green-500/50 focus:ring-green-500"
                    : referralCodeStatus?.valid === false
                    ? "border-red-500/50 focus:ring-red-500"
                    : "border-white/10 focus:ring-[#0066FF]"
                }`}
                value={referralCode}
                onChange={(e) => handleReferralCodeChange(e.target.value.toUpperCase())}
                maxLength={8}
              />
              {referralCodeValidating && (
                <p className="text-xs text-white/60">Vérification du code...</p>
              )}
              {referralCodeStatus?.valid && referralCodeStatus.referrerName && (
                <p className="text-xs text-green-400">
                  ✓ Code valide ! Parrain : {referralCodeStatus.referrerName}
                </p>
              )}
              {referralCodeStatus?.valid === false && referralCodeStatus.error && (
                <p className="text-xs text-red-400">{referralCodeStatus.error}</p>
              )}
            </div>
          )}

          {!showReferralCode && (
            <button
              type="button"
              onClick={() => setShowReferralCode(true)}
              className="text-xs text-white/70 hover:text-white underline transition-colors"
            >
              J'ai un code de parrainage
            </button>
          )}

          {/* Boutons Retour et Créer mon compte */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl px-4 py-3 font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/30 transition-all"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
            >
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 text-center text-sm text-white/70">
        Déjà membre ? <a href="/player/login" className="underline">Se connecter</a>
      </div>

      {/* Modal de recadrage */}
      {showCropModal && imageToCrop && (
        <ProfilePhotoCrop
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

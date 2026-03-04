'use client';

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import HideSplashScreen from "@/components/HideSplashScreen";
import { Plus, ChevronLeft, ChevronRight, User, Trophy, Swords, Star, TrendingUp, Flame, FileText, Sparkles } from "lucide-react";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

import { ProfilePreview, MatchesPreview, CompetitionPreview } from "@/components/white-label/PreviewScreens";

const isLightColor = (color: string) => {
  const hex = color.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

const hexToRgbNumbers = (hex: string) => {
  const h = hex.replace('#', '');
  if (h.length < 6) return "0, 0, 0";
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

// ============================================================
// COMPOSANT DE PRÉVISUALISATION LIVE
// ============================================================
interface PhonePreviewProps {
  bg: string;
  secondary: string;
  activeScreen: number;
  logoUrl?: string | null;
  textColor: string;
  mutedColor: string;
  iconColor: string;
  clubName?: string;
  clubCity?: string;
  clubData?: {
    street?: string;
    postalCode?: string;
    phone?: string;
    numberOfCourts?: string;
    courtType?: string;
  };
}

const PhonePreview = ({ bg, secondary, activeScreen, logoUrl, textColor, mutedColor, iconColor, clubName, clubCity, clubData }: Omit<PhonePreviewProps, 'accent'>) => {
  return (
    <div
      className="rounded-[48px] border-[4px] border-[#1c1c1e] overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] w-full max-w-[240px] ml-0 aspect-[9/19.5] flex flex-col relative transition-colors duration-500 pb-12 ring-[1px] ring-inset ring-white/10"
      style={{
        background: bg,
        // @ts-ignore
        "--theme-page": hexToRgbNumbers(bg),
        "--theme-accent": hexToRgbNumbers(secondary),
        "--theme-secondary-accent": hexToRgbNumbers(secondary),
        "--theme-text": textColor,
        "--theme-text": hexToRgbNumbers(textColor),
        "--theme-text-muted": mutedColor,
      } as React.CSSProperties}
    >
      {/* Background Reflection Effect */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-[44px]">
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-white/5 to-transparent rotate-[25deg] pointer-events-none"></div>
      </div>

      {/* Dynamic Island */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[68px] h-[22px] bg-black rounded-full z-[100] flex items-center justify-between px-2 shadow-sm ring-1 ring-white/5">
        <div className="w-[5px] h-[5px] rounded-full bg-[#0a0a0a] shadow-[inset_0_0_2px_rgba(255,255,255,0.2)]"></div>
        <div className="w-[5px] h-[5px] rounded-full bg-[#121212] overflow-hidden relative">
          <div className="absolute inset-0 rounded-full border border-white/5"></div>
          <div className="absolute top-0.5 right-0.5 w-[1.5px] h-[1.5px] bg-blue-500/60 rounded-full blur-[0.5px]"></div>
        </div>
      </div>

      {/* Status bar mockup */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 relative z-20">
        <div className="text-[8px] font-bold pl-1 tracking-tight" style={{ color: textColor }}>14:27</div>
        <div className="flex gap-0.5 items-center mr-1 mt-0.5">
          <div className="flex items-end gap-[1px] h-2">
            <div className="w-[1.5px] h-[3px] rounded-sm" style={{ background: textColor }}></div>
            <div className="w-[1.5px] h-[4px] rounded-sm" style={{ background: textColor }}></div>
            <div className="w-[1.5px] h-[6px] rounded-sm" style={{ background: textColor }}></div>
            <div className="w-[1.5px] h-[8px] rounded-sm" style={{ background: mutedColor }}></div>
          </div>
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-2.5 h-2.5 ml-0.5" style={{ color: textColor }}>
            <path d="M12 21L23.6 6C23 5.4 18.5 2 12 2C5.5 2 1 5.4 0.4 6L12 21Z" />
          </svg>
          <div className="w-4 h-2 rounded-[2px] border flex items-center p-[0.3px] ml-0.5 relative" style={{ borderColor: mutedColor }}>
            <div className="h-full w-[80%] rounded-[1px]" style={{ background: textColor }}></div>
            <div className="absolute -right-[1.5px] top-1/2 -translate-y-1/2 w-[1.5px] h-1 rounded-r-sm bg-current" style={{ backgroundColor: mutedColor }}></div>
          </div>
        </div>
      </div>

      {/* App Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-1 relative z-20">
        <div className="w-4"></div> {/* Spacer for centering */}
        <div className="flex-1 flex justify-center">
          <img
            src={logoUrl || "/images/Logo sans fond.png"}
            alt={logoUrl ? "Club Logo" : "PadelXP"}
            className="h-[20px] object-contain ml-4"
          />
        </div>
        <div className="flex items-center gap-1">
          <div style={{ color: iconColor }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-3 py-1 overflow-hidden flex flex-col relative z-10 w-full">
        {activeScreen === 0 ? (
          <ProfilePreview clubName={clubName} clubCity={clubCity} clubData={clubData} logoUrl={logoUrl} accentColor={secondary} backgroundColor={bg} />
        ) : activeScreen === 1 ? (
          <MatchesPreview clubName={clubName} clubCity={clubCity} accentColor={secondary} backgroundColor={bg} />
        ) : (
          <CompetitionPreview clubName={clubName} accentColor={secondary} backgroundColor={bg} />
        )}
      </div>

      {/* App Floating Bottom Nav */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-30 px-4">
        <div className="bg-white rounded-[20px] px-3 py-1.5 flex justify-between items-center w-full shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-slate-100">
          {[
            { label: "Profil", idx: 0, badge: null },
            { label: "Matchs", idx: 1, badge: 2 },
            { label: "Compétition", idx: 2, badge: 4 },
          ].map((item) => {
            const isActive = activeScreen === item.idx;
            const iconClass = `w-4 h-4 shrink-0 transition-colors ${isActive ? "" : "text-slate-400"}`;
            const iconStyle = isActive ? { color: secondary } : {};
            return (
              <div key={item.label} className="flex-1 flex flex-col items-center justify-center relative px-2 cursor-pointer">
                <div className="relative">
                  {item.idx === 0 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} style={iconStyle}>
                      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z"></path>
                      <path d="M9 22V14h6v8"></path>
                    </svg>
                  )}
                  {item.idx === 1 && <Swords className={iconClass} strokeWidth={2} style={iconStyle} />}
                  {item.idx === 2 && <Trophy className={iconClass} strokeWidth={2} style={iconStyle} />}
                  {item.badge && (
                    <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border-[1.5px] border-white">
                      {item.badge}
                    </div>
                  )}
                </div>
                <span className={`text-[6px] font-bold mt-0.5 transition-colors ${isActive ? "" : "text-slate-400"}`} style={isActive ? { color: secondary } : {}}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* iOS Home Indicator */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-[var(--theme-secondary-accent)] rounded-full z-40"></div>
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function ClientClubIdentityPage() {
  const supabase = createClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // 2 couleurs de personnalisation (Primaire supprimée)
  const [secondaryColor, setSecondaryColor] = useState("#CCFF00");
  const [backgroundColor, setBackgroundColor] = useState("#172554");
  const [clubNameInput, setClubNameInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [streetInput, setStreetInput] = useState("");
  const [postalCodeInput, setPostalCodeInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [numberOfCourtsInput, setNumberOfCourtsInput] = useState("");
  const [courtTypeInput, setCourtTypeInput] = useState("");
  const [subdomainInput, setSubdomainInput] = useState("");

  // Calcul du Score de Visibilité (9 champs suivis)
  const visibilityFields = [
    clubNameInput, cityInput, streetInput, postalCodeInput, phoneInput,
    numberOfCourtsInput, courtTypeInput, subdomainInput, logoFile
  ];
  const filledCount = visibilityFields.filter(f => {
    if (typeof f === 'string') return f.trim().length > 0;
    return !!f; // Pour le logo
  }).length;
  const visibilityScore = Math.round((filledCount / visibilityFields.length) * 100);

  // Carousel de prévisualisation
  const [previewScreen, setPreviewScreen] = useState(0);

  const handleSubmit = async () => {
    if (!formRef.current?.reportValidity()) return;

    setLoading(true);
    const fd = new FormData(formRef.current);
    const clubName = String(fd.get('club_name') || '').trim();
    const postal = String(fd.get('postal_code') || '').trim();
    const street = String(fd.get('street') || '').trim();
    const city = String(fd.get('city') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const website = String(fd.get('website') || '').trim();
    const number_of_courts = String(fd.get('number_of_courts') || '').trim();
    const court_type = String(fd.get('court_type') || '').trim();
    const subdomain = String(fd.get('subdomain') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Nouveaux champs pour la création de compte administrateur
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '').trim();
    const firstName = String(fd.get('first_name') || '').trim();
    const lastName = String(fd.get('last_name') || '').trim();

    let ownerEmail = typeof window !== 'undefined' ? sessionStorage.getItem('onboarding_email') || '' : '';
    let ownerPassword = typeof window !== 'undefined' ? sessionStorage.getItem('onboarding_password') || '' : '';

    try {
      setErrorMessage(null);

      // 1. Création du compte si les champs sont fournis
      if (email && password && firstName && lastName) {
        const signupResponse = await fetch("/api/clubs/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        if (!signupResponse.ok) {
          const errorData = await signupResponse.json().catch(() => ({}));
          throw new Error(errorData?.error || "Impossible de créer le compte administrateur");
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError || !signInData.session) {
          throw new Error(signInError?.message || "Impossible de se connecter après la création du compte");
        }

        await supabase.auth.refreshSession();

        ownerEmail = email;
        ownerPassword = password;

        if (typeof window !== 'undefined') {
          sessionStorage.setItem("onboarding_email", email);
          sessionStorage.setItem("onboarding_password", password);
        }
      }

      let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token;

      if (!accessToken && ownerEmail && ownerPassword) {
        const { data: reauthData, error: reauthError } = await supabase.auth.signInWithPassword({
          email: ownerEmail,
          password: ownerPassword,
        });
        if (reauthError || !reauthData.session) {
          throw new Error(reauthError?.message || "Impossible de finaliser l'inscription. Veuillez recommencer.");
        }
        await supabase.auth.refreshSession();
        accessToken = reauthData.session.access_token;
      }

      if (!accessToken) {
        throw new Error("Session expirée. Compte administrateur requis pour créer le club.");
      }

      let encodedLogo: { filename: string; mime: string; data: string } | null = null;
      if (logoFile) {
        const arrayBuffer = await logoFile.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        encodedLogo = {
          filename: logoFile.name,
          mime: logoFile.type || "image/png",
          data: base64,
        };
      }

      const response = await fetch('/api/clubs/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: clubName,
          postal_code: postal,
          street,
          city,
          phone,
          website: website || null,
          number_of_courts: number_of_courts ? Number(number_of_courts) : null,
          court_type,
          subdomain: subdomain || undefined,
          primary_color: secondaryColor, // On utilise la couleur d'accent pour les deux
          secondary_color: secondaryColor,
          background_color: backgroundColor,
          owner_email: ownerEmail || undefined,
          logo_payload: encodedLogo,
          user_metadata: {
            postal_code: postal,
            club_name: clubName,
          },
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Détails de l'erreur API:", errorData);
        if (errorData?.details) {
          throw new Error(`Données invalides : ${JSON.stringify(errorData.details)}`);
        }
        throw new Error(errorData?.error || "Impossible d'enregistrer le club");
      }

      const data = await response.json();

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('club_name', clubName);
        sessionStorage.setItem('club_postal', postal);
        if (data?.club?.slug) sessionStorage.setItem('club_slug', data.club.slug);
        if (data?.club?.code_invitation) sessionStorage.setItem('club_invitation_code', data.club.code_invitation);
        sessionStorage.setItem('club_signup_success', '1');
        sessionStorage.removeItem('onboarding_password');
      }

      // REDIRECTION AUTOMATIQUE VERS LE SOUS-DOMAINE SI DISPONIBLE
      if (subdomain) {
        const currentHost = window.location.host;
        const currentProtocol = window.location.protocol;
        const baseHost = currentHost.replace(/^(www\.|[a-z0-9-]+\.)?/, '');
        window.location.href = `${currentProtocol}//${subdomain}.${baseHost}/dashboard`;
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]";
  const labelClass = "text-[9px] text-white/50 uppercase tracking-wider ml-1";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-4 py-8 overflow-hidden">
      <HideSplashScreen />
      {/* Background global */}
      <div className="absolute inset-0 bg-[#172554] z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0 pointer-events-none" />

      {/* Logo en haut à gauche - Raffiné */}
      <div className="absolute top-4 left-8 z-20 pointer-events-none">
        <img
          src="/images/Logo sans fond.png"
          alt="PadelXP Logo"
          className="w-20 h-auto object-contain opacity-90 drop-shadow-2xl"
        />
      </div>

      <div className="relative z-[50] w-full max-w-7xl px-4 lg:px-12 animate-fadeIn mt-0 mb-6 ml-auto mr-2 lg:mr-6">
        {errorMessage && (
          <div className="max-w-2xl mx-auto rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-200 mb-6 text-center">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

            {/* ========================================= */}
            {/* COLONNE GAUCHE : Fiche du Complexe */}
            {/* ========================================= */}
            <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl p-5 h-full flex flex-col space-y-4">
              <h1 className="text-lg font-extrabold flex items-center gap-2 mb-1">
                <FileText size={18} className="text-white/40" />
                Fiche de votre complexe
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className={labelClass}>Nom du club / complexe</label>
                  <input
                    name="club_name"
                    required
                    placeholder="Ex: Padel Club Bastia"
                    className={inputClass}
                    value={clubNameInput}
                    onChange={(e) => setClubNameInput(e.target.value)}
                  />
                </div>

                {/* Section Compte Administrateur */}
                <div className="col-span-2 mt-2 mb-1 border-t border-white/10 pt-3">
                  <h3 className="text-xs font-bold text-white/70 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <User size={12} /> Compte Administrateur
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelClass}>Prénom</label>
                      <input name="first_name" required placeholder="Prénom" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Nom</label>
                      <input name="last_name" required placeholder="Nom" className={inputClass} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className={labelClass}>Email professionnel</label>
                      <input name="email" required type="email" placeholder="Email" className={inputClass} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className={labelClass}>Mot de passe</label>
                      <input name="password" required type="password" placeholder="Mot de passe" className={inputClass} minLength={6} />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 mt-2 mb-1 border-t border-white/10 pt-3">
                  <h3 className="text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
                    Coordonnées du complexe
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Adresse (Rue)</label>
                  <input name="street" required placeholder="Rue" className={inputClass} value={streetInput} onChange={(e) => setStreetInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Code Postal</label>
                  <input name="postal_code" required type="text" placeholder="Code postal" inputMode="numeric" pattern="^[0-9]{5}$" maxLength={5} className={inputClass} value={postalCodeInput} onChange={(e) => setPostalCodeInput(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Ville</label>
                  <input name="city" required placeholder="Ville" className={inputClass} value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Téléphone</label>
                  <input name="phone" required placeholder="Téléphone" inputMode="tel" className={inputClass} value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className={labelClass}>Site Web (optionnel)</label>
                  <input name="website" placeholder="https://..." type="url" className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Nombre de terrains</label>
                  <input name="number_of_courts" required placeholder="Nb terrains" type="number" min="1" className={inputClass} value={numberOfCourtsInput} onChange={(e) => setNumberOfCourtsInput(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Type de terrains</label>
                  <select name="court_type" required className={`${inputClass} appearance-none`} value={courtTypeInput} onChange={(e) => setCourtTypeInput(e.target.value)}>
                    <option value="" disabled className="bg-[#1e293b]">Type</option>
                    <option value="Couverts" className="bg-[#1e293b]">Couverts</option>
                    <option value="Extérieurs" className="bg-[#1e293b]">Extérieurs</option>
                    <option value="Mixte" className="bg-[#1e293b]">Mixte</option>
                  </select>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                <div className="text-[9px] text-white/20 italic">
                  Toutes les informations ci-dessus seront visibles par les joueurs.
                </div>

                {/* Section pour équilibrer la hauteur */}
                <div className="hidden lg:block space-y-3 bg-black/20 rounded-xl p-4 border border-white/5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#0066FF] font-black uppercase tracking-widest">Score de visibilité</span>
                    <span className="text-[10px] text-white/60 font-bold">{visibilityScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0066FF] to-cyan-400 transition-all duration-500 ease-out"
                      style={{ width: `${visibilityScore}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-white/40 leading-relaxed">
                    Complétez toutes les informations pour maximiser votre référencement auprès des joueurs de la région.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5 shadow-sm">
                      <div className="text-[8px] text-white/30 uppercase mb-1">Status</div>
                      <div className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-green-400 animate-ping" />
                        Prêt
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5 shadow-sm">
                      <div className="text-[8px] text-white/30 uppercase mb-1">Indexation</div>
                      <div className="text-[10px] font-bold text-white uppercase tracking-tighter italic">Optimisée</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================= */}
            {/* COLONNE DROITE : Personnalisation App */}
            {/* ========================================= */}
            <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl p-5 space-y-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2 mb-1">
                <Sparkles size={18} className="text-white/40" />
                Personnalisation de votre Application
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Sous-domaine */}
                <div className="space-y-0.5 col-span-2 md:col-span-1">
                  <label className={labelClass}>Sous-domaine App</label>
                  <div className="flex items-center shadow-inner rounded-l-lg overflow-hidden">
                    <input
                      name="subdomain"
                      required
                      placeholder="ex: amiens"
                      pattern="[a-z0-9-]+"
                      value={subdomainInput}
                      onChange={(e) => setSubdomainInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] border-r-0"
                    />
                    <span className="bg-white/10 border border-white/10 border-l-0 text-white/50 rounded-r-lg px-2.5 py-1.5 text-xs whitespace-nowrap">.padelxp.eu</span>
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-0.5 text-right">
                  <label className={labelClass}>Identité Visuelle (Logo)</label>
                  <label className="group flex items-center justify-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 cursor-pointer hover:bg-white/10 transition-all border-dashed hover:border-white/30">
                    <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">{logoPreview ? "Changer" : "Logo"}</span>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-7 h-7 rounded-lg object-cover ring-2 ring-white/10 shadow-lg" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                        <Plus size={14} />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setLogoFile(f);
                          setLogoPreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 bg-white/5 p-2 rounded-xl border border-white/10 shadow-sm relative overflow-hidden group">
                  <label className="text-[9px] text-white/70 uppercase tracking-widest font-bold ml-1">Couleur Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-8 w-12 rounded-lg cursor-pointer border-2 border-white/20 bg-transparent p-0 transition-transform hover:scale-105"
                    />
                    <span className="text-[9px] text-white/50 font-mono font-bold tracking-tight">{secondaryColor}</span>
                  </div>
                </div>

                <div className="space-y-1 bg-white/5 p-2 rounded-xl border border-white/10 shadow-sm relative overflow-hidden group">
                  <label className="text-[9px] text-white/70 uppercase tracking-widest font-bold ml-1">Fond d'écran</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="h-8 w-12 rounded-lg cursor-pointer border-2 border-white/20 bg-transparent p-0 transition-transform hover:scale-105"
                    />
                    <span className="text-[9px] text-white/50 font-mono font-bold tracking-tight">{backgroundColor}</span>
                  </div>
                </div>
              </div>

              {/* ========================================= */}
              {/* PREVIEW EN TEMPS RÉEL */}
              {/* ========================================= */}
              <div className="rounded-xl bg-black/40 border border-white/10 p-4 shadow-2xl relative overflow-hidden min-h-[620px] flex flex-col">
                <div className="flex items-center justify-end mb-4 relative z-20">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setPreviewScreen((p) => (p + 2) % 3)}
                      className="w-6 h-6 rounded-lg bg-[#0066FF] flex items-center justify-center hover:bg-[#0066FFCC] transition-all shadow-[0_4px_10px_rgba(0,102,255,0.4)] active:scale-95"
                    >
                      <ChevronLeft size={14} className="text-white" />
                    </button>
                    <div className="flex flex-col items-center min-w-[70px]">
                      <span className="text-[9px] font-black text-white uppercase italic leading-none tracking-tighter">
                        {["Profil", "Matchs", "Classement"][previewScreen]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewScreen((p) => (p + 1) % 3)}
                      className="w-6 h-6 rounded-lg bg-[#0066FF] flex items-center justify-center hover:bg-[#0066FFCC] transition-all shadow-[0_4px_10px_rgba(0,102,255,0.4)] active:scale-95"
                    >
                      <ChevronRight size={14} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Calcul du mode clair/sombre pour la prévisualisation */}
                {(() => {
                  const lightMode = isLightColor(backgroundColor);
                  const textColorPreview = lightMode ? "#0f172a" : "#ffffff";
                  const mutedColorPreview = lightMode ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.4)";
                  const iconColorPreview = lightMode ? "#1e293b" : "#ffffff";

                  return (
                    <div className="relative z-10 pointer-events-none flex-1 -mt-10 overflow-hidden">
                      <div className="transform scale-100 origin-top-left">
                        <PhonePreview
                          bg={backgroundColor}
                          secondary={secondaryColor}
                          activeScreen={previewScreen}
                          logoUrl={logoPreview}
                          textColor={textColorPreview}
                          mutedColor={mutedColorPreview}
                          iconColor={iconColorPreview}
                          clubName={clubNameInput || undefined}
                          clubCity={cityInput || undefined}
                          clubData={{
                            street: streetInput || undefined,
                            postalCode: postalCodeInput || undefined,
                            phone: phoneInput || undefined,
                            numberOfCourts: numberOfCourtsInput || undefined,
                            courtType: courtTypeInput || undefined,
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Footer Disclaimer - Fixed at the very bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/80 backdrop-blur-md border-t border-white/10 z-30">
                  <p className="text-[9px] text-white/60 font-medium text-center leading-tight italic">
                    * Le rendu de cet aperçu peut varier légèrement par rapport à l'application réelle.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* BOUTON FINAL + CGU */}
          {/* ========================================= */}
          <div className="flex flex-col items-center pt-4 border-t border-white/10 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full max-w-lg py-3 rounded-2xl text-white text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,102,255,0.4)] bg-gradient-to-r from-[#0066FF] to-[#0066FF88] relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? "Création du compte..." : "Valider l'inscription du club"}
            </button>
            <div className="text-[9px] text-white/30 font-medium uppercase tracking-[0.1em]">
              En validant, vous acceptez les <span className="text-white/60 underline cursor-pointer">Conditions Générales d'Utilisation</span>.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

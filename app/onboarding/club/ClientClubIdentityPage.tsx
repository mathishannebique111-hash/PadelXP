'use client';

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import HideSplashScreen from "@/components/HideSplashScreen";

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

export default function ClientClubIdentityPage() {
  const supabase = createClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

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
    const ownerEmail = typeof window !== 'undefined' ? sessionStorage.getItem('onboarding_email') || '' : '';
    const ownerPassword = typeof window !== 'undefined' ? sessionStorage.getItem('onboarding_password') || '' : '';

    try {
      setErrorMessage(null);

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
        throw new Error("Session expirée. Veuillez recommencer l'inscription.");
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
          owner_email: ownerEmail,
          logo_payload: encodedLogo,
          user_metadata: {
            postal_code: postal,
            club_name: clubName,
          },
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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

      router.push('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-4 py-8 overflow-hidden">
      <HideSplashScreen />
      {/* Background global */}
      <div className="absolute inset-0 bg-[#172554] z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0 pointer-events-none" />

      {/* Logo en haut - Ajusté pour ne pas être caché */}
      <div className="absolute top-6 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <img
          src="/images/Logo sans fond.png"
          alt="PadelXP Logo"
          className="w-24 h-auto object-contain opacity-90 drop-shadow-2xl"
        />
      </div>

      <div className="relative z-[50] w-full max-w-2xl rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl p-6 animate-fadeIn mt-16 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">Inscription Club</div>
          <div className="text-[9px] text-white/30 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/5">Étape 2 / 2</div>
        </div>
        <h1 className="text-xl font-extrabold mb-4">Fiche de votre complexe</h1>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-200 mb-4">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Nom du club / complexe</label>
              <input name="club_name" required placeholder="Ex: Padel Club Bastia" className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Adresse (Rue)</label>
              <input name="street" required placeholder="Rue" className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Code Postal</label>
              <input
                name="postal_code"
                required
                type="text"
                placeholder="Code postal"
                inputMode="numeric"
                pattern="^[0-9]{5}$"
                maxLength={5}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Ville</label>
              <input name="city" required placeholder="Ville" className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Téléphone</label>
              <input name="phone" required placeholder="Téléphone" inputMode="tel" className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Site Web (optionnel)</label>
              <input name="website" placeholder="https://..." type="url" className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Nombre de terrains</label>
              <input name="number_of_courts" required placeholder="Nb terrains" type="number" min="1" className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Type de terrains</label>
              <select
                name="court_type"
                required
                className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] appearance-none"
                defaultValue=""
              >
                <option value="" disabled className="bg-[#1e293b]">Type</option>
                <option value="Couverts" className="bg-[#1e293b]">Couverts</option>
                <option value="Extérieurs" className="bg-[#1e293b]">Extérieurs</option>
                <option value="Mixte" className="bg-[#1e293b]">Mixte</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Logo</label>
              <label className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2 h-20 cursor-pointer hover:bg-white/10 transition-all border-dashed hover:border-white/30">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/20" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
                <span className="text-[9px] text-white/40 text-center font-medium">Ajouter</span>
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

            <div className="space-y-1">
              <label className="text-[9px] text-white/50 uppercase tracking-wider ml-1">Photos (3-6)</label>
              <label className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2 h-20 cursor-pointer hover:bg-white/10 transition-all border-dashed hover:border-white/30">
                <div className="flex -space-x-1.5">
                  {galleryPreviews.length > 0 ? (
                    galleryPreviews.slice(0, 3).map((src: string, i: number) => (
                      <img key={i} src={src} className="w-6 h-6 rounded-lg object-cover ring-1 ring-black" />
                    ))
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-white/40 text-center font-medium">
                  {galleryPreviews.length > 0 ? `${galleryPreviews.length} photos` : "Ajouter"}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 6);
                    const urls = files.map((f) => URL.createObjectURL(f as File));
                    setGalleryPreviews(urls);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5">
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,102,255,0.4)]"
              style={{ background: "linear-gradient(135deg,#0066FF,#003D99)" }}
            >
              {loading ? "Création..." : "Finaliser l'inscription"}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-[9px] text-white/20">
          <p>En créant votre club, vous acceptez nos CGV/CGU.</p>
        </div>
      </div>
    </div>
  );
}

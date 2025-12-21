'use client';

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from '@/lib/logger';

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
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-white/80 hover:text-white">← Retour</Link>
          <div className="text-sm text-white/60">Inscription • Étape 2 / Fiche club</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <section className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-extrabold">Présentez votre club</h1>
          <form ref={formRef} className="grid gap-4">
            {errorMessage && (
              <div className="rounded-lg border border-red-400 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}
            <input name="club_name" required placeholder="Nom du club" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="street" required placeholder="Rue" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <input
                name="postal_code"
                required
                type="text"
                placeholder="Code postal"
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="^[0-9]{5}$"
                title="Code postal à 5 chiffres"
                maxLength={5}
                className="px-4 py-3 rounded-lg bg-white/5 border border-white/10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="city" required placeholder="Ville" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <input name="phone" required placeholder="Téléphone" inputMode="tel" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
            </div>
            <input name="website" placeholder="Site web (optionnel)" type="url" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
            <p className="text-xs text-white/50">Le site web, le logo et les photos sont facultatifs et pourront être ajoutés plus tard.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="number_of_courts" required placeholder="Nombre de terrains" type="number" min="1" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <select
                name="court_type"
                required
                className="px-4 py-3 rounded-lg bg-white/5 border border-white/10"
                defaultValue=""
              >
                <option value="" disabled>Type de terrains</option>
                <option value="Couverts">Couverts</option>
                <option value="Extérieurs">Extérieurs</option>
                <option value="Mixte">Mixte</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-dashed border-white/15 bg-gradient-to-b from-white/5 to-transparent p-4 hover:border-white/25 transition-colors">
                <label className="block text-sm text-white/70 mb-3">Upload Logo</label>
                <label className="group flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 py-8 cursor-pointer hover:bg-white/10 transition-colors">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/70 group-hover:text-white"><path d="M12 5v14m-7-7h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-sm text-white/70">Glissez-déposez ou cliquez pour choisir</span>
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
                {logoPreview && (
                  <div className="mt-3">
                    <img src={logoPreview} alt="Prévisualisation logo" className="h-24 w-24 rounded-lg object-cover ring-2 ring-white/20" />
                  </div>
                )}
                <p className="mt-3 text-xs text-white/50">Formats recommandés: PNG/SVG • 1024×1024 minimum, fond transparent si possible.</p>
              </div>

              <div className="rounded-xl border border-dashed border-white/15 bg-gradient-to-b from-white/5 to-transparent p-4 hover:border-white/25 transition-colors">
                <label className="block text-sm text-white/70 mb-3">Upload 3 à 6 photos</label>
                <label className="group flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 py-8 cursor-pointer hover:bg-white/10 transition-colors">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/70 group-hover:text-white"><path d="M12 5v14m-7-7h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-sm text-white/70">Sélectionnez plusieurs images (3 à 6)</span>
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
                {galleryPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {galleryPreviews.map((src, i) => (
                      <img key={i} src={src} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-lg object-cover ring-1 ring-white/15" />
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-white/50">JPG/PNG conseillés • Ratio 4:3 ou 16:9 • 1200px+.</p>
              </div>
            </div>
            <p className="text-white/60 text-sm">Ces informations alimentent votre page publique et l’inscription des joueurs.</p>
            <div className="flex gap-3">
                  <button
                type="button"
                onClick={async () => {
                  if (formRef.current?.reportValidity()) {
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
                      if (sessionError) {
                        throw new Error("Impossible de récupérer la session Supabase. Reconnectez-vous.");
                      }
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
                        try {
                          await fetch('/api/auth/callback', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ event: 'SIGNED_IN', session: reauthData.session }),
                          });
                        } catch (callbackError) {
                          logger.warn('[ClubIdentity] auth callback failed', callbackError);
                        }
                        sessionData = reauthData;
                      }

                      if (!accessToken) {
                        const refreshed = await supabase.auth.refreshSession();
                        accessToken = refreshed.data.session?.access_token || accessToken;
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
                              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
                        const errorText = await response.text();
                        let errorMessage = "Impossible d'enregistrer le club";
                        if (errorText) {
                          try {
                            const errorData = JSON.parse(errorText);
                            errorMessage = errorData?.error || errorMessage;
                            logger.error("[ClubIdentity] register failure", errorData);
                          } catch (parseError) {
                            errorMessage = errorText;
                            logger.error("[ClubIdentity] register failure (text)", errorText);
                          }
                        }
                        throw new Error(errorMessage);
                      }

                      const data = await response.json();

                      await supabase.auth.getSession();

                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('club_name', clubName);
                          sessionStorage.setItem('club_postal', postal);
                          if (data?.club?.slug) {
                            sessionStorage.setItem('club_slug', data.club.slug);
                          }
                          if (data?.club?.code_invitation) {
                            sessionStorage.setItem('club_invitation_code', data.club.code_invitation);
                          }
                          sessionStorage.removeItem('club_logo_url');
                          sessionStorage.setItem('club_signup_success', '1');
                          sessionStorage.removeItem('onboarding_password');
                        }

                      router.push('/dashboard');
                    } catch (error) {
                      const message = error instanceof Error ? error.message : "Erreur lors de l'enregistrement";
                      setErrorMessage(message);
                    }
                  }
                }}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold inline-block text-center"
              >
                    Créer mon compte
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

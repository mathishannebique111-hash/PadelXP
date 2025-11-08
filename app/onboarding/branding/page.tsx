"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

function hexToRgb(hex: string) {
  const h = hex.replace('#','');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 } as const;
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (v:number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(a: string, b: string) {
  const L1 = luminance(a) + 0.05;
  const L2 = luminance(b) + 0.05;
  return Math.max(L1, L2) / Math.min(L1, L2);
}

export default function BrandingPage() {
  const router = useRouter();
  const [primaryColor, setPrimaryColor] = useState("#00CC99");
  const [secondaryColor, setSecondaryColor] = useState("#0066FF");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const handleBrandKitImport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      // JSON simple { primary, secondary }
      try {
        const json = JSON.parse(text);
        if (typeof json.primary === 'string') setPrimaryColor(json.primary.startsWith('#') ? json.primary : `#${json.primary}`);
        if (typeof json.secondary === 'string') setSecondaryColor(json.secondary.startsWith('#') ? json.secondary : `#${json.secondary}`);
      } catch {
        // fallback: extraire les 2 premiers hex du fichier css/txt
        const matches = Array.from(text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)).map(m => m[0]);
        if (matches[0]) setPrimaryColor(matches[0]);
        if (matches[1]) setSecondaryColor(matches[1]);
      }
    } catch {}
  };

  const handleContinue = () => {
    // Sauvegarder les couleurs (optionnel: sessionStorage ou API)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("club_primary_color", primaryColor);
      sessionStorage.setItem("club_secondary_color", secondaryColor);
      if (logoUrl) sessionStorage.setItem("club_logo_url", logoUrl);
      sessionStorage.setItem("club_theme_mode", darkMode ? "dark" : "light");
    }
    router.push("/onboarding/invite");
  };

  return (
    <div className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-white text-gray-900"}>
      <header className={darkMode ? "sticky top-0 z-40 bg-black/60 backdrop-blur border-b border-white/10" : "sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-black/10"}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/onboarding/club" className={darkMode ? "text-white/80 hover:text-white" : "text-gray-600 hover:text-gray-900"}>← Retour</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className={darkMode ? "text-white/60" : "text-gray-500"}>{darkMode ? "Mode sombre" : "Mode clair"}</span>
            <button
              type="button"
              onClick={() => setDarkMode(v => !v)}
              className={darkMode ? "px-3 py-1 rounded-full border border-white/20 hover:bg-white/10" : "px-3 py-1 rounded-full border border-black/10 hover:bg-black/5"}
            >Basculer</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <section className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-extrabold">Vos couleurs, votre identité</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sélecteurs de couleurs */}
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Couleur primaire</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-12 w-20 rounded-lg border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono"
                      placeholder="#00CC99"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-white/70 mb-2">Couleur secondaire</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-12 w-20 rounded-lg border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono"
                      placeholder="#0066FF"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <label className="block text-sm text-white/70">Importer un kit de marque (facultatif)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.css,.txt"
                    className="hidden"
                    onChange={(e) => handleBrandKitImport(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 transition-colors text-sm"
                  >
                    Importer couleurs (JSON/CSS)
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogoUrl(URL.createObjectURL(f)); }} />
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 transition-colors text-sm">Importer un logo (PNG/JPG/SVG)</button>
                    </div>
                    <button type="button" onClick={() => { setPrimaryColor('#00CC99'); setSecondaryColor('#0066FF'); setLogoUrl(null); }} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">Revenir aux valeurs système</button>
                  </div>
                  <p className="mt-2 text-xs text-white/50">JSON: {`{ "primary": "#00CC99", "secondary": "#0066FF" }`} • Contraste vérifié dans l’aperçu.</p>
                </div>
              </div>
            </div>

            {/* Aperçu live */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-sm font-semibold text-white/70 mb-4">Aperçu live</h2>
              <div className="space-y-4">
                {/* Barre d’onglets */}
                <div className="flex gap-4 border-b border-white/10 pb-2">
                  {["Tableau de bord","Membres","Classement","Challenges","Page club"].map((t,i) => (
                    <div key={t} className={`text-sm pb-2 ${i===0? 'font-semibold' : ''}`} style={ i===0 ? { borderBottom: `2px solid ${primaryColor}`, color: primaryColor } : { color: '#a3a3a3' } }>{t}</div>
                  ))}
                </div>

                {/* Aperçu classement */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50 mb-2">Classement</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: `${primaryColor}20` }}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🥇</span>
                        <span className="text-sm">Joueur 1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded bg-white/10 overflow-hidden"><div className="h-full" style={{ width: '80%', background: primaryColor }} /></div>
                        <button className="px-2 py-1 rounded text-xs text-white" style={{ background: primaryColor }}>Voir le profil</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🥈</span>
                        <span className="text-sm">Joueur 2</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded bg-white/10 overflow-hidden"><div className="h-full" style={{ width: '60%', background: secondaryColor }} /></div>
                        <button className="px-2 py-1 rounded text-xs" style={{ border: `1px solid ${secondaryColor}`, color: secondaryColor }}>Inviter</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aperçu boutons */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50 mb-2">Boutons</div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                      style={{
                        background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
                      }}
                    >
                      Action principale
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                      style={{
                        borderColor: primaryColor,
                        color: primaryColor
                      }}
                    >
                      Action secondaire
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-white/60">
                    Contraste texte/blanc: {contrastRatio(primaryColor, '#ffffff').toFixed(2)}:1 • vs fond sombre: {contrastRatio(primaryColor, '#0b0b0f').toFixed(2)}:1
                  </div>
                </div>

                {/* Aperçu cartes */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50 mb-2">Cartes</div>
                  <div className="p-3 rounded-lg border" style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }}>
                    <div className="text-sm font-semibold mb-1">Carte exemple</div>
                    <div className="text-xs text-white/60">Contenu de la carte avec accent coloré</div>
                  </div>
                </div>

                {/* Bloc Challenge */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center gap-4">
                  <div className="w-24 h-16 rounded bg-white/10 flex items-center justify-center text-xs text-white/60">Image</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Challenge Automne — 24/02</div>
                    <div className="text-xs text-white/60">Objectif : 10 matchs • Durée : 1 mois</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${secondaryColor}22`, color: secondaryColor }}>En cours</span>
                  <button className="px-3 py-2 rounded-lg text-sm text-white" style={{ background: primaryColor }}>Participer</button>
                </div>

                {/* Bandeau page publique */}
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <div className="h-28 bg-[linear-gradient(to_right,rgba(0,0,0,.5),rgba(0,0,0,.2))]" />
                  {logoUrl && (
                    <img src={logoUrl} alt="logo club" className="absolute left-4 top-4 w-12 h-12 rounded bg-white/10 p-1" />
                  )}
                  <div className="absolute inset-0 flex items-end justify-between p-4">
                    <div>
                      <div className="text-lg font-bold">Nom du club</div>
                      <div className="text-xs opacity-70">Ville • 4 terrains • Padel</div>
                    </div>
                    <div className="flex gap-2">
                      <a className="px-3 py-2 rounded-md text-white" style={{ background: primaryColor }}>Rejoindre</a>
                      <a className="px-3 py-2 rounded-md border" style={{ borderColor: secondaryColor, color: secondaryColor }}>Découvrir</a>
                    </div>
                  </div>
                </div>

                {/* Mini feed */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-xs text-white/50">Feed</div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full border-2" style={{ borderColor: secondaryColor }} />
                    <div className="text-sm"><strong>Camille</strong> gagne 6‑3 / 6‑4 contre Alex</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full border-2" style={{ borderColor: secondaryColor }} />
                    <div className="text-sm">🎖️ <span style={{ color: primaryColor }}>Badge “Rookie Star”</span> débloqué</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleContinue}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold hover:shadow-lg transition-all"
            >
              Appliquer et continuer
            </button>
            <Link
              href="/onboarding/club"
              className="px-6 py-3 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 transition-colors"
            >
              Retour
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}


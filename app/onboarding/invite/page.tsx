"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function buildInvitationCode(name: string, postal: string) {
  // Code = NOMCOMPLET (collé, majuscule) + CODEPOSTAL
  const upper = name
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return (upper + (postal || "")).trim() || `CLUB${postal || "00000"}`;
}

function buildInvitePath(name: string, postal: string) {
  // Lien = nom complet en minuscule (collé, sans espaces ni %20) + code postal
  const lower = name
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return `${lower}${postal || ""}`;
}

export default function InvitePage() {
  const [clubName, setClubName] = useState("");
  const [postal, setPostal] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setClubName(sessionStorage.getItem("club_name") || "");
      setPostal(sessionStorage.getItem("club_postal") || "");
    }
  }, []);

  const inviteCode = useMemo(() => buildInvitationCode(clubName, postal), [clubName, postal]);
  const invitePath = useMemo(() => buildInvitePath(clubName, postal), [clubName, postal]);
  const inviteLink = useMemo(() => `https://padelapp.fr/join/${invitePath}`,[invitePath]);
  const [showQR, setShowQR] = useState(false);
  // SVG sans fond pour transparence
  const qrSrc = useMemo(
    () => showQR ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&data=${encodeURIComponent(inviteLink)}` : "",
    [inviteLink, showQR]
  );

  async function saveWithPicker(defaultName: string, mime: string, data: Blob) {
    const anyWin: any = window as any;
    if (anyWin.showSaveFilePicker) {
      try {
        const handle = await anyWin.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{ description: mime, accept: { [mime]: [`.${defaultName.split('.').pop()}`] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        return;
      } catch {}
    }
    // Si non supporté, ne rien faire (pas de fallback de téléchargement automatique)
    return;
  }

  const downloadSvg = async () => {
    if (!qrSrc) return;
    const res = await fetch(qrSrc);
    const blob = await res.blob();
    await saveWithPicker(`qr_${invitePath}.svg`, 'image/svg+xml', blob);
  };

  const downloadPng = async () => {
    if (!qrSrc) return;
    // Convertir SVG -> PNG via canvas
    const res = await fetch(qrSrc);
    const svgText = await res.text();
    const img = new Image();
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = svgUrl; });
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 800; // grand format pour impression
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // rendre transparent, pas de fond
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    URL.revokeObjectURL(svgUrl);
    const pngBlob: Blob = await new Promise((resolve) => canvas.toBlob((b)=> resolve(b as Blob), 'image/png'));
    await saveWithPicker(`qr_${invitePath}.png`, 'image/png', pngBlob);
  };

  const downloadPdf = async () => {
    if (!qrSrc) return;
    // Charger jsPDF depuis CDN si non présent
    const anyWin: any = window as any;
    async function ensureJsPDF(): Promise<any> {
      if (anyWin.jspdf?.jsPDF) return anyWin.jspdf.jsPDF;
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('jsPDF load error'));
        document.body.appendChild(s);
      });
      return anyWin.jspdf.jsPDF;
    }
    try {
      // Convertir en PNG pour l’insérer dans le PDF
      const res = await fetch(qrSrc);
      const svgText = await res.text();
      const img = new Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = svgUrl; });
      const canvas = document.createElement('canvas');
      canvas.width = 800; canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      URL.revokeObjectURL(svgUrl);
      const pngDataUrl = canvas.toDataURL('image/png');

      const JsPDF = await ensureJsPDF();
      const doc = new JsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      // Dimensionner le QR sur ~400pt et centrer
      const size = 400; const x = (pageWidth - size) / 2; const y = 100;
      doc.addImage(pngDataUrl, 'PNG', x, y, size, size);
      const pdfBlob = doc.output('blob');
      await saveWithPicker(`qr_${invitePath}.pdf`, 'application/pdf', pdfBlob);
    } catch {}
  };
  const downloadQrAsPdf = () => {
    if (!qrSrc) return;
    // Ouvre une fenêtre imprimable: l’utilisateur peut choisir "Enregistrer au format PDF"
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset='utf-8' />
          <title>QR Code</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; background:#ffffff; }
            img { width:520px; height:520px; }
          </style>
        </head>
        <body>
          <img src='${qrSrc}' alt='QR code' />
          <script>window.onload = ()=> setTimeout(()=> window.print(), 150);<\/script>
        </body>
      </html>`;
    w.document.write(html);
    w.document.close();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/onboarding/club" className="text-white/80 hover:text-white">← Retour</Link>
          <div className="text-sm text-white/60">Inscription • Invitez vos joueurs</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <section className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-extrabold">Invitez vos joueurs</h1>

          {/* Cartes accentuées */}
            <div className="space-y-5">
            {/* Carte dégradée bord à bord */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{background: 'linear-gradient(90deg,#00CC99 0%,#0066FF 100%)'}}>
              <div className="p-6">
                <div className="text-sm font-semibold tracking-wide uppercase opacity-90 text-white mb-3 text-center">Code d’invitation</div>
                <div className="text-2xl font-extrabold tracking-wider text-white text-center mb-4">{inviteCode}</div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={async () => { const ok = await copy(inviteCode); setCopiedCode(ok); setTimeout(()=>setCopiedCode(false), 1500); }}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-base font-semibold backdrop-blur-sm"
                  >
                    📋 Copier
                  </button>
                  {copiedCode && <span className="text-xs text-white/90">Copié !</span>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold tracking-wide uppercase text-white/80 mb-3 text-center">Lien d’invitation</div>
              <div className="text-base font-semibold truncate text-center mb-4">{inviteLink}</div>
              <div className="flex flex-col items-center gap-1">
                <button onClick={async () => { const ok = await copy(inviteLink); setCopiedLink(ok); setTimeout(()=>setCopiedLink(false), 1500); }} className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 text-base font-semibold">📋 Copier</button>
                {copiedLink && <span className="text-xs text-white/70">Copié !</span>}
              </div>
            </div>

            {/* QR code (affiché après clic) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center gap-4">
              {!showQR ? (
                <button
                  onClick={() => { setShowQR(true); }}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold"
                >
                  Générer un QR code
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <img src={qrSrc} alt="QR code d’invitation" className="w-60 h-60" />
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button onClick={downloadSvg} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15">Enregistrer sous (SVG)</button>
                    <button onClick={downloadPng} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15">Enregistrer sous (PNG)</button>
                    <button onClick={downloadPdf} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15">Enregistrer sous (PDF)</button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-white/60">Partagez ce code/lien à vos membres (WhatsApp, affiches au club, email). Aucun envoi automatique pour l’instant.</p>
          </div>

          <div className="flex gap-3">
            <Link href="/onboarding/publish" className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold">Continuer</Link>
          </div>
        </section>
      </main>
    </div>
  );
}



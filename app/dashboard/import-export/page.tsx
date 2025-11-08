"use client";

import { useCallback, useRef, useState } from "react";

export default function ImportExportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSelectLogo = useCallback(async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const payload = {
        filename: file.name,
        mime: file.type || "image/png",
        data: btoa(binary),
      };

      const res = await fetch("/api/clubs/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_payload: payload }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch (parseError) {
        json = null;
      }

      if (!res.ok) {
        const errorMessage = json?.error || "Import du logo impossible";
        throw new Error(errorMessage);
      }

      setLogoUrl(json?.logo_url || null);
    } catch (error: any) {
      setErrorMessage(error?.message || "Import du logo impossible");
    } finally {
      setIsUploading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Import / Export</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Import membres (CSV)</h2>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Télécharger le modèle</button>
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Importer</button>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="font-semibold">Import logo du club</h2>
        <p className="text-sm text-white/60">
          Ajoutez ou remplacez le logo affiché en haut de votre espace club.
        </p>
        {logoUrl && (
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-3">
            <img src={logoUrl} alt="Logo club" className="h-12 w-12 rounded bg-white/10 object-cover" />
            <div className="text-sm text-white/70">
              Logo mis à jour. Rechargez la page si besoin pour voir le résultat.
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onSelectLogo(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm font-semibold border border-white/10 hover:bg-white/15 disabled:opacity-60"
        >
          {isUploading ? "Import en cours..." : "Importer un logo"}
        </button>
        <p className="text-xs text-white/50">
          Formats acceptés : PNG, JPG, WEBP, SVG • Max 5 Mo.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Exports</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Membres (CSV)</button>
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Résultats & classements (CSV)</button>
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Médias (Archive)</button>
        </div>
      </div>
    </div>
  );
}




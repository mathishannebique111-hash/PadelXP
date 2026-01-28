"use client";

import { useCallback, useRef, useState } from "react";
import PageTitle from "../PageTitle";

type ImportMessage = { type: "success" | "error"; text: string };

type ParsedMemberRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  raw: Record<string, string>;
};

const HEADER_SYNONYMS: Record<keyof ParsedMemberRow | "firstName" | "lastName" | "phone" | "notes" | "email", string[]> = {
  firstName: ["prenom", "prénom", "first name", "firstname", "first_name", "prenom*", "prénoms", "first"],
  lastName: ["nom", "last name", "lastname", "last_name"],
  email: ["email", "e-mail", "mail", "adresse email", "adresse e-mail", "adresse mail"],
  phone: ["telephone", "téléphone", "phone", "mobile", "tél", "tel"],
  notes: ["note", "notes", "commentaire", "commentaires", "remark", "remarks"],
  raw: [],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  if (semicolons === 0 && commas === 0) {
    return ";";
  }
  return semicolons >= commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const items: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  items.push(current.trim());
  return items;
}

function parseMembersCsv(text: string): { rows: ParsedMemberRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: ParsedMemberRow[] = [];

  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) {
    errors.push("Le fichier est vide.");
    return { rows, errors };
  }

  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    errors.push("Le fichier doit contenir un en-tête et au moins une ligne de données.");
    return { rows, errors };
  }

  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const headerCells = splitCsvLine(headerLine, delimiter).map(normalizeHeader);

  const columnIndex: Partial<Record<"firstName" | "lastName" | "email" | "phone" | "notes", number>> = {};
  (["firstName", "lastName", "email", "phone", "notes"] as const).forEach((key) => {
    const synonyms = HEADER_SYNONYMS[key];
    const index = headerCells.findIndex((header) => synonyms.includes(header));
    if (index !== -1) {
      columnIndex[key] = index;
    }
  });

  if (columnIndex.email === undefined) {
    errors.push("La colonne 'Email' est obligatoire dans l'en-tête (ex: Email).");
    return { rows, errors };
  }

  const seenEmails = new Set<string>();

  lines.slice(1).forEach((line, lineIndex) => {
    const values = splitCsvLine(line, delimiter);
    if (values.every((value) => value.trim() === "")) {
      return;
    }

    const raw: Record<string, string> = {};
    headerCells.forEach((header, idx) => {
      raw[header] = values[idx]?.trim() ?? "";
    });

    const emailRaw = values[columnIndex.email!]?.trim() || "";
    const emailNormalized = emailRaw.toLowerCase();
    if (!EMAIL_REGEX.test(emailNormalized)) {
      errors.push(`Ligne ${lineIndex + 2}: email invalide (${emailRaw || "valeur vide"}).`);
      return;
    }

    if (seenEmails.has(emailNormalized)) {
      errors.push(`Ligne ${lineIndex + 2}: email dupliqué (${emailRaw}).`);
      return;
    }
    seenEmails.add(emailNormalized);

    const firstNameValue =
      columnIndex.firstName !== undefined ? values[columnIndex.firstName]?.trim() ?? "" : "";
    const lastNameValue =
      columnIndex.lastName !== undefined ? values[columnIndex.lastName]?.trim() ?? "" : "";

    rows.push({
      firstName: firstNameValue,
      lastName: lastNameValue,
      email: emailRaw,
      phone:
        columnIndex.phone !== undefined ? values[columnIndex.phone]?.trim() ?? "" : undefined,
      notes:
        columnIndex.notes !== undefined ? values[columnIndex.notes]?.trim() ?? "" : undefined,
      raw,
    });
  });

  return { rows, errors };
}

export default function ImportExportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const membersFileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImportingMembers, setIsImportingMembers] = useState(false);
  const [membersImportMessage, setMembersImportMessage] = useState<ImportMessage | null>(null);
  const [isExportingMembers, setIsExportingMembers] = useState(false);
  const [isExportingLeaderboard, setIsExportingLeaderboard] = useState(false);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [membersImportDetails, setMembersImportDetails] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [membersImportErrors, setMembersImportErrors] = useState<string[]>([]);

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

  const handleDownloadTemplate = useCallback(() => {
    const csvContent = "Prenom;Nom;Email;Telephone;Notes\nJean;Dupont;jean.dupont@example.com;0600000000;Membre VIP\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele_import_membres.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const triggerDownload = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportMembers = useCallback(async () => {
    try {
      setExportErrorMessage(null);
      setIsExportingMembers(true);
      const response = await fetch("/api/clubs/export-members", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erreur lors de l'export des membres.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `membres_${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(blob, filename);
    } catch (error: any) {
      setExportErrorMessage(error?.message || "Erreur lors de l'export des membres.");
    } finally {
      setIsExportingMembers(false);
    }
  }, [triggerDownload]);

  const handleExportLeaderboard = useCallback(async () => {
    try {
      setExportErrorMessage(null);
      setIsExportingLeaderboard(true);
      const response = await fetch("/api/clubs/export-leaderboard-pdf", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erreur lors de l'export du classement.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `classement_${new Date().toISOString().slice(0, 10)}.pdf`;
      triggerDownload(blob, filename);
    } catch (error: any) {
      setExportErrorMessage(error?.message || "Erreur lors de l'export du classement.");
    } finally {
      setIsExportingLeaderboard(false);
    }
  }, [triggerDownload]);

  const handleMembersImport = useCallback(async (file: File | null) => {
    if (!file) return;
    setIsImportingMembers(true);
    setMembersImportMessage(null);
    setMembersImportDetails(null);
    setMembersImportErrors([]);

    try {
      const text = await file.text();
      const { rows, errors } = parseMembersCsv(text);

      if (rows.length === 0) {
        const message =
          errors.length > 0 ? errors.join(" ") : "Aucun membre valide n'a été trouvé dans le fichier.";
        throw new Error(message);
      }

      const response = await fetch("/api/clubs/import-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (parseError) {
        data = null;
      }

      if (!response.ok) {
        const message = data?.error || "Erreur lors de l'import des membres.";
        throw new Error(message);
      }

      setMembersImportDetails({
        inserted: data.inserted ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        total: data.total ?? rows.length,
      });
      setMembersImportMessage({
        type: "success",
        text:
          data?.message ||
          `Import terminé : ${data.inserted ?? 0} ajout(s), ${data.updated ?? 0} mise(s) à jour.`,
      });
      const combinedErrors = [...errors, ...(data?.errors || [])];
      if (combinedErrors.length > 0) {
        setMembersImportErrors(combinedErrors);
      }
    } catch (error: any) {
      setMembersImportMessage({
        type: "error",
        text: error?.message || "Erreur lors de l'import des membres.",
      });
    } finally {
      setIsImportingMembers(false);
      if (membersFileInputRef.current) {
        membersFileInputRef.current.value = "";
      }
    }
  }, []);

  return (
    <div className="space-y-6 min-h-[85vh]">
      <PageTitle title="Import / Export" subtitle="Importez vos membres et exportez vos données en toute simplicité" />
      <div className="rounded-xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="font-semibold mb-4">Import logo du club</h2>
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

      <div className="rounded-xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-4">Exports</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => void handleExportMembers()}
            disabled={isExportingMembers}
            className="px-3 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60 transition-colors"
          >
            {isExportingMembers ? "Export en cours..." : "Membres (CSV)"}
          </button>
          <button
            type="button"
            onClick={() => void handleExportLeaderboard()}
            disabled={isExportingLeaderboard}
            className="px-3 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60 transition-colors"
          >
            {isExportingLeaderboard ? "Export en cours..." : "Classement (PDF)"}
          </button>
        </div>
        {exportErrorMessage && (
          <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {exportErrorMessage}
          </div>
        )}
      </div>
    </div>
  );
}




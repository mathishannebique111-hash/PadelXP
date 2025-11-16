"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OpeningHoursValue = { open: string | null; close: string | null; closed?: boolean };
type OpeningHours = Record<string, OpeningHoursValue>;

type ClubPayload = {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  number_of_courts?: number | null;
  court_type?: string | null;
  opening_hours?: OpeningHours | null;
};

type ClubExtrasPayload = {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  number_of_courts?: number | null;
  court_type?: string | null;
  description?: string | null;
  opening_hours?: OpeningHours | null;
} | null;

const DAYS: Array<{ key: keyof OpeningHours; label: string }> = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

const DEFAULT_HOURS: OpeningHoursValue = { open: null, close: null, closed: false };

const COURT_TYPE_OPTIONS = [
  { value: "couverts", label: "Couverts" },
  { value: "extérieurs", label: "Extérieurs" },
  { value: "mixtes", label: "Mixtes" },
];

function normaliseHours(hours: OpeningHours | null | undefined): OpeningHours {
  const next: OpeningHours = {} as OpeningHours;
  DAYS.forEach(({ key }) => {
    const value = hours?.[key] || DEFAULT_HOURS;
    next[key] = {
      open: value.open ?? null,
      close: value.close ?? null,
      closed: value.closed ?? false,
    };
  });
  return next;
}

function normaliseCourtType(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = COURT_TYPE_OPTIONS.find((option) => option.label.toLowerCase() === trimmed.toLowerCase() || option.value.toLowerCase() === trimmed.toLowerCase());
  return match ? match.value : trimmed;
}

function splitAddress(address: string | null | undefined) {
  if (!address) {
    return { street: "", addressLine: "" };
  }
  return { street: address, addressLine: address };
}

export default function ClubPublicFormClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [street, setStreet] = useState("");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [numberOfCourts, setNumberOfCourts] = useState<string>("");
  const [courtType, setCourtType] = useState("");
  const [openingHours, setOpeningHours] = useState<OpeningHours>(() => normaliseHours(null));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/clubs/public", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Impossible de récupérer les informations du club");
      }
      const payload = await response.json();
      const club: ClubPayload | null = payload?.club || null;
      const extras: ClubExtrasPayload = payload?.extras ?? null;
      if (club) {
        const effectiveAddress = club.address ?? extras?.address ?? null;
        const { street: currentStreet } = splitAddress(effectiveAddress);
        setStreet(currentStreet || "");
        setPostal(club.postal_code ?? extras?.postal_code ?? "");
        setCity(club.city ?? extras?.city ?? "");
        setPhone(club.phone ?? extras?.phone ?? "");
        setWebsite(club.website ?? extras?.website ?? "");
        setDescription(club.description ?? extras?.description ?? "");
        const courtsValue = club.number_of_courts ?? extras?.number_of_courts ?? null;
        setNumberOfCourts(courtsValue != null ? String(courtsValue) : "");
        setCourtType(normaliseCourtType(club.court_type ?? extras?.court_type ?? ""));
        setOpeningHours(normaliseHours(club.opening_hours ?? extras?.opening_hours ?? null));
      } else {
        if (extras) {
          const { street: currentStreet } = splitAddress(extras.address || null);
          setStreet(currentStreet || "");
          setPostal(extras.postal_code || "");
          setCity(extras.city || "");
          setPhone(extras.phone || "");
          setWebsite(extras.website || "");
          setDescription(extras.description || "");
          setNumberOfCourts(extras.number_of_courts != null ? String(extras.number_of_courts) : "");
          setCourtType(normaliseCourtType(extras.court_type || ""));
          setOpeningHours(normaliseHours(extras.opening_hours ?? null));
        } else {
          setOpeningHours(normaliseHours(null));
        }
      }
    } catch (err: any) {
      console.error("[ClubPublicFormClient] load error", err);
      setError(err?.message || "Erreur lors du chargement des informations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const missingFields = useMemo(() => {
    return {
      street: street.trim().length === 0,
      postal: postal.trim().length === 0,
      city: city.trim().length === 0,
      phone: phone.trim().length === 0,
      description: description.trim().length === 0,
    };
  }, [street, postal, city, phone, description]);

  const updateOpeningHours = useCallback((day: keyof OpeningHours, field: "open" | "close", value: string) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: false,
        [field]: value ? value : null,
      },
    }));
  }, []);

  const toggleClosed = useCallback((day: keyof OpeningHours, closed: boolean) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: closed
        ? { open: null, close: null, closed: true }
        : { open: null, close: null, closed: false },
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        address: street.trim() ? street.trim() : null,
        postal_code: postal.trim() ? postal.trim() : null,
        city: city.trim() ? city.trim() : null,
        phone: phone.trim() ? phone.trim() : null,
        website: website.trim() ? website.trim() : null,
        description: description.trim() ? description.trim() : null,
        court_type: courtType.trim() ? courtType.trim() : null,
      };

      if (numberOfCourts.trim()) {
        const courtsValue = Number(numberOfCourts);
        payload.number_of_courts = !Number.isNaN(courtsValue) ? courtsValue : null;
      } else {
        payload.number_of_courts = null;
      }

      payload.opening_hours = openingHours;

      const response = await fetch("/api/clubs/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || "Enregistrement impossible");
      }

      const result = await response.json().catch(() => null);
      if (result?.club) {
        const club: ClubPayload = result.club;
        const extras: ClubExtrasPayload = result?.extras ?? null;
        const effectiveAddress = club.address ?? extras?.address ?? null;
        const { street: updatedStreet } = splitAddress(effectiveAddress);
        setStreet(updatedStreet || "");
        setPostal(club.postal_code ?? extras?.postal_code ?? "");
        setCity(club.city ?? extras?.city ?? "");
        setPhone(club.phone ?? extras?.phone ?? "");
        setWebsite(club.website ?? extras?.website ?? "");
        setDescription(club.description ?? extras?.description ?? "");
        const courtsValue = club.number_of_courts ?? extras?.number_of_courts ?? null;
        setNumberOfCourts(courtsValue != null ? String(courtsValue) : "");
        setCourtType(normaliseCourtType(club.court_type ?? extras?.court_type ?? ""));
        setOpeningHours(normaliseHours(club.opening_hours ?? extras?.opening_hours ?? null));
      } else {
        await load();
      }

      setSuccess("Enregistré !");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("[ClubPublicFormClient] submit error", err);
      setError(err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [street, postal, city, phone, website, description, numberOfCourts, courtType, openingHours, load]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border-2 border-rose-400/70 ring-1 ring-rose-200/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border-2 border-emerald-400/70 ring-1 ring-emerald-200/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border-2 border-white/25 ring-1 ring-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
          Chargement des informations…
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="space-y-6">
            <section className="rounded-2xl border-2 border-white/25 ring-1 ring-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Informations principales</h2>
              <p className="text-sm text-white/60">Complétez autant que possible pour enrichir votre page publique.</p>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Adresse</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(event) => setStreet(event.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${missingFields.street ? "border-rose-400/60 bg-rose-500/15" : "border-white/15 bg-white/10"}`}
                    placeholder="12 rue du Padel"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Code postal</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={postal}
                    onChange={(event) => {
                      const numeric = event.target.value.replace(/[^0-9]/g, "");
                      setPostal(numeric.slice(0, 5));
                    }}
                    maxLength={5}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${missingFields.postal ? "border-rose-400/60 bg-rose-500/15" : "border-white/15 bg-white/10"}`}
                    placeholder="75000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${missingFields.city ? "border-rose-400/60 bg-rose-500/15" : "border-white/15 bg-white/10"}`}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => {
                      const numeric = event.target.value.replace(/[^0-9]/g, "");
                      const truncated = numeric.slice(0, 10);
                      const formatted = truncated.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
                      setPhone(formatted);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${missingFields.phone ? "border-rose-400/60 bg-rose-500/15" : "border-white/15 bg-white/10"}`}
                    placeholder="06 45 12 56 90"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Site web / application</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    placeholder="club.fr"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Nombre de terrains</label>
                  <input
                    type="number"
                    min={0}
                    value={numberOfCourts}
                    onChange={(event) => setNumberOfCourts(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Type de terrains</label>
                  <select
                    value={normaliseCourtType(courtType)}
                    onChange={(event) => setCourtType(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  >
                    <option value="" className="bg-slate-900 text-white">Sélectionner…</option>
                    {COURT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${missingFields.description ? "border-rose-400/60 bg-rose-500/15" : "border-white/15 bg-white/10"}`}
                    placeholder="Parlez de l’ambiance, des services, des coachs…"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border-2 border-white/25 ring-1 ring-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Horaires d'ouverture</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {DAYS.map(({ key, label }) => (
                  <div key={key} className="rounded-xl border-2 border-white/20 bg-black/20 p-4 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">{label}</p>
                      <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border border-white/30 bg-white/10 text-blue-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
                          checked={openingHours[key].closed === true}
                          onChange={(event) => toggleClosed(key, event.target.checked)}
                        />
                        Fermé
                      </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40">Ouverture</label>
                        <input
                          type="time"
                          value={openingHours[key].open ?? ""}
                          onChange={(event) => updateOpeningHours(key, "open", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-xs text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                          disabled={openingHours[key].closed === true}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40">Fermeture</label>
                        <input
                          type="time"
                          value={openingHours[key].close ?? ""}
                          onChange={(event) => updateOpeningHours(key, "close", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-xs text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                          disabled={openingHours[key].closed === true}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.4)] transition ${saving || success ? "bg-emerald-500 disabled:cursor-default" : "bg-blue-500 hover:bg-blue-400"}`}
              >
                {saving ? "Enregistrement…" : success ? "Enregistré !" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { AccentPalette } from "./ClubHeader";

type OpeningHoursValue = {
  open: string | null;
  close: string | null;
};

type OpeningHours = Record<string, OpeningHoursValue>;

interface ClubDetailsClientProps {
  addressLine?: string | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: OpeningHours | null;
  numberOfCourts?: number | null;
  courtType?: string | null;
  accent?: AccentPalette | null;
}

const DAYS: Array<{ key: string; label: string }> = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

function formatHour(value: string | null | undefined) {
  if (!value) return null;
  try {
    const [h, m] = value.split(":");
    if (Number.isNaN(Number(h)) || Number.isNaN(Number(m))) {
      return value;
    }
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  } catch {
    return value;
  }
}

function buildHours(openingHours: OpeningHours | null | undefined) {
  return DAYS.map(({ key, label }) => {
    const data = openingHours?.[key];
    const open = formatHour(data?.open ?? null);
    const close = formatHour(data?.close ?? null);
    const isClosed = data?.closed === true || (!open || !close);
    return {
      key,
      label,
      value: isClosed ? "Fermé" : `${open} – ${close}`,
      isClosed,
    };
  });
}

function buildDarkCardStyle() {
  return {
    background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%)",
    borderColor: "rgba(72,128,210,0.55)",
  };
}

export default function ClubDetailsClient({
  addressLine,
  phone,
  website,
  openingHours,
  numberOfCourts,
  courtType,
  accent,
}: ClubDetailsClientProps) {
  const hours = useMemo(() => buildHours(openingHours ?? null), [openingHours]);
  const cardStyle = useMemo(() => buildDarkCardStyle(), [accent]);

  const infrastructure = useMemo(() => {
    const items: Array<{ label: string; value: string } | null> = [];
    if (typeof numberOfCourts === "number" && Number.isFinite(numberOfCourts)) {
      items.push({ label: "Terrains", value: `${numberOfCourts}` });
    }
    if (courtType) {
      items.push({ label: "Type", value: courtType });
    }
    return items.filter(Boolean) as Array<{ label: string; value: string }>;
  }, [numberOfCourts, courtType]);

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <section
          className="rounded-2xl border p-5 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
          style={cardStyle}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Coordonnées</h2>
            {website ? (
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
              >
                Visiter le site ↗
              </a>
            ) : null}
          </div>

          <div className="mt-5 space-y-4 text-sm">
            {addressLine ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <Image 
                  src="/images/Gps page mon club.png" 
                  alt="GPS" 
                  width={20} 
                  height={20} 
                  className="flex-shrink-0"
                  style={{ 
                    mixBlendMode: 'screen',
                    filter: 'contrast(1.2) brightness(1.1)'
                  }}
                  unoptimized
                />
                <span className="font-medium leading-5 text-white/90">{addressLine}</span>
              </div>
            ) : (
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-xs text-white/60">
                Adresse non renseignée
              </div>
            )}
            {phone ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <Image 
                  src="/images/Téléphone page mon club.png" 
                  alt="Téléphone" 
                  width={20} 
                  height={20} 
                  className="flex-shrink-0"
                  unoptimized
                />
                <span className="font-medium tracking-wide text-white/90">{phone}</span>
              </div>
            ) : (
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-xs text-white/60">
                Téléphone non renseigné
              </div>
            )}
          </div>
        </section>

        <section
          className="rounded-2xl border p-5 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
          style={cardStyle}
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Infrastructure</h2>
          <div className="mt-4 grid gap-3 text-sm">
            {infrastructure.length === 0 ? (
              <div className="rounded-lg border border-white/18 bg-white/10 px-3 py-2 text-center text-xs text-white/60">
                Informations non renseignées
              </div>
            ) : (
              infrastructure.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/18 bg-black/25 px-3 py-2 text-white/85">
                  <span className="uppercase tracking-[0.25em] text-white">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <section
          className="rounded-2xl border p-5 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
          style={cardStyle}
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Horaires d'ouverture</h2>
          <div className="mt-4 space-y-2 text-sm">
            {hours.map((item) => (
              <div
                key={item.key}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide ${item.isClosed ? "border-rose-400/45 bg-rose-500/15 text-rose-100" : "border-emerald-400/45 bg-emerald-500/15 text-emerald-50"}`}
              >
                <span className="uppercase tracking-[0.25em] text-white">{item.label}</span>
                <span className="text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

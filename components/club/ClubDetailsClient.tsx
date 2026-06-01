"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { AccentPalette } from "./ClubHeader";
import { getContrastColor } from "@/lib/club-branding";

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

function formatHour(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;

  // Convertir en string si c'est un nombre
  const stringValue = String(value);

  try {
    // Si format HH:MM déjà correct
    if (/^\d{2}:\d{2}$/.test(stringValue)) {
      return stringValue;
    }

    // Gestion des nombres ou chaînes simples (ex: "9" ou 9 -> "09:00")
    if (!stringValue.includes(":")) {
      const num = parseInt(stringValue, 10);
      if (!isNaN(num) && num >= 0 && num <= 23) {
        return `${num.toString().padStart(2, "0")}:00`;
      }
      return null;
    }

    const [h, m] = stringValue.split(":");
    if (Number.isNaN(Number(h)) || Number.isNaN(Number(m))) {
      return stringValue; // Retourner tel quel si non parsable
    }
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  } catch {
    return stringValue;
  }
}

function buildHours(openingHours: OpeningHours | null | undefined) {
  return DAYS.map(({ key, label }) => {
    const data = openingHours?.[key];
    const open = formatHour(data?.open ?? null);
    const close = formatHour(data?.close ?? null);
    const isClosed = !open || !close;
    return {
      key,
      label,
      value: isClosed ? "Fermé" : `${open} – ${close}`,
      isClosed,
    };
  });
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

  const isClub = typeof document !== 'undefined' &&
    !!document.body.dataset.clubSubdomain &&
    document.body.dataset.clubSubdomain !== 'app';

  const cardStyle = useMemo(() => {
    return {
      backgroundColor: '#172554',
      borderColor: 'rgba(255,255,255,0.15)',
      borderWidth: '1.5px',
      boxShadow: '0 30px 70px rgba(4,16,46,0.5)',
    };
  }, [accent, isClub]);

  const contrastColor = useMemo(() => {
    if (accent) return getContrastColor(accent.soft);
    if (typeof document === 'undefined') return 'white';
    const bg = getComputedStyle(document.body).getPropertyValue('--theme-page').trim();
    if (!bg) return 'white';
    const rgb = bg.split(' ').map(Number);
    const hex = "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
    return getContrastColor(hex);
  }, [isClub, accent]);

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
      {/* Coordonnées + Infrastructure - Combined Frame */}
      <section
        className="rounded-2xl border p-5 shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
        style={{ ...cardStyle, color: 'white' }}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Coordonnées Column */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">Coordonnées</h2>
              {website ? (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-semibold uppercase tracking-wide text-white/70 hover:text-white transition-colors"
                >
                  Site ↗
                </a>
              ) : null}
            </div>

            <div className="space-y-3 text-sm">
              {addressLine ? (
                <div className="flex flex-col items-center gap-1 text-center">
                  <Image
                    src="/images/Gps page mon club.png"
                    alt="GPS"
                    width={18}
                    height={18}
                    className="flex-shrink-0"
                    style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                    unoptimized
                  />
                  <span className="font-medium leading-4 text-xs text-white/90">{addressLine}</span>
                </div>
              ) : (
                <div className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-center text-[10px] text-white/40">
                  Adresse non renseignée
                </div>
              )}
              {phone ? (
                <div className="flex flex-col items-center gap-1 text-center">
                  <Image
                    src="/images/Téléphone page mon club.png"
                    alt="Téléphone"
                    width={18}
                    height={18}
                    className="flex-shrink-0"
                    unoptimized
                  />
                  <span className="font-medium tracking-wide text-xs text-white/90">{phone}</span>
                </div>
              ) : (
                <div className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-center text-[10px] text-white/40">
                  Téléphone non renseigné
                </div>
              )}
            </div>
          </div>

          {/* Infrastructure Column */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-white/90">Infrastructure</h2>
            <div className="grid gap-2 text-sm mt-5">
              {infrastructure.length === 0 ? (
                <div className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-center text-[10px] text-white/40">
                  Non renseigné
                </div>
              ) : (
                infrastructure.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border px-2 py-1.5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.15)' }}>
                    <span className="uppercase tracking-[0.2em] text-[10px] font-bold">{item.label}</span>
                    <span className="font-extrabold text-xs">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Horaires d'ouverture */}
      <section
        className="rounded-2xl border p-5 shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
        style={{ ...cardStyle, color: 'white' }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Horaires d'ouverture</h2>
        <div className="mt-4 space-y-2 text-sm">
          {hours.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide ${item.isClosed ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}
            >
              <span className="uppercase tracking-[0.25em]">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

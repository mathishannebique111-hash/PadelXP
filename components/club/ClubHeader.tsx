"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from '@/lib/logger';

export type AccentPalette = {
  base: string;
  soft: string;
  border: string;
  glow: string;
};

function mix(color: string, factor: number): string {
  const clamped = Math.min(Math.max(factor, 0), 1);
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const mixTo = 255;
  const mixChannel = (value: number) => Math.round(value + (mixTo - value) * clamped);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(mixChannel(r))}${toHex(mixChannel(g))}${toHex(mixChannel(b))}`;
}

function createPalette(source: string | null | undefined): AccentPalette {
  const fallback = "#0C3C94";
  const base = source && /^#?[0-9a-fA-F]{6}$/.test(source) ? (source.startsWith("#") ? source : `#${source}`) : fallback;
  return {
    base,
    soft: mix(base, 0.78),
    border: mix(base, 0.35),
    glow: mix(base, 0.15),
  };
}

async function extractDominantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 32;
          canvas.height = 32;
          const context = canvas.getContext("2d");
          if (!context) {
            resolve(null);
            return;
          }
          context.drawImage(image, 0, 0, 32, 32);
          const { data } = context.getImageData(0, 0, 32, 32);
          let r = 0;
          let g = 0;
          let b = 0;
          let total = 0;
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha < 50) continue; // ignorer pixels transparents
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            total += 1;
          }
          if (total === 0) {
            resolve(null);
            return;
          }
          const toHex = (value: number) => Math.round(value / total).toString(16).padStart(2, "0");
          resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
        } catch (error) {
          logger.warn("[ClubHeader] extractDominantColor error", error);
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    } catch (err) {
      logger.warn("[ClubHeader] unable to analyse logo", err);
      resolve(null);
    }
  });
}

interface ClubHeaderProps {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  fallbackAccent?: string | null;
  onAccentChange?: (palette: AccentPalette) => void;
}

export default function ClubHeader({ name, logoUrl, description, fallbackAccent, onAccentChange }: ClubHeaderProps) {
  const [palette, setPalette] = useState<AccentPalette>(() => createPalette(fallbackAccent));

  useEffect(() => {
    let cancelled = false;
    if (!logoUrl) {
      const nextPalette = createPalette(fallbackAccent);
      if (!cancelled) {
        setPalette(nextPalette);
        onAccentChange?.(nextPalette);
      }
      return () => {
        cancelled = true;
      };
    }

    extractDominantColor(logoUrl).then((hex) => {
      if (cancelled) return;
      const nextPalette = createPalette(hex || fallbackAccent);
      setPalette(nextPalette);
      onAccentChange?.(nextPalette);
    });

    return () => {
      cancelled = true;
    };
  }, [logoUrl, fallbackAccent, onAccentChange]);

  const gradientStyle = useMemo(() => ({
    background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%)",
    boxShadow: "0 30px 70px rgba(4,16,46,0.5)",
  }), []);

  const aboutCardStyle = useMemo(
    () => ({
      background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%)",
      borderColor: "rgba(72,128,210,0.55)",
    }),
    []
  );

  const shimmerColor = useMemo(() => `${mix(palette.base, 0.65)}99`, [palette]);
  const shimmerVars = useMemo(
    () => ({ ["--shimmer" as any]: shimmerColor, ["--shimmer-duration" as any]: "2.8s" }),
    [shimmerColor]
  );

  return (
    <>
      <section
        className="relative overflow-hidden rounded-2xl border border-white p-4 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
        style={gradientStyle}
      >
        <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
        {/* Effet brillant style challenges */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-shine-challenge">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent challenge-shine-gradient" />
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo ${name}`}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    logger.error("[ClubHeader] Erreur lors du chargement du logo:", {
                      logoUrl,
                      name,
                      error: e,
                    });
                    // Remplacer l'image par l'icône si le logo ne charge pas
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.fallback-icon')) {
                      const fallback = document.createElement('span');
                      fallback.className = 'fallback-icon text-4xl';
                      fallback.textContent = '🏟️';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="text-4xl">🏟️</span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold md:text-4xl tracking-tight text-white/95 leading-tight md:leading-none flex items-center">
              {name}
            </h1>
          </div>
        </div>

        <span className="pointer-events-none absolute inset-x-6 bottom-3 h-px rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </section>

      {description ? (
        <section
          className="mt-4 rounded-2xl border p-5 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
          style={aboutCardStyle}
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/85">À propos</h2>
          <p className="mt-3 text-sm leading-7 text-white/90">
            {description}
          </p>
        </section>
      ) : null}
    </>
  );
}

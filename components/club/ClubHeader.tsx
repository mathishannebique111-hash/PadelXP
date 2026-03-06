"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from '@/lib/logger';
import { getContrastColor } from "@/lib/club-branding";

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

  const isClub = typeof document !== 'undefined' &&
    !!document.body.dataset.clubSubdomain &&
    document.body.dataset.clubSubdomain !== 'app';

  const aboutCardStyle = useMemo(
    () => {
      return {
        backgroundColor: 'rgb(var(--theme-page))',
        borderColor: palette.base,
        borderWidth: '1.5px',
      };
    },
    [palette.base, isClub]
  );

  const contrastColor = useMemo(() => {
    if (typeof document === 'undefined') return 'white';
    const bg = getComputedStyle(document.body).getPropertyValue('--theme-page').trim();
    if (!bg) return 'white';
    // On convertit le triplet RGB en hex pour getContrastColor
    const rgb = bg.split(' ').map(Number);
    const hex = "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
    return getContrastColor(hex);
  }, [isClub]);

  const shimmerColor = useMemo(() => `${mix(palette.base, 0.65)}99`, [palette]);
  const shimmerVars = useMemo(
    () => ({ ["--shimmer" as any]: shimmerColor, ["--shimmer-duration" as any]: "2.8s" }),
    [shimmerColor]
  );

  return (
    <>
      <section
        className="relative overflow-hidden rounded-2xl border p-5 shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
        style={{ ...aboutCardStyle, color: isClub ? contrastColor : 'white' }}
      >
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
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
                      fallback.className = 'fallback-icon text-2xl';
                      fallback.textContent = '🏟️';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="text-2xl">🏟️</span>
              )}
            </div>
            <h1 className="text-xl font-extrabold md:text-2xl tracking-tight leading-tight md:leading-none flex items-center" style={{ color: isClub ? contrastColor : 'rgba(255,255,255,0.95)' }}>
              {name}
            </h1>
          </div>
        </div>
      </section>

      {description ? (
        <section
          className="mt-4 rounded-2xl border p-5 shadow-[0_30px_70px_rgba(4,16,46,0.5)]"
          style={{ ...aboutCardStyle, color: isClub ? contrastColor : 'white' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: isClub ? `${contrastColor}E6` : 'rgba(255,255,255,0.85)' }}>À propos</h2>
          <p className="mt-3 text-sm leading-7" style={{ color: isClub ? contrastColor : 'rgba(255,255,255,0.9)' }}>
            {description}
          </p>
        </section>
      ) : null}
    </>
  );
}

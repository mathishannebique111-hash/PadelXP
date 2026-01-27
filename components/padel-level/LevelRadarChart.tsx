"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_INFO } from "@/lib/padel/levelQuestions";

interface Props {
  breakdown: {
    technique: number;
    tactique: number;
    experience: number;
    physique: number;
    situations: number;
  };
}

export default function LevelRadarChart({ breakdown }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasSize = isMobile ? 250 : 300;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const maxRadius = isMobile ? 90 : 120;
    const categories = Object.keys(breakdown);
    const angleStep = (Math.PI * 2) / categories.length;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Grille
    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i += 1) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (maxRadius / 5) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Axes avec initiales
    const categoryInitials: Record<string, string> = {
      technique: "T",
      tactique: "TA",
      experience: "E",
      physique: "P",
      situations: "S"
    };

    categories.forEach((cat, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * maxRadius;
      const y = centerY + Math.sin(angle) * maxRadius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
      ctx.stroke();

      // Afficher l'initiale du domaine
      const initial = categoryInitials[cat] || cat[0].toUpperCase();
      const labelX = centerX + Math.cos(angle) * (maxRadius + 15);
      const labelY = centerY + Math.sin(angle) * (maxRadius + 15);

      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = isMobile ? "bold 12px sans-serif" : "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial, labelX, labelY);
    });

    // Polygone
    ctx.beginPath();
    categories.forEach((cat, i) => {
      const value = breakdown[cat as keyof typeof breakdown] / 10;
      const angle = angleStep * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * maxRadius * value;
      const y = centerY + Math.sin(angle) * maxRadius * value;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(59, 130, 246, 1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    categories.forEach((cat, i) => {
      const value = breakdown[cat as keyof typeof breakdown] / 10;
      const angle = angleStep * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * maxRadius * value;
      const y = centerY + Math.sin(angle) * maxRadius * value;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgb(59, 130, 246)";
      ctx.fill();
    });
  }, [breakdown, isMobile]);

  const canvasSize = isMobile ? 250 : 300;

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="mx-auto"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-4">
        {Object.entries(breakdown).map(([key, value]) => {
          const info = CATEGORY_INFO[key as keyof typeof CATEGORY_INFO];
          const CategoryIcon = info.Icon;
          return (
            <div key={key} className="flex items-center gap-2">
              <CategoryIcon size={18} className="text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-xs md:text-sm text-gray-400">
                  {info.label}
                </p>
                <p className="text-base md:text-lg font-bold text-white">
                  {value.toFixed(2)}/10
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


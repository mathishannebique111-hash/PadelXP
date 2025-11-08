"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LandingPagePodium from "./LandingPagePodium";
 

export default function LeaderboardPreview() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const particles = useMemo(() => {
    if (!mounted) return [] as Array<{ left: number; top: number; dur: number; delay: number; drift: number }>;
    return Array.from({ length: 20 }).map(() => ({
      left: Math.random() * 100,
      top: 85 + Math.random() * 25,
      dur: Math.random() * 3 + 2,
      delay: Math.random() * 2,
      drift: (Math.random() - 0.5) * 12,
    }));
  }, [mounted]);

  return (
    <section className="relative py-24 bg-gradient-to-b from-black via-[#0a0a1a] to-black overflow-hidden">
      {/* Particules dorées animées */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted && particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-60"
            initial={{ x: `${p.left}%`, y: `${p.top}%` }}
            animate={{ y: "-10%", x: `${p.left + p.drift}%` }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            Grimpe dans le{" "}
            <span className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
              classement
            </span>
            <br />
            match après match
          </h2>
        </motion.div>

        {/* Podium dynamique avec synchronisation temps réel */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <LandingPagePodium />
        </motion.div>

        {/* Ligne #4 avec "TOI" */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-black/50 border-2 border-[#0066FF]/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-[#0066FF]">#4</div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">TOI BIENTÔT ICI ?</span>
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-[#BFFF00]"
                  >
                    ● ● ●
                  </motion.span>
                </div>
              </div>
              <div className="text-white/40 font-mono">-- pts</div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-center mt-12"
        >
          <Link
            href="/login"
            className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-bold text-lg shadow-[0_0_30px_rgba(0,102,255,0.5)] hover:shadow-[0_0_40px_rgba(0,102,255,0.7)] transition-all duration-300 hover:scale-105"
          >
            Commence à jouer →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
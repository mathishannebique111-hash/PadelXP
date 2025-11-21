"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function FinalCTA() {
  // Eviter l'hydratation non déterministe pour les particules
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dots = useMemo(() => {
    if (!mounted) return [] as Array<{ left: number; top: number; dur: number; delay: number }>;
    return Array.from({ length: 50 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      dur: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
  }, [mounted]);

  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Background gradient animé */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(135deg, #0066FF 0%, #00CC99 50%, #BFFF00 100%)",
            "linear-gradient(225deg, #BFFF00 0%, #00CC99 50%, #0066FF 100%)",
            "linear-gradient(135deg, #0066FF 0%, #00CC99 50%, #BFFF00 100%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ opacity: 0.2 }}
      />

      {/* Pattern animé */}
      <div className="absolute inset-0">
        {mounted && dots.map((d, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{ left: `${d.left}%`, top: `${d.top}%` }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: d.dur, repeat: Infinity, delay: d.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            Prêt à devenir un{" "}
            <span className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
              champion
            </span>{" "}?
          </h2>

          <p className="text-2xl md:text-3xl text-white/80 mb-8">
            Rejoins la compétition maintenant
          </p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/player/signup"
              className="inline-block px-12 py-6 rounded-2xl bg-white text-black font-bold text-xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all duration-300"
            >
              Créer mon compte →
            </Link>
          </motion.div>

          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center justify-center gap-2 mt-6"
          >
            <span className="px-4 py-1.5 rounded-full bg-[#BFFF00] text-black text-sm font-bold">
              Gratuit
            </span>
            <span className="text-white/60">·</span>
            <span className="text-white/60">Sans engagement</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


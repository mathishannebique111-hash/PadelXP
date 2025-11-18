"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface CounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

function Counter({ end, duration = 2, suffix = "", prefix = "" }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#BFFF00] mb-1 sm:mb-2 tabular-nums">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
    </div>
  );
}

export default function SocialProof() {
  const [stats, setStats] = useState({ totalPlayers: 0, totalMatches: 0, activePlayers: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/public/stats", { cache: "no-store" });
        if (!res.ok) {
          console.error("Failed to fetch public stats", res.status);
          return;
        }
        const data = await res.json();
        if (data && typeof data === "object") {
          setStats({
            totalPlayers: Number(data.totalPlayers || 0),
            activePlayers: Number(data.activePlayers || 0),
            totalMatches: Number(data.totalMatches || 0),
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <section className="relative py-12 sm:py-16 bg-gradient-to-b from-black via-[#0a0a1a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Counter end={stats.totalPlayers} suffix="+" />
            <div className="text-xs sm:text-sm text-white/60 mt-1 sm:mt-2">Joueurs inscrits</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center"
          >
            <Counter end={stats.totalMatches} />
            <div className="text-xs sm:text-sm text-white/60 mt-1 sm:mt-2">Matchs joués ce mois</div>
          </motion.div>
        </div>

        {/* Avatars avec texte */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <div className="flex -space-x-2 sm:-space-x-3">
            {[...Array(Math.min(6, stats.activePlayers))].map((_, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 border-[#0066FF] bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center text-sm sm:text-base md:text-xl shadow-lg"
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2 + idx * 0.2,
                  repeat: Infinity,
                  delay: idx * 0.2,
                }}
              >
                👤
              </motion.div>
            ))}
          </div>
          <p className="text-white/70 text-xs sm:text-sm md:text-base text-center sm:text-left sm:ml-4">
            <span className="text-[#BFFF00] font-semibold">{stats.activePlayers}</span>{" "}
            {(stats.activePlayers === 0 || stats.activePlayers === 1) && (
              <>joueur connecté en ce moment</>
            )}
            {stats.activePlayers >= 2 && (
              <>joueurs sont connectés en ce moment</>
            )}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

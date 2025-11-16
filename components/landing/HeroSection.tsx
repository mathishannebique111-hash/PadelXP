"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  // (Raquette désactivée temporairement)

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.1),transparent)] z-0" />
      
      {/* Pattern animé */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Raquette retirée temporairement */}

      {/* Navbar transparente */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-24 w-24 md:h-28 md:w-28 object-contain" />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/player/signup"
              className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-semibold text-sm shadow-[0_0_20px_rgba(0,102,255,0.4)] hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all"
            >
              <span className="flex items-center gap-2">
                Pour les joueurs
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#BFFF00] to-[#00CC99] opacity-0 group-hover:opacity-15 transition-opacity blur-xl" />
            </Link>
            <Link
              href="/clubs"
              className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-semibold text-sm shadow-[0_0_20px_rgba(0,102,255,0.4)] hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all"
            >
              <span className="flex items-center gap-2">
                Pour les Clubs / Complexes
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#BFFF00] to-[#00CC99] opacity-0 group-hover:opacity-15 transition-opacity blur-xl" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Emoji/Trophy */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: isVisible ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
            className="text-8xl mb-4"
          >
            🎾
          </motion.div>

          {/* Titre principal */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight relative">
              Ta prochaine victoire
              <br />
              <span className="bg-gradient-to-r from-[#0066FF] via-[#00CC99] to-[#BFFF00] bg-clip-text text-transparent animate-gradient">
                commence ici
              </span>
            </h1>
          </div>

          {/* Sous-titre */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            <span className="font-semibold text-white">Deviens un joueur de padel d'élite.</span>
            <br />
            <span className="text-[#BFFF00] font-bold">Tracke. Progresse. Domine.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link
              href="/player/signup"
              prefetch={false}
              className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-bold text-lg shadow-[0_0_30px_rgba(0,102,255,0.5)] hover:shadow-[0_0_40px_rgba(0,102,255,0.7)] transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Commencer maintenant
                <motion.span
                  className="inline-block"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#BFFF00] to-[#00CC99] opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
            </Link>

            <Link
              href="/player/login"
              prefetch={false}
              className="px-6 py-4 text-white/80 hover:text-white transition-colors text-base"
            >
              Déjà membre ? Se connecter
            </Link>
          </motion.div>

        </motion.div>
      </div>

      {/* Flèche de scroll dynamique */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? [0, 8, 0] : -10 }}
        transition={{ duration: 1.5, delay: 1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 cursor-pointer group"
        onClick={() => {
          window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
        }}
      >
        <div className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors">
          <span className="text-sm font-semibold uppercase tracking-wider">Découvrir</span>
          <motion.svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-lg"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </section>
  );
}


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

/**
 * PlayerHeroSection - Version of HeroSection for /players route
 * Same as HeroSection but WITHOUT the "Pour les Clubs" button
 */
export default function PlayerHeroSection() {
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();

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

            {/* Navbar transparente - SANS le bouton Clubs */}
            <nav className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 md:px-8 py-2 sm:py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center flex-shrink-0">
                        <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 object-contain" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        <Link
                            href="/player/signup"
                            className="group relative px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-semibold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,102,255,0.4)] hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all"
                        >
                            <span className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                                <span className="hidden sm:inline">S'inscrire</span>
                                <span className="sm:hidden">Inscription</span>
                            </span>
                            <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#BFFF00] to-[#00CC99] opacity-0 group-hover:opacity-15 transition-opacity blur-xl" />
                        </Link>
                        <Link
                            href="/player/login"
                            className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border border-white/20 text-white font-semibold text-xs sm:text-sm hover:bg-white/5 transition-all"
                        >
                            <span className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                                <span className="hidden sm:inline">Se connecter</span>
                                <span className="sm:hidden">Connexion</span>
                            </span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Contenu principal */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="space-y-4 sm:space-y-6 md:space-y-8"
                >
                    {/* Image Raquette */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: isVisible ? 1 : 0 }}
                        transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
                        className="mb-2 sm:mb-3 md:mb-4 flex items-center justify-center"
                    >
                        <img
                            src="/images/Raquette.png"
                            alt="Raquette de padel"
                            className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32 object-contain"
                        />
                    </motion.div>

                    {/* Titre principal */}
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-extrabold text-white leading-tight relative px-2">
                            <span className="block">Ta prochaine victoire</span>
                            <span className="bg-gradient-to-r from-[#0066FF] via-[#00CC99] to-[#BFFF00] bg-clip-text text-transparent animate-gradient block">
                                commence ici
                            </span>
                        </h1>
                    </div>

                    {/* Sous-titre */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isVisible ? 1 : 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed px-4"
                    >
                        <span className="font-semibold text-white">Deviens un joueur de padel d'élite.</span>
                        <br className="hidden sm:block" />
                        <span className="text-[#BFFF00] font-bold">Tracke. Progresse. Domine.</span>
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-3 md:pt-4 px-4"
                    >
                        <Link
                            href="/player/signup"
                            prefetch={false}
                            className="group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-bold text-base sm:text-lg shadow-[0_0_30px_rgba(0,102,255,0.5)] hover:shadow-[0_0_40px_rgba(0,102,255,0.7)] transition-all duration-300 hover:scale-105"
                        >
                            <span className="flex items-center justify-center gap-2">
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
                            className="px-4 sm:px-6 py-3 sm:py-4 text-white/80 hover:text-white transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                            Déjà membre ? Se connecter
                        </Link>
                    </motion.div>

                    {/* Flèche de scroll dynamique */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? [0, 8, 0] : -10 }}
                        transition={{ duration: 1.5, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
                        className="mt-6 sm:mt-8 md:mt-10 cursor-pointer group"
                        onClick={() => {
                            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
                        }}
                    >
                        <div className="flex flex-col items-center gap-1 sm:gap-2 text-white/80 hover:text-white transition-colors">
                            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">Découvrir</span>
                            <motion.svg
                                width="24"
                                height="24"
                                className="sm:w-7 sm:h-7 drop-shadow-lg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                animate={{ y: [0, 6, 0] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <path d="M6 9l6 6 6-6" />
                            </motion.svg>
                        </div>
                    </motion.div>

                </motion.div>
            </div>

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

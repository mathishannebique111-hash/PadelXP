"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ClubsContactModal from "@/components/landing/clubs/ClubsContactModal";
import Ballpit from "@/components/landing/Ballpit";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs",          href: "#pricing"  },
  { label: "FAQ",             href: "#faq"      },
];

function scrollTo(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
}

function FloatingNav({ onContact }: { onContact: () => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <motion.div
        animate={{ width: scrolled ? "min(calc(100% - 2rem), 64rem)" : "auto" }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className={`pointer-events-auto flex items-center gap-1 px-3 py-3 rounded-2xl border transition-colors duration-500 ${
          scrolled ? "bg-black/85 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-black/30 backdrop-blur-xl border-white/8"
        }`}
      >
        {/* Logo */}
        <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="shrink-0">
          <Link href="/" className="flex items-center gap-2.5 pl-1 pr-3">
            <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-14 w-14 object-contain" />
            <span className="hidden lg:block text-sm font-bold text-white/80 tracking-tight">PadelXP</span>
          </Link>
        </motion.div>

        <div className="w-px h-6 bg-white/12 mx-1 shrink-0" />

        {/* Nav links — répartis uniformément sur toute la largeur */}
        <div className="hidden md:flex items-center flex-1">
          {NAV_LINKS.map(({ label, href }, i) => (
            <motion.button
              key={href}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 26, delay: 0.18 + i * 0.07 }}
              onHoverStart={() => setHovered(href)}
              onHoverEnd={() => setHovered(null)}
              onClick={() => scrollTo(href)}
              className="relative flex-1 flex justify-center py-2.5 rounded-xl text-sm font-medium text-white/55 hover:text-white transition-colors duration-150"
            >
              {hovered === href && (
                <motion.span
                  layoutId="nav-hover-pill"
                  className="absolute inset-0 rounded-xl bg-white/8"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </motion.button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/12 mx-1 hidden md:block shrink-0" />

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 26, delay: 0.42 }} className="shrink-0">
          <Link href="/clubs/login" className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/8 transition-all duration-150 whitespace-nowrap">
            Connexion
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 22, delay: 0.5 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shrink-0"
        >
          <button onClick={onContact} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#7DC828] text-black hover:bg-[#6ab422] transition-colors duration-150 whitespace-nowrap">
            Nous contacter
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function ClubsHeroSection() {
  const [visible, setVisible] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => { setVisible(true); }, []);

  return (
    <section className="relative h-screen flex flex-col overflow-hidden bg-black">
      <ClubsContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />

      <div className="absolute inset-0 z-0">
        <Ballpit count={28} gravity={0.45} friction={0.9995} wallBounce={0.92} followCursor={false} />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 bg-black/50" />
      {/* Navy corner glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] z-10 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(10,31,92,0.35) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 right-0 z-10 h-40 bg-gradient-to-t from-black to-transparent" />

      <FloatingNav onContact={() => setContactOpen(true)} />

      {/* Content */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 28 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-3xl mx-auto space-y-7"
        >
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.9 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7DC828]/25 bg-[#7DC828]/8 text-[#7DC828] text-xs font-medium tracking-wider uppercase"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#7DC828] animate-pulse" />
            Plateforme de gestion padel
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.02] tracking-tight">
            Transformez votre club
            <br />
            en <span className="text-[#7DC828]">communauté d'élite</span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed"
          >
            Augmentez la rétention de vos joueurs de{" "}
            <span className="text-white font-semibold">20 %</span> grâce au
            classement, aux challenges et aux badges.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setContactOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#7DC828] text-black font-bold text-base hover:bg-[#6ab422] transition-colors duration-150"
            >
              Commencer gratuitement →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollTo("#features")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border font-semibold text-base transition-all duration-150 text-white/60 hover:text-white"
            style={{ borderColor: "rgba(10,31,92,0.6)", background: "rgba(10,31,92,0.15)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(10,31,92,1)"; (e.currentTarget as HTMLElement).style.background = "rgba(10,31,92,0.35)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(10,31,92,0.6)"; (e.currentTarget as HTMLElement).style.background = "rgba(10,31,92,0.15)"; }}
            >
              Voir les fonctionnalités
            </motion.button>
          </motion.div>

          {/* Trust */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex items-center justify-center gap-5 text-white/30 text-xs"
          >
            <span>✓ Sans engagement</span>
            <span className="w-px h-3 bg-white/15" />
            <span>✓ Déploiement en 24 h</span>
            <span className="w-px h-3 bg-white/15" />
            <span>✓ Support dédié</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 0.35 : 0, y: [0, 5, 0] }}
        transition={{ duration: 1.6, delay: 1.1, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => scrollTo("#problem-solution")}
        className="relative z-20 mb-7 flex flex-col items-center gap-1.5 text-white hover:opacity-70 transition-opacity"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Découvrir</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.button>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";

const TennisBallpit = dynamic(() => import("@/components/landing/TennisBallpit"), { ssr: false });
const CircularGallery = dynamic(() => import("./v2/CircularGallery"), { ssr: false });
const Silk = dynamic(() => import("./v2/Silk"), { ssr: false });

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Application", href: "#application" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Télécharger", href: "#telecharger" },
];

const GALLERY_ITEMS = [
  { image: "/images/Iphone1.png", text: "Niveau évolutif" },
  { image: "/images/Iphone2.png", text: "Coach IA" },
  { image: "/images/Iphone3.png", text: "Classement & Saisons" },
  { image: "/images/Iphone4.png", text: "Enregistrement de matchs" },
  { image: "/images/Iphone5.png", text: "Statistiques" },
  { image: "/images/Iphone6.png", text: "Trouver ton partenaire" },
  { image: "/images/Iphone7.png", text: "Ligues" },
  { image: "/images/Iphone8.png", text: "Challenges" },
  { image: "/images/Iphone9.png", text: "Badges" },
  { image: "/images/Iphone10.png", text: "Historique" },
];

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Coach IA personnel",
    description: "Ton coach analyse tes matchs et te donne des conseils personnalisés pour progresser. Débrief après chaque match, objectifs adaptés à ton niveau.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: "Niveau évolutif",
    description: "Un niveau calculé en temps réel qui évolue à chaque match. Tu sais toujours exactement où tu en es et comment tu progresses.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
    title: "Challenges & Saisons",
    description: "Des défis réguliers pour te motiver, des saisons avec des récompenses à gagner. Chaque match compte pour le classement.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
    title: "Classements",
    description: "Classement de ton club, départemental, régional et national. Compare-toi aux autres joueurs et grimpe dans le classement.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Ligues & Communauté",
    description: "Crée ou rejoins des ligues entre amis. Classements dédiés, matchs comptabilisés, ambiance garantie.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
    title: "Badges & Récompenses",
    description: "Débloque des badges en jouant et en relevant des défis. Montre ta progression et tes exploits à toute la communauté.",
  },
];

const APP_STORE_URL = "https://apps.apple.com/app/id6757870307";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=eu.padelxp.player";

// ─── Reusable ──────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-bold uppercase tracking-[0.3em] text-[#7DC828]">
      {children}
    </span>
  );
}

function scrollTo(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
}

function StoreButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row items-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto px-7 py-3.5 rounded-full font-bold text-sm text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-center"
        style={{
          background: "linear-gradient(135deg, #92e830 0%, #7DC828 55%, #69b220 100%)",
          boxShadow: "0 0 28px rgba(125,200,40,0.45), 0 4px 16px rgba(0,0,0,0.5)",
        }}
      >
        Télécharger sur iPhone
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm transition-all duration-150 text-center"
        style={{
          color: "rgba(255,255,255,0.75)",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(8px)",
        }}
      >
        Télécharger sur Android
      </a>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 40);
      if (window.scrollY > 40) setMenuOpen(false);
    };
    window.addEventListener("scroll", fn, { passive: true });
    fn();
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
        animate={{ width: scrolled ? "min(calc(100% - 2rem), 62rem)" : "min(calc(100% - 2rem), 52rem)" }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className="pointer-events-auto relative flex items-center gap-1 px-3 py-2 rounded-[32px]"
        style={{
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          background: scrolled ? "rgba(4, 5, 10, 0.94)" : "rgba(0, 0, 0, 0.55)",
          boxShadow: scrolled
            ? "0 0 0 1px rgba(255,255,255,0.12), 0 12px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.09)"
            : "0 0 0 1px rgba(255,255,255,0.14), 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Desktop nav */}
        <div className="hidden md:flex items-center justify-between flex-1">
          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Link href="/" className="flex items-center">
              <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-14 w-14 object-contain" />
            </Link>
          </motion.div>

          {NAV_LINKS.map(({ label, href }, i) => (
            <motion.button
              key={href}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 26, delay: 0.15 + i * 0.06 }}
              onHoverStart={() => setHovered(href)}
              onHoverEnd={() => setHovered(null)}
              onClick={() => scrollTo(href)}
              className="relative py-2.5 px-3 text-sm font-medium text-white/65 hover:text-white transition-colors duration-200 rounded-full whitespace-nowrap"
            >
              {hovered === href && (
                <motion.span
                  layoutId="nav-pill-player"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </motion.button>
          ))}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <Link
              href="/pour-les-clubs"
              className="py-2.5 px-3 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all duration-150 whitespace-nowrap"
            >
              Vous êtes un club ?
            </Link>
          </motion.div>
        </div>

        {/* Mobile: logo + hamburger */}
        <div className="flex md:hidden items-center justify-between flex-1">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-12 w-12 object-contain" />
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full text-white/60 hover:text-white transition-colors"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.path key="close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <motion.g key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>
          </button>
        </div>

        {/* Green CTA — always right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shrink-0 ml-2"
        >
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-black whitespace-nowrap transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #92e830 0%, #7DC828 55%, #69b220 100%)",
              boxShadow: "0 0 18px rgba(125,200,40,0.40), 0 2px 6px rgba(0,0,0,0.35)",
            }}
          >
            Télécharger
          </a>
        </motion.div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-[calc(100%+8px)] left-0 right-0 p-2 rounded-2xl flex flex-col gap-0.5 md:hidden"
              style={{
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                background: "rgba(4,5,10,0.97)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 16px 48px rgba(0,0,0,0.7)",
              }}
            >
              {NAV_LINKS.map(({ label, href }) => (
                <button
                  key={href}
                  onClick={() => { scrollTo(href); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-white/65 hover:text-white hover:bg-white/6 transition-all active:scale-[0.98]"
                >
                  {label}
                </button>
              ))}
              <div className="h-px mx-3 my-1" style={{ background: "rgba(255,255,255,0.07)" }} />
              <Link
                href="/pour-les-clubs"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-white/45 hover:text-white hover:bg-white/6 transition-all"
              >
                Vous êtes un club ?
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Hero (fullscreen with tennis balls) ─────────────────────────────────────

function Hero() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <section className="relative flex flex-col overflow-hidden bg-black" style={{ height: "100svh", minHeight: 580 }}>
      {/* 3D tennis balls */}
      <div className="absolute inset-0 z-0"><TennisBallpit /></div>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-[1] bg-black/78" />

      {/* Central spotlight */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% 48%, rgba(0,0,0,0.68) 0%, transparent 75%)" }}
      />

      {/* Corner tints */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] z-[2] pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, rgba(10,31,92,0.3) 0%, transparent 65%)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] z-[2] pointer-events-none"
        style={{ background: "radial-gradient(circle at bottom left, rgba(10,31,92,0.2) 0%, transparent 65%)" }} />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[3] pointer-events-none"
        style={{ height: "22%", background: "linear-gradient(to top, #000000 0%, rgba(0,0,0,0.6) 40%, transparent 100%)" }}
      />

      {/* Spacer for nav */}
      <div className="relative z-10 h-20 sm:h-24 shrink-0" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 32 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto flex flex-col items-center gap-5 sm:gap-7"
        >
          <h1
            className="text-[2.1rem] sm:text-[2.8rem] md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] tracking-[-0.03em]"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,1), 0 8px 40px rgba(0,0,0,0.95)" }}
          >
            Ton coach IA de padel,
            <br />
            <span style={{ color: "#7DC828", textShadow: "0 0 40px rgba(125,200,40,0.35), 0 4px 24px rgba(0,0,0,0.8)" }}>
              dans ta poche
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: ready ? 1 : 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)", textShadow: "0 2px 16px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.9)" }}
          >
            PadelXP analyse tes matchs, te coach après chaque partie et te fait progresser
            avec des challenges, des classements et une communauté de joueurs passionnés.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <StoreButtons />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: ready ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            <span>&#10003; Gratuit</span>
            <span>&#10003; iOS & Android</span>
            <span>&#10003; +500 joueurs actifs</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 0.5 : 0, y: [0, 5, 0] }}
        transition={{ duration: 2, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => scrollTo("#application")}
        className="relative z-10 mb-10 flex flex-col items-center gap-2 text-white shrink-0"
      >
        <span className="text-[9px] uppercase tracking-[0.28em] font-semibold">Découvrir</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.button>
    </section>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function Gallery() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="application" className="overflow-hidden pt-12 sm:pt-20 pb-6 sm:pb-8">
      <FadeIn className="text-center mb-4 px-4 sm:px-6">
        <SectionLabel>L&apos;application</SectionLabel>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 tracking-tight">
          L&apos;application en <span style={{ color: "#7DC828" }}>images</span>
        </h2>
        <p className="text-white/30 text-sm mt-3">Faites glisser pour explorer</p>
      </FadeIn>
      <div className="text-center mb-3 px-4" style={{ minHeight: "1.5rem" }}>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300"
          style={{ color: "#7DC828" }}
        >
          {GALLERY_ITEMS[activeIndex % GALLERY_ITEMS.length]?.text ?? ""}
        </span>
      </div>
      <div className="relative h-[360px] sm:h-[500px] md:h-[660px] lg:h-[720px]">
        <CircularGallery
          items={GALLERY_ITEMS}
          bend={1}
          textColor="#7DC828"
          borderRadius={0.06}
          scrollSpeed={2}
          scrollEase={0.05}
          planeScale={1.3}
          onSnap={setActiveIndex}
        />
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <FadeIn className="text-center mb-12 sm:mb-16">
          <SectionLabel>Fonctionnalités</SectionLabel>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 tracking-tight">
            Tout pour <span style={{ color: "#7DC828" }}>progresser</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div
                className="rounded-2xl p-5 sm:p-6 h-full transition-all duration-300 hover:border-[#7DC828]/30"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(125,200,40,0.1)", border: "1px solid rgba(125,200,40,0.2)" }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section id="telecharger" className="py-16 sm:py-24">
      <FadeIn className="max-w-3xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
        <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-20 sm:h-28 object-contain mb-6 drop-shadow-[0_0_25px_rgba(125,200,40,0.5)]" />
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
          Prêt à passer au niveau supérieur ?
        </h2>
        <p className="text-white/50 text-sm sm:text-base mb-8 max-w-md">
          Rejoins la communauté PadelXP et commence à progresser dès ton prochain match.
        </p>
        <StoreButtons />
      </FadeIn>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-10 sm:py-14 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Social + brand */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-12 w-12 object-contain opacity-70" />

          <div className="flex items-center gap-5">
            {/* Instagram */}
            <a href="https://instagram.com/padelxp_" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/70 transition-colors" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            {/* Facebook */}
            <a href="https://facebook.com/padelxp_" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/70 transition-colors" aria-label="Facebook">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            {/* TikTok */}
            <a href="https://tiktok.com/@padelxp" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/70 transition-colors" aria-label="TikTok">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/20">
            <Link href="/pour-les-clubs" className="hover:text-white/45 transition-colors">Vous êtes un club ?</Link>
            <a href="#" className="hover:text-white/45 transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-white/45 transition-colors">Confidentialité</a>
          </nav>
          <p className="text-xs text-white/15">&copy; {new Date().getFullYear()} PadelXP</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PlayerLanding() {
  return (
    <div className="bg-black overflow-x-hidden min-h-screen">
      <Nav />

      {/* Hero keeps its own black background with tennis balls */}
      <Hero />

      {/* Remaining sections with Silk background */}
      <div className="relative">
        <div className="absolute inset-0 z-0" aria-hidden>
          <Silk speed={4.7} scale={1.2} color="#0A1F5C" noiseIntensity={1} rotation={0} />
        </div>
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: "rgba(17,24,33,0.62)" }} aria-hidden />
        <div
          className="absolute top-0 left-0 right-0 z-[2] pointer-events-none"
          style={{ height: "220px", background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.1) 75%, transparent 100%)" }}
          aria-hidden
        />

        <div className="relative z-10">
          <Gallery />
          <FeaturesSection />
          <FinalCTA />
          <Footer />
        </div>
      </div>
    </div>
  );
}

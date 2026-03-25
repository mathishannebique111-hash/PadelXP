"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import LandingNav from "./LandingNav";
import CustomCursor from "./CustomCursor";
import Carousel from "./Carousel";
import GlassSurface from "./GlassSurface";
import RotatingText from "./RotatingText";
import CardSwap, { Card } from "./CardSwap";
import ClubsContactModal from "@/components/landing/clubs/ClubsContactModal";

const TennisBallpit = dynamic(() => import("@/components/landing/TennisBallpit"), { ssr: false });
const CircularGallery = dynamic(() => import("./CircularGallery"), { ssr: false });
const Silk = dynamic(() => import("./Silk"), { ssr: false });
const Antigravity = dynamic(() => import("./Antigravity"), { ssr: false });

// ─── Data ─────────────────────────────────────────────────────────────────────

const CLUBS = [
  "Padel Arena Paris", "Club Sud Padel", "Urban Padel Lyon", "Padel Club Bordeaux",
  "Nice Padel Club", "Padel & Co Marseille", "Padel Factory Lille", "Tennis & Padel Nantes",
  "Padel Arena Paris", "Club Sud Padel", "Urban Padel Lyon", "Padel Club Bordeaux",
];

const HOW_STEPS = [
  {
    n: "01",
    title: "Démo avec l'équipe PadelXP",
    body: "Un conseiller PadelXP vous présente en détail l'application joueur et le dashboard club, et répond à toutes vos questions pour que vous ayez une vision complète de ce que la solution peut apporter à votre club.",
    tag: "Découverte",
  },
  {
    n: "02",
    title: "Onboarding",
    body: "Notre équipe crée votre application en marque blanche aux couleurs de votre club. En moins de 48h, elle est prête et disponible pour vos joueurs.",
    tag: "Configuration",
  },
  {
    n: "03",
    title: "Vos joueurs rejoignent",
    body: "Des supports de communication sur-mesure vous sont fournis pour inviter vos membres sur l'app. Votre club prend vie et gagne en dynamisme : classements, défis, badges — une communauté soudée autour de votre club.",
    tag: "Lancement",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "79",
    desc: "1 à 3 terrains",
    features: ["Classement ELO", "App joueur brandée", "Challenges & tournois", "Support email"],
    featured: false,
  },
  {
    name: "Pro",
    price: "139",
    desc: "4 à 6 terrains",
    features: ["Tout le Starter", "Badges & gamification", "Dashboard analytics", "Support prioritaire", "Intégration réservation"],
    featured: true,
  },
  {
    name: "Elite",
    price: "199",
    desc: "7 terrains et plus",
    features: ["Tout le Pro", "Multi-clubs", "White-label complet", "API & intégrations", "Account manager dédié"],
    featured: false,
  },
];

const FAQS = [
  { q: "Combien de temps pour déployer PadelXP dans mon club ?", a: "En moins de 48h. Nous nous occupons du setup et de configurer l'app sous vos couleurs et votre branding." },
  { q: "Les joueurs adhèrent-ils rapidement à l'application ?", a: "Oui, la dimension compétitive et la gamification (niveau évolutif, badges, historique) créent un véritable engouement. Les joueurs prennent vite l'habitude de tout enregistrer dès les premières semaines !" },
  { q: "Et pour la réservation des terrains ?", a: "Nous proposons un module de réservation complet si vous en avez besoin. Si vous avez déjà votre propre outil, PadelXP vient s'y ajouter en parfait complément !" },
  { q: "Y a-t-il un engagement sur la durée ?", a: "Non, notre solution est totalement sans engagement. Vous pouvez l'utiliser aussi longtemps que vous le souhaitez, et résilier votre abonnement à tout moment très simplement." },
  { q: "Puis-je créer plusieurs challenges en même temps ?", a: "Tout à fait ! Vous pouvez lancer des défis saisonniers, des ligues internes, des compétitions pour certains niveaux, le tout en parallèle. L'application calcule automatiquement les résultats." },
];

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

function useWindowWidth() {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <section className="relative h-screen flex flex-col overflow-hidden bg-black">
      {/* 3D balls */}
      <div className="absolute inset-0 z-0"><TennisBallpit /></div>

      {/* Base dark layer */}
      <div className="absolute inset-0 z-[1] bg-black/78" />

      {/* Central spotlight — extra darkness behind text for legibility */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 48%, rgba(0,0,0,0.68) 0%, transparent 75%)",
        }}
      />

      {/* Corner tints */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] z-[2] pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, rgba(10,31,92,0.3) 0%, transparent 65%)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] z-[2] pointer-events-none"
        style={{ background: "radial-gradient(circle at bottom left, rgba(10,31,92,0.2) 0%, transparent 65%)" }} />

      {/* Bottom fade — eased cubic curve for a natural dissolve */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[3] pointer-events-none"
        style={{
          height: "45%",
          background: "linear-gradient(to top, #000000 0%, #000000 10%, rgba(0,0,0,0.88) 28%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.15) 80%, transparent 100%)",
        }}
      />

      {/* Spacer to push content below the floating nav bar (~88px) */}
      <div className="relative z-10 h-24 shrink-0" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 32 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto flex flex-col items-center gap-7"
        >
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.0] tracking-[-0.03em]"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,1), 0 8px 40px rgba(0,0,0,0.95)" }}
          >
            Transformez votre club de padel
            <br />
            <span style={{ color: "#7DC828", textShadow: "0 0 40px rgba(125,200,40,0.35), 0 4px 24px rgba(0,0,0,0.8)" }}>
              en communauté
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: ready ? 1 : 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg md:text-xl max-w-2xl leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)", textShadow: "0 2px 16px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.9)" }}
          >
            Augmentez la rétention de vos joueurs de{" "}
            <span style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>20 %</span>{" "}
            grâce au classement, aux challenges et aux badges.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          >
            <a
              href="https://calendly.com/contactpadelxp/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-center"
              style={{
                background: "linear-gradient(135deg, #92e830 0%, #7DC828 55%, #69b220 100%)",
                boxShadow: "0 0 28px rgba(125,200,40,0.45), 0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              Démo gratuite →
            </a>
            <button
              onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base transition-all duration-150 text-center"
              style={{
                color: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(8px)",
              }}
            >
              Voir comment ça marche
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: ready ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex items-center gap-6 text-xs"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            <span>✓ Sans engagement</span>
            <span className="w-px h-3 bg-white/15 hidden xs:block" />
            <span className="hidden xs:inline">✓ 14 jours gratuits</span>
            <span className="w-px h-3 bg-white/15 hidden sm:block" />
            <span className="hidden sm:inline">✓ Déploiement en 24 h</span>
          </motion.div>
        </motion.div>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 0.5 : 0, y: [0, 5, 0] }}
        transition={{ duration: 2, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => document.querySelector("#trust")?.scrollIntoView({ behavior: "smooth" })}
        className="relative z-10 mb-10 flex flex-col items-center gap-2 text-white shrink-0"
      >
        <span className="text-[9px] uppercase tracking-[0.28em] font-semibold">Découvrir comment</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.button>
    </section>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────

function TrustBar() {
  return (
    <div id="trust" className="py-7 overflow-hidden">
      <p className="text-center text-[11px] uppercase tracking-[0.3em] text-white/20 font-semibold mb-6">
        Rejoignez les clubs qui font confiance à PadelXP
      </p>
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-black to-transparent" />
        <div className="flex gap-16 animate-[marquee_28s_linear_infinite] whitespace-nowrap">
          {[...CLUBS, ...CLUBS].map((name, i) => (
            <span key={i} className="text-sm font-semibold text-white/25 tracking-wide shrink-0">
              {name}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Gallery (CircularGallery) ─────────────────────────────────────────────────

const GALLERY_ITEMS = [
  { image: "/images/Iphone1.png",  text: "Niveau évolutif" },
  { image: "/images/Iphone2.png",  text: "Classement" },
  { image: "/images/Iphone3.png",  text: "Challenges" },
  { image: "/images/Iphone4.png",  text: "Ligues" },
  { image: "/images/Iphone5.png",  text: "Enregistrement de matchs" },
  { image: "/images/Iphone6.png",  text: "Historique" },
  { image: "/images/Iphone7.png",  text: "Trouver son partenaire" },
  { image: "/images/Iphone8.png",  text: "Trouver son match" },
  { image: "/images/Iphone9.png",  text: "Statistiques" },
  { image: "/images/Iphone10.png", text: "Badges" },
];

function Gallery() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="overflow-hidden" style={{ paddingTop: "5rem", paddingBottom: "2rem" }}>
      <FadeIn className="text-center mb-4 px-6">
        <SectionLabel>Aperçu application marque blanche</SectionLabel>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-4 tracking-tight">
          La plateforme en <span style={{ color: "#7DC828" }}>images</span>
        </h2>
        <p className="text-white/30 text-sm mt-3">Faites glisser pour explorer</p>
      </FadeIn>
      <div className="text-center mb-4" style={{ minHeight: "1.5rem" }}>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300"
          style={{ color: "#7DC828" }}
        >
          {GALLERY_ITEMS[activeIndex % GALLERY_ITEMS.length]?.text ?? ""}
        </span>
      </div>
      <div className="relative h-[420px] sm:h-[560px] md:h-[720px]">
        <CircularGallery
          items={GALLERY_ITEMS}
          bend={1}
          textColor="#7DC828"
          borderRadius={0}
          scrollSpeed={2}
          scrollEase={0.05}
          planeScale={1.6}
          onSnap={setActiveIndex}
        />
      </div>
    </section>
  );
}

// ─── Features (Carousel) ─────────────────────────────────────────────────────

const FEATURE_ITEMS = [
  {
    id: 1,
    title: "Niveau évolutif & Statistiques",
    description: "Un niveau calculé en temps réel qui évolue au fur et à mesure des matchs enregistrés et qui reflète vraiment où en est le joueur. Taux de victoire, progression, historique — chaque match compte.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    id: 2,
    title: "Recherche de matchs & partenaires",
    description: "Les recherches de matchs et de partenaires se font précisément selon le niveau et le profil de chaque joueur. Fini les matchs déséquilibrés — chaque partie est compétitive et engageante.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" />
      </svg>
    ),
  },
  {
    id: 3,
    title: "Challenges",
    description: "Créez des challenges personnalisés pour animer votre club tout au long de l'année, même sans tournois. Les joueurs débloquent des récompenses virtuelles (badges, points) et le club peut mettre en place des récompenses physiques exclusives. Un atout majeur pour booster l'engagement !",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    id: 4,
    title: "Ligues privées",
    description: "Entre amis ou organisées par le club — pour des séminaires, des groupes de niveau, des abonnés. Chaque ligue a son propre classement et son ambiance.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 5,
    title: "Classement",
    description: "Classement interne au club, mais aussi départemental, régional et national. Une fierté pour vos membres et un vrai moteur de fidélisation.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
  },
  {
    id: 6,
    title: "Badges & Gamification",
    description: "Des badges qui valorisent les exploits et la progression. La reconnaissance visible crée de l'attachement et donne envie de revenir jouer.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    id: 7,
    title: "Dashboard club",
    description: "Créez vos challenges et ligues, consultez vos membres, suivez l'activité en temps réel. Tout pour piloter et faire grandir votre club au quotidien.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    id: 8,
    title: "App en marque blanche",
    description: "Toute l'application sera brandée selon les couleurs et le logo de votre club. Offrez une expérience premium et ultra personnalisée à vos joueurs, où l'identité de votre club est au centre de l'expérience.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DC828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/>
      </svg>
    ),
  },
];

function Features() {
  const w = useWindowWidth();
  const carouselWidth = Math.min(w - 48, 480);
  return (
    <section id="features" className="pt-8 md:pt-16" style={{ marginBottom: 0, paddingBottom: 0 }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn className="mb-8 sm:mb-12">
          <SectionLabel>Fonctionnalités</SectionLabel>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white mt-4 tracking-tight leading-tight">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2 whitespace-nowrap">
              Tout ce dont votre club a
              <RotatingText
                texts={["besoin", "envie", "rêvé"]}
                mainClassName="px-3 py-1 rounded-xl overflow-hidden justify-center"
                style={{
                  background: "rgba(125,200,40,0.15)",
                  border: "1px solid rgba(125,200,40,0.35)",
                  color: "#7DC828",
                  display: "inline-flex",
                }}
                splitLevelClassName="overflow-hidden"
                staggerFrom="last"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.03}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2200}
              />
            </span>
            <span className="block text-white/25 mt-1">Rien de superflu.</span>
          </h2>
        </FadeIn>
        <div className="flex justify-center">
          <Carousel
            items={FEATURE_ITEMS}
            baseWidth={carouselWidth}
            height={w < 480 ? 380 : 460}
            autoplay={false}
            loop={true}
            round={false}
          />
        </div>
      </div>
    </section>
  );
}

// ─── How it works — CardSwap ──────────────────────────────────────────────────

function HowItWorks() {
  const w = useWindowWidth();
  const cardW = w < 480 ? w - 48 : w < 768 ? 400 : w < 1024 ? 460 : 580;
  const cardH = w < 480 ? 300 : w < 768 ? 360 : w < 1024 ? 400 : 460;
  const cardDist = w < 768 ? 40 : 60;
  const cardVertDist = w < 768 ? 45 : 70;

  return (
    <section id="how-it-works" className="pt-12 pb-16 md:pt-24 md:pb-40">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 xl:gap-24">

          {/* Left — text */}
          <div className="flex-1 min-w-0 w-full">
            <SectionLabel>Mise en place</SectionLabel>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white mt-4 mb-4 sm:mb-6 tracking-tight leading-tight">
              Opérationnel<br />en 3 étapes
            </h2>
            <p className="text-white/45 text-base sm:text-lg leading-relaxed max-w-md">
              De l'inscription à vos premiers joueurs actifs en moins de 48 heures.
            </p>
          </div>

          {/* Right — CardSwap */}
          <div className="shrink-0 relative w-full lg:w-auto flex justify-center" style={{ height: cardH + 160 }}>
            <CardSwap
              width={cardW}
              height={cardH}
              cardDistance={cardDist}
              verticalDistance={cardVertDist}
              autoplay={false}
              swapOnClick={true}
              skewAmount={6}
              easing="elastic"
            >
              {HOW_STEPS.map(({ n, title, body, tag }) => (
                <Card key={n}>
                  <div className="w-full h-full flex flex-col relative overflow-hidden p-6 sm:p-10 md:p-[2.5rem_3rem]">
                    {/* Green top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #7DC828 0%, transparent 75%)" }} />
                    {/* Big background number */}
                    <span className="absolute right-8 top-4 select-none pointer-events-none font-black" style={{ fontSize: "9rem", lineHeight: 1, color: "rgba(125,200,40,0.12)" }}>{n}</span>
                    {/* Tag */}
                    <span className="text-[10px] font-bold uppercase tracking-[0.28em] mb-6" style={{ color: "rgba(125,200,40,0.65)" }}>{tag}</span>
                    {/* Content */}
                    <div className="w-7 h-[2px] rounded-full mb-5" style={{ background: "#7DC828" }} />
                    <h3 className="text-2xl font-extrabold text-white mb-4 leading-tight tracking-tight">{title}</h3>
                    <p className="text-white/55 text-base leading-relaxed">{body}</p>
                  </div>
                </Card>
              ))}
            </CardSwap>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing({ onContact }: { onContact: () => void }) {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="pt-12 md:pt-16 pb-24 md:pb-32 relative" style={{ zIndex: 1 }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn className="mb-16 text-center">
          <SectionLabel>Tarifs</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mt-4 tracking-tight mb-8">
            Simple et transparent
          </h2>
          <div className="inline-flex items-center gap-3 p-1 rounded-full border border-white/8 bg-white/3">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? "bg-white text-black" : "text-white/40"}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${annual ? "bg-white text-black" : "text-white/40"}`}
            >
              Annuel <span className="text-[#7DC828] text-xs ml-1">2 mois offerts</span>
            </button>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PRICING.map(({ name, price, desc, features, featured }, i) => {
            const monthly = parseInt(price);
            const displayPrice = annual ? String(Math.round(monthly * 10 / 12)) : String(monthly);
            const annualTotal = annual ? monthly * 10 : null;
            const isElite = name === "Elite";

            return (
              <FadeIn key={i} delay={i * 0.1} className="h-full">
                {featured ? (
                  <div className="relative flex flex-col rounded-[24px] h-full overflow-hidden"
                    style={{ background: "#ffffff", border: "1.5px solid #7DC828", boxShadow: "0 8px 40px rgba(125,200,40,0.18), 0 2px 12px rgba(0,0,0,0.07)" }}>
                    <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #7DC828 0%, #a3e635 100%)" }} />
                    <div className="flex flex-col p-5 flex-1">
                      <PricingCardContent name={name} displayPrice={displayPrice} annualTotal={annualTotal} desc={desc} features={features} featured onContact={onContact} isElite={false} />
                    </div>
                  </div>
                ) : isElite ? (
                  <div className="relative flex flex-col rounded-[24px] h-full overflow-hidden"
                    style={{ background: "#ffffff", border: "1px solid rgba(10,31,92,0.13)", boxShadow: "0 6px 32px rgba(10,31,92,0.07), 0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #0A1F5C 0%, rgba(10,31,92,0.25) 70%, transparent 100%)" }} />
                    <div className="flex flex-col p-5 flex-1">
                      <PricingCardContent name={name} displayPrice={displayPrice} annualTotal={annualTotal} desc={desc} features={features} featured={false} onContact={onContact} isElite={true} />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col rounded-[24px] h-full overflow-hidden"
                    style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                    <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, rgba(10,31,92,0.3) 0%, transparent 70%)" }} />
                    <div className="flex flex-col p-5 flex-1">
                      <PricingCardContent name={name} displayPrice={displayPrice} annualTotal={annualTotal} desc={desc} features={features} featured={false} onContact={onContact} isElite={false} />
                    </div>
                  </div>
                )}
              </FadeIn>
            );
          })}
        </div>

        <FadeIn delay={0.3} className="mt-10 text-center text-sm text-white/20">
          Sans engagement · Sans frais cachés · Annulation à tout moment
        </FadeIn>
      </div>
    </section>
  );
}

function PricingCardContent({
  name, displayPrice, annualTotal, desc, features, featured, onContact, isElite
}: {
  name: string; displayPrice: string; annualTotal: number | null; desc: string;
  features: string[]; featured: boolean; onContact: () => void; isElite: boolean;
}) {
  const accentColor = featured ? "#7DC828" : "#0A1F5C";
  const nameColor = featured ? "#7DC828" : "#0A1F5C";
  const badgeBg = featured ? "rgba(125,200,40,0.1)" : "rgba(10,31,92,0.07)";

  return (
    <div className="flex flex-col h-full">
      {/* Plan header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: nameColor }}>{name}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: badgeBg, color: nameColor }}>{desc}</span>
        </div>
        {/* Price */}
        <div className="flex items-end gap-1.5 mb-1">
          <span className="text-5xl font-black tracking-tight leading-none" style={{ color: "#0A1F5C" }}>{displayPrice}</span>
          <div className="flex flex-col mb-0.5">
            <span className="text-sm font-medium" style={{ color: "rgba(10,31,92,0.5)" }}>€</span>
            <span className="text-xs" style={{ color: "rgba(10,31,92,0.4)" }}>/mois</span>
          </div>
        </div>
        {annualTotal !== null ? (
          <p className="text-xs mt-1.5" style={{ color: accentColor, opacity: 0.8 }}>
            soit {annualTotal}€/an · <span style={{ color: "rgba(10,31,92,0.4)" }}>2 mois offerts</span>
          </p>
        ) : (
          <p className="text-xs mt-1.5" style={{ color: "rgba(10,31,92,0.3)" }}>Facturation mensuelle</p>
        )}
      </div>

      {/* Separator */}
      <div className="w-full h-px mb-4" style={{ background: `linear-gradient(90deg, ${accentColor}50 0%, transparent 80%)` }} />

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-5">
        {features.map((f, j) => (
          <li key={j} className="flex items-start gap-2.5 text-sm">
            <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="7.5" fill={accentColor} fillOpacity="0.12" />
              <path d="M4.5 7.5L6.5 9.5L10.5 5.5" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: "rgba(10,31,92,0.7)" }}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={onContact}
        className="w-full py-3 rounded-full text-sm font-bold transition-all duration-200"
        style={featured ? {
          background: "linear-gradient(135deg, #7DC828 0%, #a3e635 100%)",
          color: "#fff",
          boxShadow: "0 4px 20px rgba(125,200,40,0.3)"
        } : {
          background: "transparent",
          color: "#0A1F5C",
          border: "1.5px solid rgba(10,31,92,0.25)"
        }}
      >
        Démo gratuite
      </button>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="pt-8 pb-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(125,200,40,0.04) 0%, transparent 70%)" }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
        <FadeIn className="mb-10 sm:mb-16 text-center">
          <SectionLabel>Questions fréquentes</SectionLabel>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-4 tracking-tight">
            Tout ce que vous<br />
            <span className="text-white/25">voulez savoir</span>
          </h2>
        </FadeIn>

        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <motion.div
                className="rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: open === i ? "rgba(125,200,40,0.06)" : "rgba(255,255,255,0.05)",
                  border: open === i ? "1px solid rgba(125,200,40,0.3)" : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: open === i ? "0 4px 32px rgba(125,200,40,0.1)" : "0 2px 12px rgba(0,0,0,0.25)",
                }}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left px-4 sm:px-7 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-6 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="shrink-0 text-[11px] font-bold tabular-nums"
                      style={{ color: open === i ? "rgba(125,200,40,0.7)" : "rgba(255,255,255,0.15)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-[15px] font-semibold leading-snug transition-colors duration-200 ${open === i ? "text-white" : "text-white/55 group-hover:text-white/80"}`}>
                      {q}
                    </span>
                  </div>
                  <div
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: open === i ? "rgba(125,200,40,0.15)" : "rgba(255,255,255,0.05)",
                      border: open === i ? "1px solid rgba(125,200,40,0.3)" : "1px solid rgba(255,255,255,0.08)",
                      color: open === i ? "#7DC828" : "rgba(255,255,255,0.3)",
                      transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-7 pb-6 flex gap-4">
                        {/* Left accent line */}
                        <div className="w-px shrink-0 ml-[18px]" style={{ background: "rgba(125,200,40,0.25)" }} />
                        <p className="text-sm text-white/45 leading-relaxed pl-2">{a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="pt-8 pb-32 relative overflow-hidden">
      {/* Antigravity particle background */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <Antigravity
          count={300}
          magnetRadius={6}
          ringRadius={7}
          waveSpeed={0.4}
          waveAmplitude={1}
          particleSize={1.5}
          lerpSpeed={0.05}
          color="#7DC828"
          autoAnimate
          particleVariance={1}
          rotationSpeed={0}
          depthFactor={1}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={10}
        />
      </div>
      <FadeIn className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center relative" style={{ zIndex: 1 }}>
        <div className="mb-6">
          <SectionLabel>Prêt à démarrer ?</SectionLabel>
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none flex flex-col items-center">
          Votre club mérite
          <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-32 sm:h-48 md:h-64 lg:h-80 object-contain drop-shadow-[0_0_25px_rgba(125,200,40,0.6)] -mt-8 sm:-mt-12 -mb-4 sm:-mb-8 relative z-10" />
        </h2>
        
        <div className="flex flex-col sm:flex-row items-center relative z-20">
          <a
            href="https://calendly.com/contactpadelxp/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-4 rounded-full font-bold text-base text-black hover:opacity-90 transition-opacity"
            style={{ background: "#7DC828" }}
          >
            Démo gratuite →
          </a>
        </div>
      </FadeIn>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-10 w-10 object-contain opacity-70" />
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/20">
          {["Mentions légales", "CGV", "CGU", "Confidentialité", "Cookies"].map((l) => (
            <a key={l} href="#" className="hover:text-white/45 transition-colors">{l}</a>
          ))}
        </nav>
        <p className="text-xs text-white/18">© {new Date().getFullYear()} PadelXP</p>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LandingV2() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="bg-black overflow-x-hidden">
      <ClubsContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
      <CustomCursor />
      <LandingNav onContact={() => setContactOpen(true)} />

      {/* Hero keeps its own black background */}
      <Hero />

      {/* All other sections share a single Grainient background */}
      <div className="relative">
        {/* Silk: animated WebGL background */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <Silk
            speed={4.7}
            scale={1.2}
            color="#0A1F5C"
            noiseIntensity={1}
            rotation={0}
          />
        </div>

        {/* Subtle dark overlay so content stays clearly readable */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: "rgba(17,24,33,0.62)" }} aria-hidden />

        {/* Top fade: soft entry into the Grainient */}
        <div
          className="absolute top-0 left-0 right-0 z-[2] pointer-events-none"
          style={{
            height: "220px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.1) 75%, transparent 100%)",
          }}
          aria-hidden
        />

        {/* Content sits above the gradient */}
        <div className="relative z-10">
          <Gallery />
          <Features />
          <HowItWorks />
          <Pricing onContact={() => setContactOpen(true)} />
          <FAQ />
          <FinalCTA />
          <Footer />
        </div>
      </div>
    </div>
  );
}

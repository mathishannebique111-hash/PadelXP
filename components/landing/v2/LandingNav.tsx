"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features"      },
  { label: "Mise en place",   href: "#how-it-works"  },
  { label: "Tarifs",          href: "#pricing"       },
  { label: "FAQ",             href: "#faq"           },
];

function scrollTo(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingNav({ onContact }: { onContact?: () => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
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
        animate={{
          width: scrolled
            ? "min(calc(100% - 2rem), 62rem)"
            : "min(calc(100% - 2rem), 52rem)",
        }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className="pointer-events-auto flex items-center gap-1 px-3 py-2 rounded-[32px]"
        style={{
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          background: scrolled
            ? "rgba(4, 5, 10, 0.94)"
            : "rgba(0, 0, 0, 0.55)",
          boxShadow: scrolled
            ? "0 0 0 1px rgba(255,255,255,0.12), 0 12px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.09)"
            : "0 0 0 1px rgba(255,255,255,0.14), 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Logo + liens + connexion : justify-between pour espacement homogène */}
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
                  layoutId="nav-pill-v2"
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
              href="/clubs/login"
              className="py-2.5 px-3 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all duration-150 whitespace-nowrap"
            >
              Connexion
            </Link>
          </motion.div>
        </div>

        {/* Mobile logo */}
        <div className="flex md:hidden items-center flex-1">
          <Link href="/">
            <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-14 w-14 object-contain" />
          </Link>
        </div>

        {/* Démo gratuite — toujours à droite */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shrink-0 ml-2"
        >
          <a
            href="https://calendly.com/contactpadelxp/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 rounded-full text-sm font-semibold text-black whitespace-nowrap transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #92e830 0%, #7DC828 55%, #69b220 100%)",
              boxShadow: "0 0 18px rgba(125,200,40,0.40), 0 2px 6px rgba(0,0,0,0.35)",
            }}
          >
            Démo gratuite
          </a>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

"use client";

import Link from "next/link";

const LINKS = [
  { label: "À propos",         href: "/about"   },
  { label: "Mentions légales", href: "/legal"   },
  { label: "CGV",              href: "/cgv"     },
  { label: "CGU",              href: "/terms"   },
  { label: "Confidentialité",  href: "/privacy" },
  { label: "Cookies",          href: "/cookies" },
];

export default function Footer() {
  return (
    <footer className="relative bg-black border-t border-white/6">
      {/* Top accent */}
      <div className="h-px bg-[#7DC828]/20" />

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">

          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-12 w-12 object-contain" />
            <div>
              <p className="font-bold text-white text-sm">PadelXP</p>
              <p className="text-white/30 text-xs">Fait par un joueur, pour les joueurs</p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className="text-white/35 hover:text-white text-xs transition-colors duration-150">
                {label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} PadelXP
          </p>
        </div>
      </div>
    </footer>
  );
}

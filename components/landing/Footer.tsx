"use client";

import Link from "next/link";
import PadelRacketLogo from "@/components/icons/PadelRacketLogo";

export default function Footer() {
  return (
    <footer className="relative py-12 bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-white/20">
              <PadelRacketLogo className="h-8 w-8" />
            </div>
            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80 tracking-wide">
              PadelXP
            </span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/about" className="text-white/60 hover:text-white transition-colors">
              À propos
            </Link>
            <Link href="/contact" className="text-white/60 hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
              CGU
            </Link>
            <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">
              Confidentialité
            </Link>
          </nav>

          {/* Copyright */}
          <div className="text-sm text-white/40 text-center md:text-right">
            © {new Date().getFullYear()} PadelLeague · Made with 🏆 for padel lovers
          </div>
        </div>
      </div>
    </footer>
  );
}


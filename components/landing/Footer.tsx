"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative py-12 bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-32 w-32 md:h-40 md:w-40 object-contain" />
            </div>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/about" className="text-white/60 hover:text-white transition-colors">
              À propos
            </Link>
            <Link href="/contact" className="text-white/60 hover:text-white transition-colors">
              Contact
            </Link>
            
            {/* Liens pour joueurs */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/player/legal" className="text-white/60 hover:text-white transition-colors">
                Mentions légales (Joueurs)
              </Link>
              <Link href="/player/terms" className="text-white/60 hover:text-white transition-colors">
                CGU (Joueurs)
              </Link>
              <Link href="/player/privacy" className="text-white/60 hover:text-white transition-colors">
                Confidentialité (Joueurs)
              </Link>
            </div>
            
            {/* Séparateur */}
            <span className="text-white/30">|</span>
            
            {/* Liens pour clubs */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/legal" className="text-white/60 hover:text-white transition-colors">
                Mentions légales (Clubs)
              </Link>
              <Link href="/cgv" className="text-white/60 hover:text-white transition-colors">
                CGV
              </Link>
              <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
                CGU (Clubs)
              </Link>
              <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">
                Confidentialité (Clubs)
              </Link>
            </div>
            
            {/* Liens cookies */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/player/cookies" className="text-white/60 hover:text-white transition-colors">
                Cookies (Joueurs)
              </Link>
              <Link href="/cookies" className="text-white/60 hover:text-white transition-colors">
                Cookies (Clubs)
              </Link>
            </div>
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


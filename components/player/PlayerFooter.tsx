"use client";

import Link from "next/link";

export default function PlayerFooter() {
  return (
    <footer className="relative py-8 border-t border-white/10 mt-12">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col items-center gap-4">
          {/* Links légaux pour joueurs */}
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/60">
            <Link href="/player/legal" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <span className="text-white/30">•</span>
            <Link href="/player/terms" className="hover:text-white transition-colors">
              CGU
            </Link>
            <span className="text-white/30">•</span>
            <Link href="/player/privacy" className="hover:text-white transition-colors">
              Confidentialité
            </Link>
            <span className="text-white/30">•</span>
            <Link href="/player/cookies" className="hover:text-white transition-colors">
              Cookies
            </Link>
            <span className="text-white/30">•</span>
            <Link href="/cookies/gestion" className="hover:text-white transition-colors">
              Gérer les cookies
            </Link>
          </nav>

          {/* Copyright */}
          <div className="text-xs text-white/40 text-center">
            © {new Date().getFullYear()} PadelXP · Service gratuit pour les joueurs
          </div>
        </div>
      </div>
    </footer>
  );
}


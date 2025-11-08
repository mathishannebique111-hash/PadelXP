"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-[#0066FF]/20 to-[#00CC99]/20 rounded-3xl p-8 md:p-12 border-2 border-[#0066FF]/30 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            🚀 REJOIGNEZ LES CLUBS / COMPLEXES D'ÉLITE
          </h2>
          
          <p className="text-xl text-white/80 mb-8 leading-relaxed">
            Transformez l'expérience de vos membres dès aujourd'hui avec Padel Pro
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center gap-3 text-white/80">
              <span>✅</span>
              <span>Essai gratuit 30 jours (sans CB)</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-white/80">
              <span>✅</span>
              <span>Installation guidée en 5 minutes</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-white/80">
              <span>✅</span>
              <span>Support dédié inclus</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-white/80">
              <span>✅</span>
              <span>Vos membres vont adorer</span>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="#pricing"
              className="block w-full group relative px-8 py-4 rounded-xl bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-bold text-lg shadow-[0_0_30px_rgba(0,204,153,0.5)] hover:shadow-[0_0_40px_rgba(0,204,153,0.7)] transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center justify-center gap-2">
                🎯 Démarrer l'essai gratuit maintenant
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
              href="#contact"
              className="block w-full px-6 py-3 text-center rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all"
            >
              📞 Réserver une démo personnalisée
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-white/60 text-sm">
              💬 Questions ? pro@padelapp.fr • 06 XX XX XX XX
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


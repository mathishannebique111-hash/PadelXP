"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";

export default function Pricing() {
  const features = [
    "🏆 Classement automatique temps réel",
    "🎯 Challenges illimités (lancement en 3 clics)",
    "🎮 Système de badges & gamification",
    "📢 Feed social interactif du club",
    "🎪 Challenges mensuels automatiques",
    "📱 Page club publique personnalisée",
    "👥 Profils membres avec stats complètes",
    "🔔 Relances automatiques",
    "📊 Dashboard gérant pour suivre activité",
    "🎨 Logo + couleurs personnalisables",
    "🛠️ Configuration personnalisée incluse",
    "📧 Support client par mail"
  ];

  return (
    <section id="pricing" className="relative py-24 bg-black">
      <div className="max-w-4xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            🚀 OFFRE LANCEMENT{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              EXCLUSIVE
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 border-2 border-[#0066FF]/30 shadow-2xl"
        >
          {/* Prix */}
          <div className="text-center mb-8">
            <div className="text-6xl md:text-7xl font-extrabold text-white mb-2">
              99€<span className="text-3xl text-white/60">/mois</span>
            </div>
            <div className="text-white/70 text-lg">
              Pour votre club / complexe • Membres illimités
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 mb-8">
            <h3 className="text-xl font-bold text-white mb-6">✅ TOUT INCLUS :</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, idx) => {
                const emojiMatch = feature.match(/^([^\s]+)/);
                const emoji = emojiMatch ? emojiMatch[1] : "";
                const text = feature.replace(/^[^\s]+\s+/, "");
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <BadgeIconDisplay icon={emoji} size={20} className="flex-shrink-0" />
                    <span className="text-white/80 text-sm">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 mb-8">
            <div className="text-center text-white/70 text-sm mb-6">
              💳 Sans engagement • Annulable à tout moment
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-4">
            <Link
              href="#contact"
              className="block w-full group relative px-8 py-4 rounded-xl bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-bold text-lg shadow-[0_0_30px_rgba(0,204,153,0.5)] hover:shadow-[0_0_40px_rgba(0,204,153,0.7)] transition-all duration-300 hover:scale-105 text-center"
            >
              <span className="flex items-center justify-center gap-2">
                <BadgeIconDisplay icon="🎯" size={20} className="flex-shrink-0" />
                <span>Essai gratuit 30 jours - Sans CB</span>
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
              📞 Demander une démo personnalisée
            </Link>
          </div>

          {/* Mentions importantes */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center text-sm text-white/60">
              <div>🎁 30 jours gratuits pour tester sans risque</div>
              <div>✅ Installation en 5 minutes chrono</div>
              <div>📈 Tableau de bord analytics complet</div>
              <div>♾️ Nombre de membres illimité</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


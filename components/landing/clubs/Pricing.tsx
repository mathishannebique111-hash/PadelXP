"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Infinity as InfinityIcon, Shield, CheckCircle2 } from "lucide-react";
import ClubsContactModal from "@/components/landing/clubs/ClubsContactModal";

const FEATURES = [
  "Classement automatique temps réel",
  "Challenges illimités (lancement en 3 clics)",
  "Système de badges & gamification",
  "Feed social interactif du club",
  "Challenges mensuels automatiques",
  "Page club publique personnalisée",
  "Profils joueurs avec stats complètes",
  "Relances automatiques",
  "Dashboard gérant pour suivre activité",
  "Logo + couleurs personnalisables",
  "Configuration personnalisée incluse",
  "Support client par mail",
];

const HIGHLIGHTS = [
  { icon: Zap,           label: "En 5 minutes",       sub: "Votre club opérationnel dès le premier jour" },
  { icon: InfinityIcon,  label: "Joueurs illimités",   sub: "Aucune limite, même avec 300+ joueurs" },
  { icon: Shield,        label: "Sans engagement",     sub: "Annulez à tout moment, sans pénalité" },
];

export default function Pricing() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <section id="pricing" className="relative py-24 bg-black">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/6" />
      <ClubsContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      <div className="max-w-5xl mx-auto px-4 md:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7DC828] mb-3">Tarifs</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5">
            Prêt à transformer votre club ?
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Un abonnement simple. Toutes les fonctionnalités incluses. Aucune surprise.
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-white/3 overflow-hidden"
        >
          {/* Top band */}
          <div className="h-1 bg-[#7DC828]" />

          <div className="p-8 md:p-12">
            {/* Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {HIGHLIGHTS.map(({ icon: Icon, label, sub }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white/4 border border-white/6"
                >
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-[#7DC828]/10 border border-[#7DC828]/20 flex items-center justify-center mt-0.5">
                    <Icon className="w-4 h-4 text-[#7DC828]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mb-10">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-[#7DC828] text-black font-bold text-lg hover:bg-[#6ab422] transition-colors duration-150"
              >
                Nous contacter
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>→</motion.span>
              </motion.button>
              <p className="text-white/30 text-xs mt-3">Réponse sous 24 h ouvrées</p>
            </div>

            {/* Features grid */}
            <div className="border-t border-white/8 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30 mb-5 text-center">Tout est inclus</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.04 }}
                    className="flex items-center gap-2.5 text-sm text-white/55"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#7DC828] shrink-0" />
                    {f}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

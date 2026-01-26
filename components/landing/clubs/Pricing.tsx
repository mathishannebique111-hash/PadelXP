"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";
import { Zap, Infinity as InfinityIcon, Shield, CheckCircle2 } from "lucide-react";
import ClubsContactModal from "@/components/landing/clubs/ClubsContactModal";

export default function Pricing() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const features = [
    "🏆 Classement automatique temps réel",
    "🎯 Challenges illimités (lancement en 3 clics)",
    "🎮 Système de badges & gamification",
    "📢 Feed social interactif du club",
    "🎪 Challenges mensuels automatiques",
    "📱 Page club publique personnalisée",
    "👥 Profils joueurs avec stats complètes",
    "🔔 Relances automatiques",
    "📊 Dashboard gérant pour suivre activité",
    "🎨 Logo + couleurs personnalisables",
    "🛠️ Configuration personnalisée incluse",
    "📧 Support client par mail"
  ];

  return (
    <section id="pricing" className="relative py-24 bg-black overflow-hidden">
      <ClubsContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00CC99] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            Prêt à transformer votre club <br />
            <span className="bg-gradient-to-r from-[#0066FF] via-[#00CC99] to-[#BFFF00] bg-clip-text text-transparent">
              dès aujourd'hui ?
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Rejoignez les clubs qui ont déjà fait le choix de l'excellence.
            <span className="text-white font-semibold"> Contactez-nous pour en savoir plus</span>.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gradient-to-br from-[#0066FF]/20 via-[#00CC99]/15 to-[#0066FF]/20 rounded-2xl p-8 md:p-12 border-2 border-[#0066FF]/40 shadow-2xl relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-shine-challenge">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent challenge-shine-gradient" />
            </div>
          </div>

          <div className="relative z-10">
            {/* Principaux avantages en avant */}
            <div className="text-center mb-10">


              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="mb-3 flex justify-center">
                    <Zap className="w-8 h-8 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">En 5 minutes</h3>
                  <p className="text-white/70 text-sm">Votre club est opérationnel en quelques clics</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="mb-3 flex justify-center">
                    <InfinityIcon className="w-8 h-8 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Joueurs illimités</h3>
                  <p className="text-white/70 text-sm">Aucune limite, même avec 300+ joueurs</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="mb-3 flex justify-center">
                    <Shield className="w-8 h-8 text-[#BFFF00]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Sans engagement</h3>
                  <p className="text-white/70 text-sm">Annulez à tout moment, sans pénalité</p>
                </div>
              </div>
            </div>

            {/* CTA Principal */}
            <div className="text-center mb-8">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="inline-block group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-extrabold text-xl md:text-2xl shadow-[0_0_40px_rgba(0,204,153,0.6)] hover:shadow-[0_0_60px_rgba(0,204,153,0.8)] transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center justify-center gap-3">
                  <span>Nous contacter</span>
                  <motion.span
                    className="inline-block text-2xl"
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#BFFF00] to-[#00CC99] opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
              </button>
              <p className="text-white/60 text-sm mt-4">
                Réponse sous 24h ouvrées
              </p>
            </div>

            {/* Points de conversion supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-white/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#BFFF00] mt-1 flex-shrink-0" />
                <div>
                  <div className="text-white font-semibold mb-1">100% fonctionnel dès le jour 1</div>
                  <div className="text-white/70 text-sm">Tous vos joueurs peuvent commencer à jouer et progresser immédiatement</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#BFFF00] mt-1 flex-shrink-0" />
                <div>
                  <div className="text-white font-semibold mb-1">Mises à jour régulières</div>
                  <div className="text-white/70 text-sm">Nouvelles fonctionnalités ajoutées régulièrement pour améliorer l'expérience de vos joueurs</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#BFFF00] mt-1 flex-shrink-0" />
                <div>
                  <div className="text-white font-semibold mb-1">Support réactif</div>
                  <div className="text-white/70 text-sm">Équipe dédiée pour vous accompagner à chaque étape</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#BFFF00] mt-1 flex-shrink-0" />
                <div>
                  <div className="text-white font-semibold mb-1">Gain de temps pour l'équipe</div>
                  <div className="text-white/70 text-sm">Moins d'administratif, plus de temps pour vos joueurs et l'animation du club</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


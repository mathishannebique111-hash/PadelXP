"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";

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
    <section id="pricing" className="relative py-24 bg-black overflow-hidden">
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
            Prêt à transformer votre club{" "}
            <span className="bg-gradient-to-r from-[#0066FF] via-[#00CC99] to-[#BFFF00] bg-clip-text text-transparent">
              dès aujourd'hui ?
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Rejoignez les clubs qui ont déjà fait le choix de l'excellence. 
            <span className="text-white font-semibold"> Commencez votre essai gratuit maintenant</span>, sans carte bancaire.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gradient-to-br from-[#0066FF]/20 via-[#00CC99]/15 to-[#0066FF]/20 rounded-3xl p-8 md:p-12 border-2 border-[#0066FF]/40 shadow-2xl relative overflow-hidden"
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
              <div className="inline-flex items-center gap-2 bg-[#00CC99]/20 border border-[#00CC99]/40 rounded-full px-6 py-3 mb-6">
                <Image src="/images/Cadeau accueil club.png" alt="Cadeau" width={24} height={24} className="flex-shrink-0" unoptimized />
                <span className="text-lg font-bold text-white">Essai gratuit 30 jours - Sans carte bancaire</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="mb-3 flex justify-center">
                    <Image src="/images/éclair page avis.png" alt="Éclair" width={32} height={32} className="flex-shrink-0" unoptimized />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">En 5 minutes</h3>
                  <p className="text-white/70 text-sm">Votre club est opérationnel en quelques clics</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="mb-3 flex justify-center">
                    <Image src="/images/Illimité.png" alt="Illimité" width={32} height={32} className="flex-shrink-0" unoptimized />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Membres illimités</h3>
                  <p className="text-white/70 text-sm">Aucune limite, même avec 300+ membres</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="mb-3 flex justify-center">
                    <Image src="/images/bouclier.png" alt="Bouclier" width={32} height={32} className="flex-shrink-0" unoptimized />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Sans engagement</h3>
                  <p className="text-white/70 text-sm">Annulez à tout moment, sans pénalité</p>
                </div>
              </div>
            </div>

            {/* CTA Principal */}
            <div className="text-center mb-8">
              <Link
                href="/clubs/signup"
                className="inline-block group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-extrabold text-xl md:text-2xl shadow-[0_0_40px_rgba(0,204,153,0.6)] hover:shadow-[0_0_60px_rgba(0,204,153,0.8)] transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center justify-center gap-3">
                  <span>Commencer mon essai gratuit maintenant</span>
                  <motion.span
                    className="inline-block text-2xl"
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#BFFF00] to-[#00CC99] opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
              </Link>
              <p className="text-white/60 text-sm mt-4">
                Aucune carte bancaire requise • Activation immédiate • Support inclus
              </p>
            </div>

            {/* Points de conversion supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-white/20">
              <div className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <div className="text-white font-semibold mb-1">100% fonctionnel dès le jour 1</div>
                  <div className="text-white/70 text-sm">Tous vos membres peuvent commencer à jouer et progresser immédiatement</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <div className="text-white font-semibold mb-1">Mises à jour régulières</div>
                  <div className="text-white/70 text-sm">Nouvelles fonctionnalités ajoutées régulièrement pour améliorer l'expérience de vos membres</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <div className="text-white font-semibold mb-1">Support réactif</div>
                  <div className="text-white/70 text-sm">Équipe dédiée pour vous accompagner à chaque étape</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <div className="text-white font-semibold mb-1">Résultats mesurables</div>
                  <div className="text-white/70 text-sm">Dashboard complet pour suivre l'engagement et la progression</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


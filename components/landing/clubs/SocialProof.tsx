"use client";

import { motion } from "framer-motion";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import Image from "next/image";

export default function SocialProof() {
  const testimonials = [
    {
      rating: 5,
      quote: "Nos membres sont 3x plus engagés depuis qu'on utilise Padel XP. Le classement crée une vraie émulation et tout le monde suit sa progression en temps réel !",
      author: "Marc D.",
      role: "Gérant Padel Center Toulouse",
      metric: "+67% d'activité en 3 mois"
    },
    {
      rating: 5,
      quote: "Gestion du club ultra simple. Plus de tableaux Excel, plus de relances. Les rappels automatiques et le classement motivent les joueurs !",
      author: "Sophie L.",
      role: "Responsable Padel Club Lyon",
      metric: "⏱️ 6h de gestion → 5 minutes"
    },
    {
      rating: 5,
      quote: "Le feed social a créé une vraie communauté. Les membres se challengent, commentent, likes... L'ambiance au club est complètement différente.",
      author: "Thomas B.",
      role: "Gérant Padel Club Marseille",
      metric: "🎮 Engagement membres +92%"
    }
  ];

  const stats = [
    { number: "12", label: "CLUBS / COMPLEXES" },
    { number: "2 500+", label: "JOUEURS" },
    { number: "+45%", label: "MATCHS JOUÉS" }
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4 flex items-center gap-2">
            <BadgeIconDisplay icon="💬" size={48} className="flex-shrink-0" />
            <span>CE QU'ILS DISENT DE</span>
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              PADEL PRO
            </span>
          </h2>
        </motion.div>

        {/* Témoignages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              {/* Étoiles */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Image
                    key={n}
                    src="/images/Étoile points challenges.png"
                    alt="Étoile"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                ))}
              </div>

              {/* Citation */}
              <p className="text-white/90 leading-relaxed mb-6 text-sm">
                "{testimonial.quote}"
              </p>

              {/* Auteur */}
              <div className="pt-4 border-t border-gray-700">
                <div className="font-semibold text-white mb-1">
                  — {testimonial.author}
                </div>
                <div className="text-sm text-white/60 mb-2">
                  {testimonial.role}
                </div>
                <div className="text-sm font-semibold text-[#00CC99]">
                  📊 {testimonial.metric}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chiffres clés */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-[#0066FF]/20 to-[#0052CC]/20 rounded-2xl p-8 border-2 border-[#0066FF]/30 text-center"
            >
              <div className="text-5xl md:text-6xl font-extrabold text-white mb-3">
                {stat.number}
              </div>
              <div className="text-white/80 font-semibold text-sm uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}


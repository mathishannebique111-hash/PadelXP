"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import TierBadge from "@/components/TierBadge";
import Image from "next/image";
import { logger } from '@/lib/logger';
import { Check } from "lucide-react";
import ClubsContactModal from "@/components/landing/clubs/ClubsContactModal";

export default function ClubsHeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [stats, setStats] = useState({ totalPlayers: 0, clubs: 0, rating: 4.9 });

  useEffect(() => {
    setIsVisible(true);

    // Récupérer les vraies stats
    async function fetchStats() {
      try {
        const supabase = createClientComponentClient();

        // Compter les joueurs uniques (users + guests)
        const { count: userCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });

        const { count: guestCount } = await supabase
          .from("guest_players")
          .select("id", { count: "exact", head: true });

        const totalPlayers = (userCount || 0) + (guestCount || 0);

        // Calculer la note moyenne des avis
        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating");

        let avgRating = 4.9;
        if (reviews && reviews.length > 0) {
          const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
          avgRating = Math.round((sum / reviews.length) * 10) / 10;
        }

        // Estimation du nombre de clubs (pour l'instant, on peut utiliser une estimation basée sur les joueurs)
        // Plus tard, on pourra ajouter une vraie table clubs
        const estimatedClubs = Math.max(1, Math.floor(totalPlayers / 200)); // Estimation : 1 club pour 200 joueurs

        setStats({
          totalPlayers,
          clubs: estimatedClubs,
          rating: avgRating
        });
      } catch (error) {
        logger.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <ClubsContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.1),transparent)] z-0" />

      {/* Pattern animé */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Navbar transparente */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-24 w-24 md:h-28 md:w-28 object-contain" />
          </Link>
          <Link
            href="/clubs/login"
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(0,102,255,0.5)] transition-all"
          >
            Connexion club / complexe
          </Link>
        </div>
      </nav>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-24 md:pt-32 pb-12 md:pb-16 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 md:space-y-8 text-center"
        >
          {/* Headline principal */}
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-white leading-tight">
            <span className="block mb-2">Transformez votre club de padel en</span>
            <span className="bg-gradient-to-r from-[#0066FF] via-[#00CC99] to-[#BFFF00] bg-clip-text text-transparent animate-gradient block">
              communauté d'élite
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-6xl mx-auto">
            Augmentez votre rétention de 20% en transformant l'expérience de vos joueurs.
          </p>

          {/* 5 bénéfices clés */}
          <div className="space-y-6 pt-6 md:pt-8 max-w-4xl mx-auto text-left">
            <p className="text-lg md:text-xl text-white/60 font-medium text-center mb-6 md:mb-8">
              Voici ce que vous offrez à vos joueurs en rejoignant l'aventure PadelXP :
            </p>
            <div className="grid gap-3 md:gap-4">
              {[
                "Suggestions personnalisées de partenaires et de matchs selon leur niveau et leur profil",
                "Historique de tous leurs matchs joués dans votre club",
                "Statistiques et classement interne au club mis à jour selon leurs victoires et leurs défaites",
                "Créez vos challenges tout au long de l'année pour animer votre club et permettre aux joueurs de gagner des points, badges et autres récompenses",
                "Badges à débloquer grâce aux challenges et aux matchs joués (séries de victoires, nombre de matchs joués...)"
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="group flex items-start md:items-center gap-4 md:gap-6 p-3 md:p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#BFFF00]/50 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full bg-[#BFFF00]/10 border border-[#BFFF00]/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#BFFF00]/20 transition-all duration-300">
                    <Check className="h-5 w-5 md:h-6 md:w-6 text-[#BFFF00]" strokeWidth={3} />
                  </div>
                  <span className="text-white/90 text-lg md:text-xl font-medium leading-relaxed">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA principal */}
          <div className="pt-6 flex justify-center">
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="inline-block group relative px-8 py-4 rounded-xl bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-bold text-lg shadow-[0_0_30px_rgba(0,204,153,0.5)] hover:shadow-[0_0_40px_rgba(0,204,153,0.7)] transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Nous contacter
                <motion.span
                  className="inline-block"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#BFFF00] to-[#00CC99] opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
            </button>
          </div>
        </motion.div>

        {/* Flèche de scroll - Positionnée à la place de la bande de confiance */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? [0, 8, 0] : -10 }}
          transition={{ duration: 1.5, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
          className="mt-16 text-center cursor-pointer group"
          onClick={() => {
            const nextSection = document.getElementById('problem-solution');
            nextSection?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors">
            <span className="text-sm font-semibold uppercase tracking-wider">Découvrir</span>
            <motion.svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-lg"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
          </div>
        </motion.div>
      </div>
      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </section >
  );
}


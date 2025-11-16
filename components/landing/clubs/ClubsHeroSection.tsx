"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ClubsHeroSection() {
  const [isVisible, setIsVisible] = useState(false);
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
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
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
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Pour les joueurs
            </Link>
            <Link
              href="/clubs/login"
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-sm font-semibold text-white hover:shadow-[0_0_20px_rgba(0,102,255,0.5)] transition-all"
            >
              Connexion club / complexe
            </Link>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-32 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Bloc gauche (60%) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -30 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-3 space-y-8"
          >
            {/* Emoji */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: isVisible ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
              className="text-6xl mb-4"
            >
              🏟️
            </motion.div>

            {/* Headline principal */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
              Transformez votre club / complexe en{" "}
              <span className="bg-gradient-to-r from-[#0066FF] via-[#00CC99] to-[#BFFF00] bg-clip-text text-transparent animate-gradient">
                communauté digitale d'élite
              </span>
            </h1>

            {/* Sous-titre */}
            <p className="text-xl md:text-2xl text-white/80 leading-relaxed">
              La plateforme exclusive qui transforme l'expérience de vos clients : classements automatiques et défis & récompenses.
            </p>
            <p className="text-lg text-white/60">
              Rejoignez les clubs / complexes partenaires qui révolutionnent l'expérience de leurs membres
            </p>

            {/* 3 bénéfices clés */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">✅</span>
                <div className="flex-1">
                  <span className="font-semibold text-white">Classement automatique :</span>
                  <span className="text-white/80"> Vos membres suivent leur progression en temps réel</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">✅</span>
                <div className="flex-1">
                  <span className="font-semibold text-white">Défis en 3 clics :</span>
                  <span className="text-white/80"> Lancez des animations sans tableurs ni relances</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">✅</span>
                <div className="flex-1">
                  <span className="font-semibold text-white">Communauté engagée :</span>
                  <span className="text-white/80"> Badges, challenges et feed social qui créent du lien</span>
                </div>
              </div>
            </div>

            {/* CTA principal */}
            <div className="pt-6">
              <div className="flex flex-col items-start">
                <Link
                  href="/signup"
                  className="inline-block group relative px-8 py-4 rounded-xl bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-bold text-lg shadow-[0_0_30px_rgba(0,204,153,0.5)] hover:shadow-[0_0_40px_rgba(0,204,153,0.7)] transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    Démarrer l'essai gratuit 30 jours
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
                <p className="text-sm text-white/60 mt-3 text-left pl-6">
                  Sans CB • Opérationnel en 5 min • Support dédié
                </p>
              </div>
            </div>
          </motion.div>

          {/* Bloc droit (40%) - Mockups */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Mockup classement */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <div className="text-sm font-semibold text-white/80 mb-4">🏆 CLASSEMENT - CLUB PADEL TOULOUSE</div>
              <div className="space-y-3">
                {[
                  { rank: 1, name: "Marc L.", points: 156, record: "12V-2D", trend: "↗️", medal: "🥇" },
                  { rank: 2, name: "Sophie D.", points: 148, record: "11V-3D", trend: "↗️", medal: "🥈" },
                  { rank: 3, name: "Thomas R.", points: 142, record: "10V-2D", trend: "→", medal: "🥉" },
                  { rank: 4, name: "Julie M.", points: 128, record: "9V-4D", trend: "↘️", medal: "📍" },
                  { rank: 5, name: "Alex K.", points: 124, record: "9V-5D", trend: "↗️", medal: "📍" },
                ].map((player) => (
                  <div key={player.rank} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{player.medal}</span>
                      <div>
                        <div className="font-semibold text-white text-sm">{player.name}</div>
                        <div className="text-xs text-white/60">{player.record}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{player.points} pts</span>
                      <span className="text-lg">{player.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup feed social */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <div className="text-sm font-semibold text-white/80 mb-4">📢 ACTUALITÉS DU CLUB</div>
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs text-white/60 mb-2">Il y a 5 min</div>
                  <div className="text-sm text-white">
                    🏆 Marc L. a remporté son match contre Sophie D. (6-4, 7-5) et prend la 1ère place ! 🥇
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                    <span>💬 3</span>
                    <span>❤️ 12</span>
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs text-white/60 mb-2">Il y a 23 min</div>
                  <div className="text-sm text-white">
                    🔥 Thomas R. a débloqué le badge "Hot Streak" ! 5 victoires consécutives 💪
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                    <span>💬 5</span>
                    <span>❤️ 18</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

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
    </section>
  );
}


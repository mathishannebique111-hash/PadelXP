"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";

export default function ClubsPromo() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-[#0066FF]/20 to-[#00CC99]/20 rounded-3xl p-8 md:p-12 border-2 border-[#0066FF]/30"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                VOUS GÉREZ UN CLUB DE PADEL ?
              </h2>
              <div className="mb-8">
                <div className="flex items-center gap-3 text-white/80 text-lg">
                  <span>✅</span>
                  <span>Essai gratuit 30 jours sans CB</span>
                </div>
              </div>
              <Link
                href="/clubs"
                className="inline-block group relative px-8 py-4 rounded-xl bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-bold text-lg shadow-[0_0_30px_rgba(0,204,153,0.5)] hover:shadow-[0_0_40px_rgba(0,204,153,0.7)] transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  Découvrir Padel Club Pro
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
            </div>
            
            <div className="hidden md:block">
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-gray-700 flex flex-col items-start">
                  <div className="mb-3 min-h-[32px]">
                    <Image 
                      src="/images/Trophée page badges.png" 
                      alt="Trophée" 
                      width={32} 
                      height={32} 
                      className="flex-shrink-0"
                      unoptimized
                    />
                  </div>
                  <div className="text-white font-semibold text-sm">Classement automatique</div>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-gray-700 flex flex-col items-start">
                  <div className="mb-3 min-h-[32px]">
                    <BadgeIconDisplay icon="🎯" size={24} className="flex-shrink-0" />
                  </div>
                  <div className="text-white font-semibold text-sm">Création de challenges en 3 clics</div>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-gray-700 flex flex-col items-start">
                  <div className="mb-3 min-h-[32px]">
                    <Image 
                      src="/images/Manette landing page.png" 
                      alt="Manette" 
                      width={32} 
                      height={32} 
                      className="flex-shrink-0"
                      unoptimized
                    />
                  </div>
                  <div className="text-white font-semibold text-sm">Gamification</div>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-gray-700 flex flex-col items-start">
                  <div className="mb-3 min-h-[32px]">
                    <Image 
                      src="/images/Page publique du club.png" 
                      alt="Page club publique" 
                      width={32} 
                      height={32} 
                      className="flex-shrink-0"
                      unoptimized
                    />
                  </div>
                  <div className="text-white font-semibold text-sm">Page club publique</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}



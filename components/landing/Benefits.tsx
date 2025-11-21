"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const benefits = [
  "Suivi automatique de tes stats",
  "Classement mis à jour en temps réel",
  "Badges de récompense exclusifs",
  "Historique complet de tes matchs",
  "Participe à des challenges excitants",
  "Communauté de passionnés",
];

export default function Benefits() {
  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-b from-black via-[#0a0a1a] to-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 sm:mb-4 px-2">
            Ce que tu{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent block sm:inline">
              obtiens
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {benefits.map((benefit, idx) => (
            <BenefitItem key={idx} benefit={benefit} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitItem({ benefit, index }: { benefit: string; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 md:p-6 bg-black/50 border border-white/10 rounded-lg sm:rounded-xl hover:border-[#BFFF00]/50 transition-all"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : { scale: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
        className="flex-shrink-0"
      >
        <motion.svg
          width="20"
          height="20"
          className="sm:w-6 sm:h-6"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[#BFFF00]"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
        >
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
          />
          <motion.path
            d="M8 12l2 2 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 + 0.4 }}
          />
        </motion.svg>
      </motion.div>
      <p className="text-white text-sm sm:text-base md:text-lg">{benefit}</p>
    </motion.div>
  );
}


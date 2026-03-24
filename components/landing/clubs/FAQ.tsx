"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const FAQS = [
  {
    q: "Comment mes joueurs rejoignent-ils le club sur l'app ?",
    a: "Vous recevez un code d'invitation unique (ex : TOULOUSE31000) à partager. Vos joueurs s'inscrivent sur le site, entrent ce code, et c'est tout. Vous pouvez aussi envoyer un lien direct par email.",
  },
  {
    q: "Mes joueurs doivent-ils payer quelque chose ?",
    a: "Non, l'inscription est 100 % gratuite pour tous vos joueurs. Seul le club paie un abonnement mensuel.",
  },
  {
    q: "L'installation est-elle compliquée ?",
    a: "5 minutes suffisent : créez votre profil club, ajoutez votre logo et vos photos, puis partagez le code à vos joueurs.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui, sans engagement. Vous annulez quand vous voulez, sans pénalité. Vous conservez l'accès jusqu'à la fin du mois en cours.",
  },
  {
    q: "Combien de joueurs peuvent utiliser la plateforme ?",
    a: "Illimité. Que vous ayez 30 ou 300 joueurs, le prix reste identique.",
  },
  {
    q: "Les données de mes joueurs sont-elles sécurisées ?",
    a: "Oui. Hébergement sécurisé en Europe (RGPD), chiffrement des données, sauvegardes quotidiennes.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 bg-black">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/6" />

      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7DC828] mb-3">FAQ</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            Questions fréquentes
          </h2>
        </motion.div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className={`rounded-2xl border overflow-hidden transition-colors duration-200 ${
                  isOpen ? "border-[#7DC828]/30 bg-white/4" : "border-white/6 bg-white/2 hover:bg-white/4"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className={`font-medium text-sm md:text-base transition-colors ${isOpen ? "text-white" : "text-white/70"}`}>
                    {faq.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`text-lg shrink-0 transition-colors ${isOpen ? "text-[#7DC828]" : "text-white/30"}`}
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 border-t border-white/6">
                        <p className="text-white/50 text-sm leading-relaxed pt-4">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

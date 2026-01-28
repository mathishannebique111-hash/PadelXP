"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "Comment mes joueurs rejoignent-ils le club / complexe sur l'app ?",
      answer: "Vous recevez un code d'invitation unique (ex: TOULOUSE31000) que vous partagez à vos joueurs. Ils s'inscrivent sur le site, entrent ce code, et c'est tout ! Vous pouvez aussi leur envoyer un lien d'invitation par email pour qu'ils accédent à la page d'inscription directement."
    },
    {
      question: "Mes joueurs doivent-ils payer quelque chose ?",
      answer: "Non, l'inscription est 100% gratuite pour tous vos joueurs. Seul le club / complexe paie un abonnement par mois."
    },
    {
      question: "L'installation est-elle compliquée ?",
      answer: "Pas du tout ! 5 minutes suffisent : créez votre profil club / complexe, ajoutez logo/photos, et partagez le code à vos joueurs."
    },

    {
      question: "Puis-je annuler à tout moment ?",
      answer: "Oui, aucun engagement. Vous annulez quand vous voulez, sans pénalité. Vous gardez l'accès jusqu'à la fin du mois payé."
    },
    {
      question: "Combien de joueurs peuvent utiliser la plateforme ?",
      answer: "Illimité ! Que vous ayez 30 ou 300 joueurs, le prix reste le même."
    },
    {
      question: "Les données de mes joueurs sont-elles sécurisées ?",
      answer: "Oui, hébergement sécurisé en Europe (RGPD), chiffrement des données, sauvegardes quotidiennes."
    }
  ];

  return (
    <section className="relative py-12 md:py-24 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-3xl md:text-6xl font-extrabold text-white mb-4">
            FAQ - Lever les{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              Objections
            </span>
          </h2>
        </motion.div>

        <div className="space-y-3 md:space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-4 py-4 md:px-6 md:py-5 text-left flex items-start md:items-center justify-between hover:bg-white/5 transition-colors gap-3"
              >
                <span className="font-semibold text-white text-base md:text-lg">
                  Q : {faq.question}
                </span>
                <motion.span
                  animate={{ rotate: openIndex === idx ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-white/60 text-lg md:text-xl flex-shrink-0 mt-0.5 md:mt-0"
                >
                  ▼
                </motion.span>
              </button>

              {openIndex === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-700">
                    <p className="text-white/80 leading-relaxed text-sm md:text-base">
                      R : {faq.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


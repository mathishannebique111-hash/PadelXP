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
      question: "Comment mes membres rejoignent-ils le club / complexe sur l'app ?",
      answer: "Vous recevez un code d'invitation unique (ex: TOULOUSE31000) que vous partagez à vos membres. Ils s'inscrivent sur le site, entrent ce code, et c'est tout ! Vous pouvez aussi leur envoyer un lien d'invitation par email pour qu'ils accédent à la page d'inscription directement."
    },
    {
      question: "Mes membres doivent-ils payer quelque chose ?",
      answer: "Non, l'inscription est 100% gratuite pour tous vos membres. Seul le club / complexe paie un abonnement par mois."
    },
    {
      question: "L'installation est-elle compliquée ?",
      answer: "Pas du tout ! 5 minutes suffisent : créez votre profil club / complexe, ajoutez logo/photos, et partagez le code à vos membres."
    },
    {
      question: "Que se passe-t-il après l'essai de 30 jours ?",
      answer: "Si vous êtes satisfait, vous pouvez activer votre abonnement. Sinon, votre essai prendra fin et aucun prélèvement ne sera effectué."
    },
    {
      question: "Puis-je annuler à tout moment ?",
      answer: "Oui, aucun engagement. Vous annulez quand vous voulez, sans pénalité. Vous gardez l'accès jusqu'à la fin du mois payé."
    },
    {
      question: "Combien de membres peuvent utiliser la plateforme ?",
      answer: "Illimité ! Que vous ayez 30 ou 300 membres, le prix reste le même."
    },
    {
      question: "Les données de mes membres sont-elles sécurisées ?",
      answer: "Oui, hébergement sécurisé en Europe (RGPD), chiffrement des données, sauvegardes quotidiennes."
    }
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-4xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            FAQ - Lever les{" "}
            <span className="bg-gradient-to-r from-[#0066FF] to-[#BFFF00] bg-clip-text text-transparent">
              Objections
            </span>
          </h2>
        </motion.div>

        <div className="space-y-4">
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
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold text-white text-lg pr-4">
                  Q : {faq.question}
                </span>
                <motion.span
                  animate={{ rotate: openIndex === idx ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-white/60 text-xl flex-shrink-0"
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
                  <div className="px-6 py-4 border-t border-gray-700">
                    <p className="text-white/80 leading-relaxed">
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


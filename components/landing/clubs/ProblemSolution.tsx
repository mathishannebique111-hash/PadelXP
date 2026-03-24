"use client";

import { motion } from "framer-motion";
import { TrendingDown, EyeOff, UserMinus, ZapOff, Trophy, Target, Gamepad2, CheckCircle2 } from "lucide-react";
import ScrollStack, { ScrollStackItem } from "@/components/landing/ScrollStack";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    index: "01",
    icon: TrendingDown,
    title: "Membres déconnectés",
    desc: "Vos joueurs jouent, repartent, et aucun lien communautaire ne se crée. Votre club reste un simple prestataire de courts — pas une communauté.",
    stat: null,
    statLabel: null,
    accent: "#ef4444",
  },
  {
    index: "02",
    icon: EyeOff,
    title: "Aucune visibilité sur la progression",
    desc: "Impossible pour un joueur de suivre son niveau réel. Les niveaux sont flous, subjectifs, et personne ne sait vraiment où il en est.",
    stat: null,
    statLabel: null,
    accent: "#ef4444",
  },
  {
    index: "03",
    icon: UserMinus,
    title: "Rétention difficile",
    desc: "En moyenne, la moitié des nouveaux membres quittent le club dans les 12 premiers mois. Faute d'engagement et de raisons de revenir.",
    stat: "50%",
    statLabel: "de churn sur 12 mois",
    accent: "#ef4444",
  },
  {
    index: "04",
    icon: ZapOff,
    title: "Pas de stimulation",
    desc: "Aucun système de récompense, aucune reconnaissance. Vos joueurs n'ont aucune raison de revenir plus que le strict minimum.",
    stat: null,
    statLabel: null,
    accent: "#ef4444",
  },
];

const SOLUTIONS = [
  {
    icon: Trophy,
    tag: "Classement",
    title: "Un classement vivant qui crée de la compétition saine",
    items: ["ELO mis à jour après chaque match", "Historique personnel détaillé", "Statistiques de progression"],
  },
  {
    icon: Target,
    tag: "Challenges",
    title: "Des challenges pour animer le club toute l'année",
    items: ["Création en quelques clics", "Récompenses automatisées", "Joueurs tous impliqués"],
  },
  {
    icon: Gamepad2,
    tag: "Gamification",
    title: "Des badges et récompenses pour fidéliser",
    items: ["Badges déblocables par action", "Suggestions de partenaires", "Profil joueur enrichi"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProblemSolution() {
  return (
    <section id="problem-solution" className="relative bg-black">

      {/* ── Problems ── */}
      <div className="pt-20 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto px-4 mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500/60 mb-3">Le problème</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            La réalité de nombreux clubs aujourd'hui
          </h2>
        </motion.div>

        {/* Stack */}
        <ScrollStack
          stackPosition="8vh"
          itemStackDistance={18}
          itemScale={0.05}
          baseScale={0.84}
          className="max-w-5xl mx-auto px-4 md:px-8"
        >
          {PROBLEMS.map(({ index, icon: Icon, title, desc, stat, statLabel }, i) => (
            <ScrollStackItem key={i} itemClassName="">
              {/* Fond bleu + effets */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #0e2566 0%, #0A1F5C 40%, #071540 100%)", borderRadius: "inherit" }} />
              {/* Ligne verte en haut */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent 0%, #7DC828 40%, #9adf3a 60%, transparent 100%)", borderRadius: "inherit" }} />
              {/* Halo vert coin bas-droit */}
              <div className="absolute bottom-0 right-0 w-80 h-80 pointer-events-none" style={{ background: "radial-gradient(circle at bottom right, rgba(125,200,40,0.14) 0%, transparent 65%)" }} />
              {/* Bordure subtile */}
              <div className="absolute inset-0 rounded-[24px] border border-white/10 pointer-events-none" />

              {/* Contenu */}
              <div className="relative z-10 flex flex-col flex-1 justify-between gap-8">

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "rgba(125,200,40,0.7)" }}>Problème</span>
                    <span className="text-5xl md:text-6xl font-black leading-none" style={{ color: "rgba(255,255,255,0.06)" }}>{index}</span>
                  </div>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(125,200,40,0.12)", border: "1px solid rgba(125,200,40,0.25)" }}
                  >
                    <Icon className="w-7 h-7" style={{ color: "#7DC828" }} />
                  </div>
                </div>

                {/* Titre + description */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl md:text-3xl lg:text-[2.2rem] font-extrabold leading-tight" style={{ color: "#ffffff" }}>
                    {title}
                  </h3>
                  <p className="text-base md:text-lg leading-relaxed" style={{ color: "rgba(200,215,255,0.65)", maxWidth: "36rem" }}>
                    {desc}
                  </p>
                </div>

                {/* Pied de carte */}
                <div className="flex items-center justify-between pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  {stat ? (
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-5xl md:text-6xl font-black leading-none" style={{ color: "#7DC828" }}>{stat}</span>
                      <span className="text-sm md:text-base font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{statLabel}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-[2px] rounded-full" style={{ background: "rgba(125,200,40,0.5)" }} />
                      <div className="w-3 h-[2px] rounded-full" style={{ background: "rgba(125,200,40,0.25)" }} />
                    </div>
                  )}
                  {/* Indicateur de progression */}
                  <div className="flex items-center gap-1.5">
                    {PROBLEMS.map((_, j) => (
                      <div
                        key={j}
                        className="rounded-full transition-all duration-300"
                        style={{
                          width: j === i ? "20px" : "6px",
                          height: "6px",
                          background: j === i ? "#7DC828" : "rgba(255,255,255,0.15)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollStackItem>
          ))}
        </ScrollStack>
      </div>

      {/* ── Solutions ── */}
      <div className="py-28">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7DC828] mb-3">La solution</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">
              Ce que PadelXP change pour votre club
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SOLUTIONS.map(({ icon: Icon, tag, title, items }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className="relative p-7 rounded-2xl border border-white/8 transition-all duration-300 group overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(10,31,92,0.25) 0%, rgba(10,10,15,0.9) 100%)" }}
              >
                {/* Top green line on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-[#7DC828]/0 group-hover:bg-[#7DC828]/50 transition-colors duration-300" />
                {/* Navy glow */}
                <div
                  className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                  style={{ background: "rgba(10,31,92,0.6)" }}
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(125,200,40,0.12)", border: "1px solid rgba(125,200,40,0.25)" }}
                    >
                      <Icon className="w-5 h-5 text-[#7DC828]" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7DC828]/70">{tag}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-5 leading-snug">{title}</h3>
                  <ul className="space-y-2.5">
                    {items.map((item, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm text-white/50">
                        <CheckCircle2 className="w-4 h-4 text-[#7DC828]/60 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

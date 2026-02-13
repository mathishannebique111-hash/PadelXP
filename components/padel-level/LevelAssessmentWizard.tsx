"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  PADEL_QUESTIONS,
  CATEGORY_INFO,
} from "@/lib/padel/levelQuestions";
import {
  calculatePadelLevel,
  type AssessmentResponses,
} from "@/lib/padel/levelCalculator";
import LevelQuestionCard from "./LevelQuestionCard";
import LevelProgressBar from "./LevelProgressBar";
import LevelResultCard from "./LevelResultCard";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface Props {
  onComplete?: (result: any) => void;
}

export default function LevelAssessmentWizard({ onComplete }: Props) {
  const supabase = createClient();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [responses, setResponses] = useState<
    Record<number, number | number[]>
  >({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Charger la progression sauvegardée au montage et après reconnexion
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // PRIORITÉ 1: Charger depuis la DB (source de vérité, persiste après déconnexion)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("questionnaire_progress")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[LevelAssessmentWizard] Erreur chargement profil:", profileError);
        }

        if (profile?.questionnaire_progress) {
          const dbProgress = typeof profile.questionnaire_progress === 'string'
            ? JSON.parse(profile.questionnaire_progress)
            : profile.questionnaire_progress;

          if (dbProgress.currentQuestion !== undefined && dbProgress.responses) {
            setCurrentQuestion(dbProgress.currentQuestion);
            setResponses(dbProgress.responses);
            if (dbProgress.currentQuestion > 0) {
              // On charge la progression mais on ne déclenche pas setHasStarted(true) auto
            }
            // Synchroniser localStorage avec la DB
            localStorage.setItem(`questionnaire_progress_${user.id}`, JSON.stringify(dbProgress));
            return; // On a trouvé dans la DB, on s'arrête là
          }
        }

        // PRIORITÉ 2: Fallback sur localStorage (si pas de données en DB)
        const savedProgress = localStorage.getItem(`questionnaire_progress_${user.id}`);
        if (savedProgress) {
          try {
            const parsed = JSON.parse(savedProgress);
            if (parsed.currentQuestion !== undefined && parsed.responses) {
              setCurrentQuestion(parsed.currentQuestion);
              setResponses(parsed.responses);
              if (parsed.currentQuestion > 0) {
                // On charge la progression mais on ne déclenche pas setHasStarted(true) auto
              }
              // Synchroniser avec la DB si on a trouvé dans localStorage
              await supabase
                .from("profiles")
                .update({ questionnaire_progress: parsed })
                .eq("id", user.id);
            }
          } catch (e) {
            console.error("[LevelAssessmentWizard] Erreur parsing localStorage:", e);
          }
        }
      } catch (error) {
        console.error("[LevelAssessmentWizard] Erreur chargement progression:", error);
      }
    };

    loadProgress();

    // Écouter les changements d'authentification pour recharger après reconnexion
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadProgress();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Sauvegarder la progression à chaque changement
  useEffect(() => {
    const saveProgress = async () => {
      if (!hasStarted || (currentQuestion === 0 && Object.keys(responses).length === 0)) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const progressData = {
          currentQuestion,
          responses,
          updatedAt: new Date().toISOString()
        };

        // Sauvegarder dans localStorage (rapide)
        try {
          localStorage.setItem(`questionnaire_progress_${user.id}`, JSON.stringify(progressData));
        } catch (e) {
          console.warn("[LevelAssessmentWizard] Erreur localStorage:", e);
        }

        // Sauvegarder dans la DB (persistant - PRIORITAIRE)
        const { error: dbError } = await supabase
          .from("profiles")
          .update({ questionnaire_progress: progressData })
          .eq("id", user.id);

        if (dbError) {
          console.error("[LevelAssessmentWizard] Erreur sauvegarde DB:", dbError);
          // Si la colonne n'existe pas encore, on continue quand même avec localStorage
        }
      } catch (error) {
        console.error("[LevelAssessmentWizard] Erreur sauvegarde progression:", error);
      }
    };

    // Délai pour éviter trop de sauvegardes
    const timeoutId = setTimeout(saveProgress, 300);
    return () => clearTimeout(timeoutId);
  }, [currentQuestion, responses, hasStarted, supabase]);

  // Masquer le logo du club et la navbar quand le questionnaire a commencé
  // Fonction pour notifier la vue native iOS/Capacitor
  const notifyNativeColor = (color: string) => {
    if (typeof window === 'undefined') return;

    // Méthode 1: WKWebView message handler (iOS Native)
    if ((window as any).webkit?.messageHandlers?.updateSafeAreaColor) {
      (window as any).webkit.messageHandlers.updateSafeAreaColor.postMessage(color);
    }

    // Méthode 2: Capacitor Custom Event
    if ((window as any).Capacitor) {
      try {
        const event = new CustomEvent('updateSafeAreaColor', { detail: { color } });
        window.dispatchEvent(event);
      } catch (e) { }
    }
  };

  useEffect(() => {
    if (hasStarted) {
      document.body.classList.add('questionnaire-open');
      document.documentElement.classList.add('questionnaire-open');
      notifyNativeColor('#020617'); // slate-950
    } else {
      document.body.classList.remove('questionnaire-open');
      document.documentElement.classList.remove('questionnaire-open');
      notifyNativeColor('#172554'); // Retour au bleu club par défaut
    }

    return () => {
      document.body.classList.remove('questionnaire-open');
      document.documentElement.classList.remove('questionnaire-open');
      // On ne remet pas le bleu ici car PlayerSafeAreaColor s'en chargera 
      // ou le composant parent reprendra le dessus
    };
  }, [hasStarted]);

  // Ne pas cacher le menu hamburger pendant le questionnaire pour mobile
  // Le menu reste visible et la barre de progression commence en dessous
  const question = PADEL_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / PADEL_QUESTIONS.length) * 100;
  const canGoNext = responses[question.id] !== undefined;
  const canGoBack = currentQuestion > 0;

  const handleAnswer = (value: number | number[]) => {
    setResponses((prev) => ({ ...prev, [question.id]: value }));
  };

  const handleNext = () => {
    if (!canGoNext) return;

    if (currentQuestion === PADEL_QUESTIONS.length - 1) {
      calculateResult();
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!canGoBack) return;
    setCurrentQuestion((prev) => prev - 1);
  };

  const calculateResult = async () => {
    const get = (id: number): number =>
      (responses[id] as number | undefined) ?? 0;

    const mappedResponses: AssessmentResponses = {
      // Technique (Questions 1-7)
      vitres: get(1), // Gestion des balles après rebond sur la vitre de fond
      coupsBase: get(2), // Régularité en fond de court
      service: get(3), // Qualité de votre service
      volee: get(4), // Niveau à la volée
      smash: get(5), // Gestion des lobs adverses
      lobs: get(6), // Qualité et fréquence de vos lobs
      coupFiable: get(7), // Quel est votre coup le plus fiable sous pression
      // Tactique (Questions 8-13)
      transitions: get(8), // Zone de confort et positionnement
      lectureJeu: get(9), // Anticipation et lecture du jeu
      communication: get(10), // Communication avec le partenaire
      tempo: get(11), // Contrôle du tempo
      strategie: get(12), // Construction des points
      ratioRisque: get(13), // Votre ratio Risque / Réussite
      // Expérience (Questions 14-18)
      passeSportif: get(14), // Quel est votre passé sportif
      frequence: get(15), // Fréquence de jeu
      tournois: get(16), // Niveau de tournoi le plus élevé joué
      resultats: get(17), // Meilleurs résultats
      classementFFT: get(18), // Votre classement FFT
      // Physique (Questions 19-20)
      endurance: get(19), // Endurance sur match long
      pression: get(20), // Gestion de la pression
      // Situations (Questions 21-22)
      doublesVitres: get(21), // Balles en double vitre
      adversaireSup: get(22), // Contre niveau supérieur
    };

    // Récupérer le profil utilisateur pour obtenir le côté préféré
    let userProfile: { preferred_side?: "left" | "right" | "indifferent" | null } | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_side")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          userProfile = {
            preferred_side: profile.preferred_side as "left" | "right" | "indifferent" | null,
          };
        }
      }
    } catch (error) {
      console.error("[LevelAssessmentWizard] Erreur récupération profil:", error);
      // Continuer sans le profil si erreur
    }

    const calculatedResult = calculatePadelLevel(mappedResponses, userProfile);
    setResult(calculatedResult);
    setIsCompleted(true);

    if (onComplete) onComplete(calculatedResult);
  };

  if (!hasStarted) {
    const hasProgress = currentQuestion > 0;

    return (
      <motion.div
        initial={{ height: "auto" }}
        animate={{ height: "auto" }}
        className="bg-white/5 rounded-2xl border border-white/80 p-4 sm:p-6 shadow-xl"
      >
        <h1 className="text-lg sm:text-xl font-bold text-white mb-2">
          Évaluer mon niveau
        </h1>
        {hasProgress ? (
          <p className="text-xs sm:text-sm text-gray-400 mb-4">
            Vous vous êtes arrêté à la question{" "}
            <span className="font-semibold text-white">
              {Math.min(currentQuestion + 1, PADEL_QUESTIONS.length)}
            </span>{" "}
            sur {PADEL_QUESTIONS.length}. Reprenez quand vous voulez.
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400 mb-4">
            22 questions rapides pour estimer précisément ton niveau de padel de
            1 à 10. Vous pouvez interrompre et reprendre plus tard.
          </p>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setHasStarted(true)}
          className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 min-h-[44px]"
        >
          {hasProgress ? "Reprendre le questionnaire" : "Commencer l'évaluation"}
          <ChevronRight size={18} />
        </motion.button>
      </motion.div>
    );
  }

  if (isCompleted && result) {
    return (
      <LevelResultCard
        result={result}
        onRetake={() => {
          setIsCompleted(false);
          setCurrentQuestion(0);
          setResponses({});
        }}
        onSaved={async () => {
          // Nettoyer la progression sauvegardée après sauvegarde du niveau
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Supprimer la progression de la DB
              await supabase
                .from("profiles")
                .update({ questionnaire_progress: null })
                .eq("id", user.id);
              // Supprimer de localStorage
              localStorage.removeItem(`questionnaire_progress_${user.id}`);
            }
          } catch (error) {
            console.error("[LevelAssessmentWizard] Erreur nettoyage progression:", error);
          }
          // Fermer le wizard après sauvegarde
          setIsCompleted(false);
          setHasStarted(false);
          setCurrentQuestion(0);
          setResponses({});
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ height: "auto", opacity: 0 }}
      animate={{ height: ["100vh", "100dvh"], opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-[100000] flex flex-col bg-slate-950 overflow-hidden touch-none"
      style={{ height: '100dvh', overscrollBehavior: 'none' }}
    >
      {/* Style global pour masquer le logo du club et la bar de nav */}
      <style jsx global>{`
        body.questionnaire-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          overscroll-behavior: none !important;
          background-color: #020617 !important;
        }
        body.questionnaire-open #__next, 
        body.questionnaire-open main,
        body.questionnaire-open .relative.min-h-screen.bg-\[\#172554\] {
          background-color: #020617 !important;
          background-image: none !important;
        }
        body.questionnaire-open [data-club-logo-container="true"],
        body.questionnaire-open [data-header-actions="true"],
        body.questionnaire-open #bottom-nav-bar,
        body.questionnaire-open #site-logo-mobile,
        body.questionnaire-open .site-header-logo {
          display: none !important;
        }
      `}</style>

      {/* Header fixe - mobile first, commence en haut de l'écran */}
      <div className="sticky z-20 px-4 pt-6 pb-2 flex-shrink-0" style={{ paddingTop: 'calc(var(--sat, 0px) + 1.5rem)' }}>

        {/* Logo spécifique au questionnaire - Forcé au dessus du bloc noir */}
        <div className="flex justify-center mb-4 relative z-[100001]">
          <div className="relative w-32 h-10">
            <Image
              src="/padelxp-logo-transparent.png"
              alt="PadelXP"
              fill
              className="object-contain"
              style={{
                filter: 'brightness(0) invert(1)' // Force le logo en blanc pour la visibilité sur fond noir sans l'effet doré
              }}
              priority
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <LevelProgressBar
            progress={progress}
            currentStep={currentQuestion + 1}
            totalSteps={PADEL_QUESTIONS.length}
          />

          <div className="mt-2.5 flex items-center justify-center gap-2">
            {(() => {
              const CategoryIcon = CATEGORY_INFO[question.category].Icon;
              return <CategoryIcon size={12} className="text-blue-400 flex-shrink-0" />;
            })()}
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-blue-500/80">
              {CATEGORY_INFO[question.category].label}
            </span>
          </div>
        </div>
      </div>

      {/* Zone pour la question - entre la barre de progression et la barre fixe du bas */}
      <div
        className="flex-1 overflow-y-auto px-4 py-1 flex items-start justify-center"
        style={{
          minHeight: 0,
        }}
      >
        <div className="w-full max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="w-full"
            >
              <LevelQuestionCard
                question={question}
                value={responses[question.id]}
                onChange={handleAnswer}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Boutons fixés en bas - mobile-first, taille augmentée pour "Suivant" */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-3 sm:px-4 py-3 flex-shrink-0 pb-10 sm:pb-12">
        <div className="flex gap-2 sm:gap-3 max-w-3xl mx-auto w-full">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            disabled={!canGoBack}
            className="px-3 py-2 rounded-lg sm:rounded-xl border border-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-w-[40px] min-h-[40px]"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline ml-2">Retour</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={!canGoNext}
            className="flex-1 py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {currentQuestion === PADEL_QUESTIONS.length - 1 ? (
              <>
                <span>Voir mon niveau</span>
                <Check size={18} />
              </>
            ) : (
              <>
                <span>Suivant</span>
                <ChevronRight size={18} />
              </>
            )}
          </motion.button>
        </div>
        <button
          type="button"
          onClick={async () => {
            // Sauvegarder la progression avant de quitter
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const progressData = {
                  currentQuestion,
                  responses,
                  updatedAt: new Date().toISOString()
                };
                localStorage.setItem(`questionnaire_progress_${user.id}`, JSON.stringify(progressData));
                await supabase
                  .from("profiles")
                  .update({ questionnaire_progress: progressData })
                  .eq("id", user.id);
              }
            } catch (error) {
              console.error("[LevelAssessmentWizard] Erreur sauvegarde avant quitter:", error);
            }
            setHasStarted(false);
          }}
          className="mt-2 w-full text-[10px] text-gray-400 underline decoration-dotted underline-offset-2 active:text-gray-200 py-1"
        >
          Poursuivre plus tard
        </button>
      </div>
    </motion.div>
  );
}


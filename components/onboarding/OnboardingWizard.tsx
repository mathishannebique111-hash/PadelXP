"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  Users,
  Flame,
  Trophy,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Hand,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Zap,
  TrendingUp,
  ArrowBigUp,
  Shield,
  ChevronLeft,
  Bell,
  MapPin,
} from "lucide-react";

import { PushNotificationsService } from "@/lib/notifications/push-notifications";
import { createClient } from "@/lib/supabase/client";

type OnboardingAnswers = {
  level: "beginner" | "leisure" | "regular" | "competition" | null;
  preferred_side: "left" | "right" | "indifferent" | null;
  hand: "right" | "left" | null;
  frequency: "monthly" | "weekly" | "2-3weekly" | "3+weekly" | null;
  best_shot: "smash" | "vibora" | "lob" | "defense" | null;
};

type QuestionId = 0 | 1 | 2 | 3 | 4;

interface Question {
  id: QuestionId;
  title: string;
  subtitle?: string;
  options: Array<{
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
  }>;
}

const questions: Question[] = [
  {
    id: 0,
    title: "Quel est votre niveau de pratique ?",
    subtitle: "Aidez-nous à mieux vous connaître",
    options: [
      {
        value: "beginner",
        label: "Je débute",
        icon: Sprout,
        description: "Premiers pas sur le terrain",
      },
      {
        value: "leisure",
        label: "Loisir",
        icon: Users,
        description: "Pour le plaisir entre amis",
      },
      {
        value: "regular",
        label: "Régulier",
        icon: Flame,
        description: "Pratique régulière",
      },
      {
        value: "competition",
        label: "Compétition",
        icon: Trophy,
        description: "Niveau compétitif",
      },
    ],
  },
  {
    id: 1,
    title: "Quel côté préférez-vous ?",
    subtitle: "Votre position favorite sur le terrain",
    options: [
      {
        value: "left",
        label: "Gauche",
        icon: ArrowLeft,
      },
      {
        value: "right",
        label: "Droite",
        icon: ArrowRight,
      },
      {
        value: "indifferent",
        label: "Indifférent",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    id: 2,
    title: "Quelle est votre main forte ?",
    subtitle: "Pour adapter nos recommandations",
    options: [
      {
        value: "right",
        label: "Droitier",
        icon: Hand,
      },
      {
        value: "left",
        label: "Gaucher",
        icon: Hand,
      },
    ],
  },
  {
    id: 3,
    title: "À quelle fréquence jouez-vous ?",
    subtitle: "Pour personnaliser votre expérience",
    options: [
      {
        value: "monthly",
        label: "1-2x par mois",
        icon: Calendar,
      },
      {
        value: "weekly",
        label: "1x / semaine",
        icon: CalendarDays,
      },
      {
        value: "2-3weekly",
        label: "2-3x / semaine",
        icon: CalendarRange,
      },
      {
        value: "3+weekly",
        label: "+ de 3x / semaine",
        icon: CalendarClock,
      },
    ],
  },
  {
    id: 4,
    title: "Quel est votre coup signature ?",
    subtitle: "Votre spécialité sur le terrain",
    options: [
      {
        value: "smash",
        label: "Smash",
        icon: Zap,
        description: "Puissance et précision",
      },
      {
        value: "vibora",
        label: "Vibora",
        icon: TrendingUp,
        description: "Effet et contrôle",
      },
      {
        value: "lob",
        label: "Lob",
        icon: ArrowBigUp,
        description: "Hauteur et placement",
      },
      {
        value: "defense",
        label: "Bajada",
        icon: Shield,
        description: "Force et équilibre",
      },
    ],
  },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState<QuestionId>(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    level: null,
    preferred_side: null,
    hand: null,
    frequency: null,
    best_shot: null,
  });

  // Nouvel état pour gérer l'affichage des étapes spéciales
  const [showIdentityStep, setShowIdentityStep] = useState(false);
  const [showPostalCodeStep, setShowPostalCodeStep] = useState(false);
  const [showNotificationsStep, setShowNotificationsStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipPostalStep, setSkipPostalStep] = useState(false);

  // Identity state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Postal code state
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [cityLoading, setCityLoading] = useState(false);

  const question = questions[currentQuestion];
  // Progress: questions → identity → postal code → notifications
  const totalSteps = questions.length + 3; // +1 identity, +1 postal code, +1 notifications
  const progress = showNotificationsStep
    ? 100
    : showPostalCodeStep
      ? ((questions.length + 2) / totalSteps) * 100
      : showIdentityStep
        ? ((questions.length + 1) / totalSteps) * 100
        : ((currentQuestion + 1) / totalSteps) * 100;

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check for existing profile status and postal code
  useState(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check profile status to prevent looping
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_completed_onboarding")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.has_completed_onboarding) {
          router.replace("/home");
          return;
        }

        // Prefill data
        if (user.user_metadata?.first_name) setFirstName(user.user_metadata.first_name);
        if (user.user_metadata?.last_name) setLastName(user.user_metadata.last_name);

        if (user.user_metadata?.postal_code) {
          setPostalCode(user.user_metadata.postal_code);
          if (user.user_metadata.city) setCity(user.user_metadata.city);
          setSkipPostalStep(true);
        }
      }
    };
    checkUser();
  });

  // Auto-fetch city from postal code via French API
  const fetchCityFromPostalCode = useCallback(async (code: string) => {
    if (code.length !== 5) { setCity(""); return; }
    setCityLoading(true);
    try {
      const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setCity(data[0].nom);
        else setCity("");
      }
    } catch { setCity(""); }
    finally { setCityLoading(false); }
  }, []);

  const getQuestionKey = (id: QuestionId): keyof OnboardingAnswers => {
    const keys: Record<QuestionId, keyof OnboardingAnswers> = {
      0: "level",
      1: "preferred_side",
      2: "hand",
      3: "frequency",
      4: "best_shot",
    };
    return keys[id];
  };

  const activePushNotifications = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await PushNotificationsService.initialize(user.id);
      }
    } catch (e) {
      console.error("Erreur activation notifications:", e);
    }
  };

  const handleAnswer = async (value: string) => {
    if (isTransitioning) return;

    const key = getQuestionKey(currentQuestion);
    setAnswers((prev) => ({
      ...prev,
      [key]: value as any,
    }));

    setIsTransitioning(true);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => (prev + 1) as QuestionId);
        setIsTransitioning(false);
      } else {
        // Fin des questions -> Etape Identité
        setShowIdentityStep(true);
        setIsTransitioning(false);
      }
    }, 400);
  };

  const handleIdentityContinue = () => {
    setShowIdentityStep(false);
    // Après identité -> Code postal (sauf si skip)
    if (skipPostalStep) {
      setShowPostalCodeStep(false);
      setShowNotificationsStep(true);
    } else {
      setShowPostalCodeStep(true);
    }
  };

  const handlePostalCodeContinue = () => {
    setShowPostalCodeStep(false);
    setShowNotificationsStep(true);
  };

  const handlePrevious = () => {
    if (showNotificationsStep) {
      setShowNotificationsStep(false);
      // Retourne au code postal seulement si on ne l'a pas sauté
      if (!skipPostalStep) {
        setShowPostalCodeStep(true);
      } else {
        setShowIdentityStep(true);
      }
      return;
    }
    if (showPostalCodeStep) {
      setShowPostalCodeStep(false);
      setShowIdentityStep(true);
      return;
    }
    if (showIdentityStep) {
      setShowIdentityStep(false);
      // Retour à la dernière question
      setCurrentQuestion((questions.length - 1) as QuestionId);
      return;
    }
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => (prev - 1) as QuestionId);
    }
  };

  // Fin du wizard : Sauvegarde + Redirection
  // Appelé soit par le bouton "Activer", soit par "Pas maintenant"
  const handleFinalize = async (enableNotifications: boolean) => {
    setIsSubmitting(true);

    if (enableNotifications) {
      await activePushNotifications();
    }

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          postal_code: postalCode.trim() || null,
          city: city.trim() || null,
          skip: false,
        }),
      });

      if (response.ok) {
        // Force a hard navigation to avoid stale cache issues (double onboarding loop)
        window.location.href = "/home";
      } else {
        const data = await response.json();
        console.error("Erreur:", data.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Erreur:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ WebkitTapHighlightColor: 'transparent' }}>

      {/* Background global assombri pour le contraste */}
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

      {/* Barre de progression (masquée sur la page notif si souhaité, mais gardons-la pour la cohérence "fin") */}
      <div className="absolute top-24 left-6 right-6 h-2 bg-white/10 z-50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Bouton Précédent (en haut à gauche) */}
      {(currentQuestion > 0 || showPostalCodeStep || showNotificationsStep) && (
        <button
          onClick={handlePrevious}
          className="absolute top-12 left-4 z-50 p-2 text-white/60 hover:text-white/90 transition-colors flex items-center gap-2"
          aria-label="Question précédente"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Précédent</span>
        </button>
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex items-center justify-center px-4 py-20 relative z-10">
        <AnimatePresence mode="wait">
          {!showPostalCodeStep && !showNotificationsStep && !showIdentityStep ? (
            /* ================= MODE QUESTION WIZARD ================= */
            <motion.div
              key={`question-container-${currentQuestion}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-8"
            >
              {/* Titre et sous-titre */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {question.title}
                </h1>
                {question.subtitle && (
                  <p className="text-sm sm:text-base text-white/70">
                    {question.subtitle}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option) => {
                  const Icon = option.icon;
                  const currentKey = getQuestionKey(currentQuestion);
                  const isSelected = answers[currentKey] === option.value;
                  const isHandLeft = currentQuestion === 2 && option.value === "left";

                  return (
                    <motion.button
                      key={`${currentQuestion}-${option.value}`}
                      onClick={() => handleAnswer(option.value)}
                      className={`w-full p-4 sm:p-5 rounded-2xl border-2 transition-all outline-none select-none ${isTransitioning ? "pointer-events-none" : ""
                        } ${isSelected
                          ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                          : "border-white/20 bg-white/5 md:hover:border-white/40 md:hover:bg-white/10"
                        }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center ${isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-white/70"
                            }`}
                        >
                          <Icon
                            className={`w-6 h-6 sm:w-7 sm:h-7 ${isHandLeft ? "rotate-180" : ""
                              }`}
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-white text-base sm:text-lg">
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="text-xs sm:text-sm text-white/60 mt-1">
                              {option.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                          >
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Bouton Enregistrer (présent pour certaines étapes si besoin, ici caché car réponse direct au clic) */}

            </motion.div>
          ) : showIdentityStep ? (
            /* ================= MODE IDENTITE ================= */
            <motion.div
              key="identity-step"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Comment vous appelez-vous ?
                </h1>
                <p className="text-sm sm:text-base text-white/70">
                  Pour que vos partenaires puissent vous reconnaître
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 ml-1 tracking-wide uppercase">Prénom</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:bg-blue-500/10 transition-all font-semibold"
                    placeholder="Thomas"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 ml-1 tracking-wide uppercase">Nom</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:bg-blue-500/10 transition-all font-semibold"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleIdentityContinue}
                  disabled={!firstName.trim() || !lastName.trim()}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, #0066FF 0%, #0055DD 100%)" }}
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          ) : showPostalCodeStep && !showNotificationsStep ? (
            /* ================= MODE CODE POSTAL ================= */
            <motion.div
              key="postal-code-step"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Où jouez-vous ?
                </h1>
                <p className="text-sm sm:text-base text-white/70">
                  Pour vous classer parmi les joueurs de votre zone
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="Code postal (ex: 75015)"
                    value={postalCode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                      setPostalCode(v);
                      fetchCityFromPostalCode(v);
                    }}
                    className="w-full rounded-2xl border-2 border-white/20 bg-white/5 pl-12 pr-4 py-4 text-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:bg-blue-500/10 transition-all text-center tracking-widest font-semibold"
                  />
                </div>

                {cityLoading && (
                  <p className="text-sm text-white/50 text-center">Recherche...</p>
                )}
                {city && !cityLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 text-blue-300"
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="font-semibold">{city}</span>
                  </motion.div>
                )}
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={handlePostalCodeContinue}
                  disabled={postalCode.length !== 5 || !city}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, #0066FF 0%, #0055DD 100%)" }}
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          ) : (
            /* ================= MODE NOTIFICATIONS PAGE (NEW) ================= */
            <motion.div
              key="notifications-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md flex flex-col items-center justify-center text-center space-y-8"
            >
              {/* Logo de l'application */}
              <div className="relative w-32 h-32 mb-4 animate-in zoom-in duration-500">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                <img
                  src="/images/Logo sans fond.png"
                  alt="PadelXP Logo"
                  className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                />
              </div>

              {/* Titre et Explications */}
              <div className="space-y-4">
                <h1 className="text-3xl font-extrabold text-white">
                  Restez connecté au jeu
                </h1>
                <p className="text-white/80 text-base leading-relaxed px-2">
                  Activez les notifications pour être alerté instantanément lorsqu'un joueur vous invite à un match ou qu'une place se libère.
                </p>
                <div className="flex flex-col gap-4 pt-4 text-sm text-white/80 text-left max-w-xs mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-blue-400" />
                    </div>
                    <span>Reçois tes <strong>invitations aux matchs</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-orange-400" />
                    </div>
                    <span>Sois <strong>défié</strong> par les autres joueurs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span>Sois informé des derniers <strong>challenges</strong> de ton club</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <span>Valide tes scores et <strong>monte au classement</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full space-y-4 pt-8">
                <button
                  onClick={() => handleFinalize(true)}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg shadow-blue-500/30 transition-transform active:scale-95 hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #0066FF 0%, #0055DD 100%)",
                  }}
                >
                  {isSubmitting ? "Activation..." : "Activer les notifications"}
                </button>

                <button
                  onClick={() => handleFinalize(false)}
                  disabled={isSubmitting}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors py-2"
                >
                  Pas maintenant
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Indicateur de progression (caché sur la page notif pour plus de propreté) */}
      {!showNotificationsStep && !showPostalCodeStep && (
        <div className="absolute bottom-12 left-0 right-0 flex justify-center">
          <div className="text-sm text-white/60">
            {currentQuestion + 1} / {questions.length}
          </div>
        </div>
      )}
    </div>
  );
}

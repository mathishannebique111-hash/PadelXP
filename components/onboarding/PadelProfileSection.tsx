"use client";

import { useState, useEffect } from "react";
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
  Edit2,
  Trash2,
  Loader2,
  X,
  User
} from "lucide-react";
import PadelProfileEditModal from "./PadelProfileEditModal";
import { createBrowserClient } from "@supabase/ssr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type OnboardingData = {
  level: "beginner" | "leisure" | "regular" | "competition" | null;
  preferred_side: "left" | "right" | "indifferent" | null;
  hand: "right" | "left" | null;
  frequency: "monthly" | "weekly" | "2-3weekly" | "3+weekly" | null;
  best_shot: "smash" | "vibora" | "lob" | "defense" | null;
};

const levelLabels: Record<string, string> = {
  beginner: "Je débute",
  leisure: "Loisir",
  regular: "Régulier",
  competition: "Compétition",
};

const sideLabels: Record<string, string> = {
  left: "Gauche",
  right: "Droite",
  indifferent: "Indifférent",
};

const handLabels: Record<string, string> = {
  right: "Droitier",
  left: "Gaucher",
};

const frequencyLabels: Record<string, string> = {
  monthly: "1x / mois",
  weekly: "1x / semaine",
  "2-3weekly": "2-3x / semaine",
  "3+weekly": "+ de 3x / semaine",
};

const shotLabels: Record<string, string> = {
  smash: "Smash",
  vibora: "Vibora",
  lob: "Lob",
  defense: "Défense",
};

const levelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  beginner: Sprout,
  leisure: Users,
  regular: Flame,
  competition: Trophy,
};

const sideIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  left: ArrowLeft,
  right: ArrowRight,
  indifferent: ArrowLeftRight,
};

const handIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  right: Hand,
  left: Hand,
};

const frequencyIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  monthly: Calendar,
  weekly: CalendarDays,
  "2-3weekly": CalendarRange,
  "3+weekly": CalendarClock,
};

const shotIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  smash: Zap,
  vibora: TrendingUp,
  lob: ArrowBigUp,
  defense: Shield,
};

interface PadelProfileSectionProps {
  userId: string;
}

export default function PadelProfileSection({
  userId,
}: PadelProfileSectionProps) {
  const [profileData, setProfileData] = useState<OnboardingData | null>(null);
  const [partnerData, setPartnerData] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadPartner();
  }, [userId]);

  const loadPartner = async () => {
    try {
      // 1. Fetch partnerships via API (bypass RLS)
      const response = await fetch('/api/partnerships/list');
      if (!response.ok) return;
      const { partnerships } = await response.json();

      // 2. Find accepted partnership
      const accepted = partnerships.find((p: any) => p.status === 'accepted');
      if (!accepted) {
        setPartnerData(null);
        return;
      }

      // 3. Identify the partner's ID (the one that is NOT the profile user)
      const partnerId = accepted.player_id === userId ? accepted.partner_id : accepted.player_id;

      // 4. Fetch partner profile via batch API
      const profileResponse = await fetch('/api/profiles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [partnerId] })
      });

      if (profileResponse.ok) {
        const { profiles } = await profileResponse.json();
        if (profiles && profiles.length > 0) {
          setPartnerData(profiles[0]);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du partenaire:", error);
    }
  };

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      // Utiliser le cache navigateur avec stale-while-revalidate pour un chargement instantané
      const response = await fetch(`/api/profile/padel?userId=${userId}`, {
        headers: {
          "Cache-Control": "max-age=30, stale-while-revalidate=120",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du profil padel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: OnboardingData) => {
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: data,
          skip: false,
        }),
      });

      if (response.ok) {
        setProfileData(data);
        setShowEditModal(false);
        // Recharger les données
        await loadProfile();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur:", error);
      throw error;
    }
  };

  const confirmDeletePartner = async () => {
    try {
      setIsDeleting(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('player_partnerships')
        .delete()
        .or(`player_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      setShowDeleteDialog(false);
      setPartnerData(null);
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la suppression du partenaire:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
        <div className="text-white/60">Chargement...</div>
      </div>
    );
  }

  if (!profileData || Object.values(profileData).every((v) => v === null)) {
    return (
      <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">
          Mon Profil Padel
        </h2>
        <p className="text-sm text-white/70 mb-4">
          Vous n&apos;avez pas encore complété votre profil padel. Complétez-le
          pour personnaliser votre expérience !
        </p>
        <a
          href="/player/onboarding"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
        >
          Compléter mon profil
        </a>
      </div>
    );
  }

  const data = profileData;
  if (!data) return null;

  const LevelIcon = data.level ? levelIcons[data.level] : null;
  const SideIcon = data.preferred_side ? sideIcons[data.preferred_side] : null;
  const HandIcon = data.hand ? handIcons[data.hand] : null;
  const FrequencyIcon = data.frequency ? frequencyIcons[data.frequency] : null;
  const ShotIcon = data.best_shot ? shotIcons[data.best_shot] : null;
  const isLeftHanded = data.hand === "left";

  return (
    <div className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 sm:p-8 md:p-10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Mon Profil Padel
          </h2>
          <p className="text-xs sm:text-sm text-white/50">
            Vos préférences et caractéristiques de jeu
          </p>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all hover:scale-105 active:scale-95"
        >
          <Edit2 className="w-4 h-4" />
          <span className="hidden sm:inline">Modifier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. Niveau */}
        {data.level && (
          <div className="rounded-xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-start gap-4">
              {LevelIcon && (
                <LevelIcon className="w-7 h-7 text-white flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                  Niveau
                </div>
                <div className="text-base font-bold text-white">
                  {levelLabels[data.level]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Partenaire Habituel (Right of Level) */}
        <div className="rounded-xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] transition-all group relative">
          <div className="flex items-start gap-4">
            <Users className="w-7 h-7 text-white flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs text-white/50 uppercase tracking-wider font-medium">
                  Partenaire Habituel
                </div>
                {partnerData && (
                  <button onClick={() => setShowDeleteDialog(true)} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {partnerData ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border border-white/10">
                    {partnerData.avatar_url ? (
                      <img src={partnerData.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                  <div className="text-base font-bold text-white truncate">
                    {partnerData.first_name} {partnerData.last_name}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">
                  Aucun partenaire
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Main forte */}
        {data.hand && (
          <div className="rounded-xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-start gap-4">
              {HandIcon && (
                <HandIcon className={`w-7 h-7 text-white flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform ${isLeftHanded ? "rotate-180" : ""}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                  Main forte
                </div>
                <div className="text-base font-bold text-white">
                  {handLabels[data.hand]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Côté préféré (Right of Hand) */}
        {data.preferred_side && (
          <div className="rounded-xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-start gap-4">
              {SideIcon && (
                <SideIcon className="w-7 h-7 text-white flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                  Côté préféré
                </div>
                <div className="text-base font-bold text-white">
                  {sideLabels[data.preferred_side]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Coup signature */}
        {data.best_shot && (
          <div className="rounded-xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-start gap-4">
              {ShotIcon && (
                <ShotIcon className="w-7 h-7 text-white flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                  Coup signature
                </div>
                <div className="text-base font-bold text-white">
                  {shotLabels[data.best_shot]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Fréquence (Right of Shot) */}
        {data.frequency && (
          <div className="rounded-xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-start gap-4">
              {FrequencyIcon && (
                <FrequencyIcon className="w-7 h-7 text-white flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                  Fréquence
                </div>
                <div className="text-base font-bold text-white">
                  {frequencyLabels[data.frequency]}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      {showEditModal && profileData && (
        <PadelProfileEditModal
          initialData={profileData}
          onSave={handleSave}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Dialog de confirmation de suppression du partenaire */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              Supprimer le partenaire ?
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2">
              Cette action supprimera {partnerData?.first_name} de vos partenaires habituels. Vous pourrez envoyer une nouvelle demande plus tard.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row gap-2 sm:gap-0 mt-4">
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 py-2 px-3 border border-white/20 text-gray-300 rounded-lg text-sm font-medium active:bg-slate-700/50 min-h-[44px]"
            >
              Annuler
            </button>
            <button
              onClick={confirmDeletePartner}
              disabled={isDeleting}
              className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={16} />
                  Supprimer
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

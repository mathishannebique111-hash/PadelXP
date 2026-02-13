"use client";

import { useState, useEffect, useRef } from "react";
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
  User,
  ChevronDown,
  Check,
  MessageCircle,
} from "lucide-react";
import PadelLoader from "@/components/ui/PadelLoader";
import { createBrowserClient } from "@supabase/ssr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/Toast";

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
  monthly: "1-2x par mois",
  weekly: "1x / semaine",
  "2-3weekly": "2-3x / semaine",
  "3+weekly": "+ de 3x / semaine",
};

const shotLabels: Record<string, string> = {
  smash: "Smash",
  vibora: "Vibora",
  lob: "Lob",
  defense: "Bajada",
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

const fieldOptions = {
  level: [
    { value: "beginner", label: levelLabels.beginner },
    { value: "leisure", label: levelLabels.leisure },
    { value: "regular", label: levelLabels.regular },
    { value: "competition", label: levelLabels.competition },
  ],
  hand: [
    { value: "right", label: handLabels.right },
    { value: "left", label: handLabels.left },
  ],
  preferred_side: [
    { value: "left", label: sideLabels.left },
    { value: "right", label: sideLabels.right },
    { value: "indifferent", label: sideLabels.indifferent },
  ],
  best_shot: [
    { value: "smash", label: shotLabels.smash },
    { value: "vibora", label: shotLabels.vibora },
    { value: "lob", label: shotLabels.lob },
    { value: "defense", label: shotLabels.defense },
  ],
  frequency: [
    { value: "monthly", label: frequencyLabels.monthly },
    { value: "weekly", label: frequencyLabels.weekly },
    { value: "2-3weekly", label: frequencyLabels["2-3weekly"] },
    { value: "3+weekly", label: frequencyLabels["3+weekly"] },
  ],
};

interface PadelProfileSectionProps {
  userId: string;
}

export default function PadelProfileSection({
  userId,
}: PadelProfileSectionProps) {
  const [profileData, setProfileData] = useState<OnboardingData | null>(null);
  const [partnerData, setPartnerData] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<OnboardingData | null>(null);
  const [openDropdown, setOpenDropdown] = useState<keyof OnboardingData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  const [isLoadingPartnerPhone, setIsLoadingPartnerPhone] = useState(false);

  useEffect(() => {
    loadProfile();
    loadPartner();

    // Écouter les événements profileUpdated pour recharger les données
    const handleProfileUpdate = () => {
      loadProfile();
      loadPartner();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [userId]);

  // Fermer les dropdowns en cliquant à l'extérieur
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let clickedInside = false;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(target)) {
          clickedInside = true;
        }
      });
      if (!clickedInside) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  const loadPartner = async () => {
    try {
      const response = await fetch('/api/partnerships/list');
      if (!response.ok) return;
      const { partnerships } = await response.json();

      const accepted = partnerships.find((p: any) => p.status === 'accepted');
      if (!accepted) {
        setPartnerData(null);
        setPartnerPhone(null);
        return;
      }

      const partnerId = accepted.player_id === userId ? accepted.partner_id : accepted.player_id;

      const profileResponse = await fetch('/api/profiles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [partnerId] })
      });

      if (profileResponse.ok) {
        const { profiles } = await profileResponse.json();
        if (profiles && profiles.length > 0) {
          setPartnerData(profiles[0]);
          await loadPartnerPhone(profiles[0].id);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du partenaire:", error);
    }
  };

  const loadPartnerPhone = async (partnerId: string) => {
    try {
      setIsLoadingPartnerPhone(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPartnerPhone(null);
        return;
      }

      const { data, error } = await supabase.rpc("get_partner_phone", {
        partner_uuid: partnerId,
      });

      if (error) {
        console.error("[PadelProfileSection] Erreur get_partner_phone", error);
        setPartnerPhone(null);
        return;
      }

      if (Array.isArray(data) && data.length > 0 && (data[0] as any).phone) {
        setPartnerPhone((data[0] as any).phone as string);
      } else {
        setPartnerPhone(null);
      }
    } catch (error) {
      console.error("[PadelProfileSection] Erreur chargement téléphone partenaire", error);
      setPartnerPhone(null);
    } finally {
      setIsLoadingPartnerPhone(false);
    }
  };


  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/profile/padel?userId=${userId}`, {
        headers: {
          "Cache-Control": "max-age=30, stale-while-revalidate=120",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setEditingData(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du profil padel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = () => {
    setEditingData(profileData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditingData(profileData);
    setIsEditing(false);
    setOpenDropdown(null);
  };

  const handleFieldChange = (field: keyof OnboardingData, value: string) => {
    if (!editingData) return;
    setEditingData({
      ...editingData,
      [field]: value as any,
    });
    setOpenDropdown(null);
  };

  const handleSave = async () => {
    if (!editingData) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: editingData,
          skip: false,
        }),
      });

      if (response.ok) {
        setProfileData(editingData);
        setIsEditing(false);
        setOpenDropdown(null);
        await loadProfile();

        // Déclencher un événement pour rafraîchir les suggestions de partenaires
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profileUpdated'));
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
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

      // Recharger les données du partenaire sans recharger la page
      await loadPartner();

      // Notifier les autres composants
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du partenaire:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6 flex items-center justify-center min-h-[200px]">
        <PadelLoader />
      </div>
    );
  }

  if (!profileData || Object.values(profileData).every((v) => v === null)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
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

  const data = isEditing && editingData ? editingData : profileData;
  if (!data) return null;

  const LevelIcon = data.level ? levelIcons[data.level] : null;
  const SideIcon = data.preferred_side ? sideIcons[data.preferred_side] : null;
  const HandIcon = data.hand ? handIcons[data.hand] : null;
  const FrequencyIcon = data.frequency ? frequencyIcons[data.frequency] : null;
  const ShotIcon = data.best_shot ? shotIcons[data.best_shot] : null;
  const isLeftHanded = data.hand === "left";

  const renderEditableField = (
    fieldKey: keyof OnboardingData,
    label: string,
    Icon: React.ComponentType<{ className?: string }> | null,
    iconClassName: string = ""
  ) => {
    const currentValue = data[fieldKey];
    const options = fieldOptions[fieldKey];
    const isOpen = openDropdown === fieldKey;
    const getLabel = (value: string | null) => {
      if (!value) return "Non renseigné";
      if (fieldKey === "level") return levelLabels[value];
      if (fieldKey === "hand") return handLabels[value];
      if (fieldKey === "preferred_side") return sideLabels[value];
      if (fieldKey === "best_shot") return shotLabels[value];
      if (fieldKey === "frequency") return frequencyLabels[value];
      return "";
    };

    if (!isEditing) {
      if (!currentValue) return null;
      return (
        <div className="rounded-2xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] group">
          <div className="flex items-center gap-4">
            {Icon && (
              <Icon className={`w-7 h-7 text-padel-green flex-shrink-0 ${iconClassName}`} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                {label}
              </div>
              <div className="text-base font-bold text-white">
                {getLabel(currentValue)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={(el) => {
          dropdownRefs.current[fieldKey] = el;
        }}
        className="relative"
      >
        <div
          className={`rounded-2xl border border-white/30 bg-white/5 p-5 ${isOpen ? "bg-white/[0.1] border-white/50" : "hover:bg-white/[0.07] cursor-pointer"
            }`}
          onClick={(e) => {
            if (!isOpen && !(e.target as HTMLElement).closest('button')) {
              setOpenDropdown(fieldKey);
            }
          }}
        >
          <div className="flex items-center gap-4">
            {Icon && (
              <Icon className={`w-7 h-7 text-padel-green flex-shrink-0 ${iconClassName}`} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1.5">
                {label}
              </div>
              <div className="text-base font-bold text-white">
                {currentValue ? getLabel(currentValue) : "Non renseigné"}
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center">
              <button
                type="button"
                className="p-1 -m-1 flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(isOpen ? null : fieldKey);
                }}
              >
                <ChevronDown
                  className={`w-4 h-4 text-white/50 ${isOpen ? "rotate-180" : ""
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div
            className="absolute z-50 w-full mt-2 rounded-2xl border border-white/30 bg-slate-900 shadow-xl"
            style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1">
              {options.map((option) => {
                const OptionIcon = (() => {
                  if (fieldKey === "level") return levelIcons[option.value];
                  if (fieldKey === "hand") return handIcons[option.value];
                  if (fieldKey === "preferred_side") return sideIcons[option.value];
                  if (fieldKey === "best_shot") return shotIcons[option.value];
                  if (fieldKey === "frequency") return frequencyIcons[option.value];
                  return null;
                })();
                const isSelected = currentValue === option.value;
                const isOptionLeftHanded = fieldKey === "hand" && option.value === "left";

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFieldChange(fieldKey, option.value);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${isSelected
                      ? "bg-white/20 border border-white/40"
                      : "hover:bg-white/10 border border-transparent"
                      }`}
                  >
                    {OptionIcon && (
                      <OptionIcon
                        className={`w-5 h-5 text-padel-green flex-shrink-0 ${isOptionLeftHanded ? "rotate-180" : ""
                          }`}
                      />
                    )}
                    <span className="text-sm font-medium text-white flex-1">
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-white flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 sm:p-8 md:p-10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Mon Profil Padel
          </h2>
          <p className="text-xs sm:text-sm text-white/50">
            Vos préférences et caractéristiques de jeu
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={handleStartEdit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Modifier</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white text-sm font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Enregistrer</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {renderEditableField("level", "Niveau", LevelIcon)}

        {/* Partenaire Habituel */}
        <div className="rounded-2xl border border-white/30 bg-white/5 p-5 hover:bg-white/[0.07] group relative">
          <div className="flex items-center gap-4">
            <Users className="w-7 h-7 text-padel-green flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs text-white/50 uppercase tracking-wider font-medium">
                  Partenaire Habituel
                </div>
                {partnerData && !isEditing && (
                  <button onClick={() => setShowDeleteDialog(true)} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {partnerData ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border border-white/10">
                      {partnerData.avatar_url ? (
                        <img src={partnerData.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40">
                          <User size={10} />
                        </div>
                      )}
                    </div>
                    <div className="text-base font-bold text-white truncate leading-tight">
                      {partnerData.first_name} {partnerData.last_name}
                    </div>
                  </div>

                  {/* Bouton WhatsApp */}
                  <div className="mt-1">
                    {isLoadingPartnerPhone ? (
                      <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Chargement du numéro WhatsApp…</span>
                      </div>
                    ) : partnerPhone ? (
                      <button
                        type="button"
                        onClick={() => {
                          const whatsappUrl = `https://wa.me/${partnerPhone.replace(/[^0-9]/g, "")}`;
                          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/25 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Discuter sur WhatsApp</span>
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-300">
                        En attente que {partnerData.first_name || "votre partenaire"} active WhatsApp.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-base font-bold text-gray-400">
                  Aucun partenaire
                </div>
              )}
            </div>
          </div>
        </div>

        {renderEditableField("hand", "Main forte", HandIcon, isLeftHanded ? "rotate-180" : "")}
        {renderEditableField("preferred_side", "Côté préféré", SideIcon)}
        {renderEditableField("best_shot", "Coup signature", ShotIcon)}
        {renderEditableField("frequency", "Fréquence", FrequencyIcon)}
      </div>


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

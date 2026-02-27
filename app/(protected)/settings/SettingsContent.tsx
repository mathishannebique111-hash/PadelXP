"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, MessageCircle, Star, Trash2, ChevronRight, LogOut, Shield, Settings, CalendarCheck, Bell, X, Gift, Eye } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import LogoutButton from "@/components/LogoutButton";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { PushNotificationsService } from "@/lib/notifications/push-notifications";
import { showToast } from "@/components/ui/Toast";

import { useAppleIAP } from "@/lib/hooks/useAppleIAP";
import { CreditCard } from "lucide-react";

export default function SettingsContent() {
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const supabase = createClient();
  const { isApp, manageSubscriptions } = useAppleIAP();

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check premium status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      if (profile?.is_premium) {
        setIsPremium(true);
      }

      // Check if user has a push token recorded
      const { data: token } = await supabase
        .from("push_tokens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!token) {
        setShowNotificationBanner(true);
      }
    };

    checkUserStatus();
  }, [supabase]);

  const handleEnableNotifications = async () => {
    setIsActivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await PushNotificationsService.initialize(user.id);
        // On vérifie à nouveau si un token a été créé (ou on suppose que c'est bon si pas d'erreur)
        setShowNotificationBanner(false);
        showToast("Notifications activées !", "success");
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      showToast("Erreur lors de l'activation", "error");
    } finally {
      setIsActivating(false);
    }
  };

  const menuItems = [
    {
      label: "Modifier mon profil",
      icon: User,
      href: "/settings/profile",
    },
    {
      label: "Support PadelXP",
      icon: MessageCircle,
      href: "/settings/support",
    },
    {
      label: "Parrainage",
      icon: Gift,
      href: "/settings/referral",
      color: "text-amber-400",
    },
    {
      label: "Avis",
      icon: Star,
      href: "/settings/reviews",
    },
    {
      label: "Qui a vu mon profil",
      icon: Eye,
      href: "/settings/profile-views",
      color: "text-blue-400",
    },
    {
      label: "Supprimer mon compte",
      icon: Trash2,
      href: "/settings/delete",
      color: "text-red-400",
    },
  ];

  return (
    <div className="relative min-h-screen pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-6">
        <PageTitle title="Paramètres" />

        {/* Bannière de notifications - "Cadre léger et discret" */}
        {showNotificationBanner && (
          <div className="mt-6 mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm p-4 relative overflow-hidden group">
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">Activer les notifications</h4>
                  <p className="text-xs text-blue-100/60 leading-relaxed mb-3">
                    Ne ratez plus aucune invitation de match ou défi de vos partenaires.
                  </p>
                  <button
                    onClick={handleEnableNotifications}
                    disabled={isActivating}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isActivating ? "Activation..." : "Activer"}
                  </button>
                </div>
                <button
                  onClick={() => setShowNotificationBanner(false)}
                  className="p-1 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white/30" />
                </button>
              </div>
              {/* Effet de lumière subtil en arrière-plan */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
            </div>
          </div>
        )}

        {/* Menu List */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider ml-2 mb-2">
            Mon compte
          </h3>

          <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm divide-y divide-white/5">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <item.icon className={`w-6 h-6 ${item.color || 'text-white'}`} />
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>
            ))}
          </div>
        </div>

        {/* Section Abonnement (Apple Compliance) */}
        {isApp && isPremium && (
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider ml-2 mb-2">
              Abonnement
            </h3>
            <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm">
              <button
                onClick={manageSubscriptions}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors active:bg-white/10 text-left"
              >
                <div className="flex items-center gap-4">
                  <CreditCard className="w-6 h-6 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-white">Gérer mon Pass Premium</span>
                    <span className="text-[10px] text-gray-400 font-normal">Annuler ou modifier sur l'App Store</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Déconnexion */}
        <div className="mt-8">
          <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm">
            <LogoutButton variant="menu" />
          </div>
        </div>

        {/* Informations Légales */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
            <Link href="/player/legal" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Mentions légales
            </Link>
            <Link href="/player/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              CGU
            </Link>
            <Link href="/player/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Confidentialité
            </Link>
            <Link href="/player/cookies" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Cookies
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <Image src="/images/Logo sans fond.png" alt="PadelXP" width={120} height={40} className="w-32 h-auto object-contain" />
            <span className="text-[10px] text-gray-600">v1.2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

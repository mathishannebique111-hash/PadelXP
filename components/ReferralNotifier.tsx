"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

interface ReferralNotification {
  type: "referrer" | "referred";
  referredName?: string;
  date?: string;
}

export default function ReferralNotifier() {
  const [show, setShow] = useState(false);
  const [notification, setNotification] = useState<ReferralNotification | null>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;

    const checkNotifications = async () => {
      try {
        // Vérifier d'abord si on vient de s'inscrire avec un code de parrainage
        const justReceivedReward = sessionStorage.getItem("referral_reward_received") === "true";
        if (justReceivedReward) {
          sessionStorage.removeItem("referral_reward_received");
          // Afficher la notification pour le filleul immédiatement
          setNotification({
            type: "referred",
          });
          setShow(true);
          hasCheckedRef.current = true;
          
          // Marquer comme vu
          const notificationKey = `referral_referred_${Date.now()}`;
          const seen = localStorage.getItem("padelleague.seenReferralNotifications");
          const seenList: string[] = seen ? JSON.parse(seen) : [];
          const updated = Array.from(new Set([...seenList, notificationKey]));
          localStorage.setItem("padelleague.seenReferralNotifications", JSON.stringify(updated));
          return;
        }

        const response = await fetch("/api/referrals/notifications");
        if (!response.ok) {
          hasCheckedRef.current = true;
          return;
        }

        const data = await response.json();
        if (!data.hasNotification) {
          hasCheckedRef.current = true;
          return;
        }

        // Vérifier si cette notification a déjà été affichée
        const notificationKey = `referral_${data.type}_${data.date || ""}`;
        const seen = localStorage.getItem("padelleague.seenReferralNotifications");
        const seenList: string[] = seen ? JSON.parse(seen) : [];

        if (seenList.includes(notificationKey)) {
          hasCheckedRef.current = true;
          return;
        }

        setNotification({
          type: data.type,
          referredName: data.referredName,
          date: data.date,
        });
        setShow(true);

        // Marquer comme vu
        const updated = Array.from(new Set([...seenList, notificationKey]));
        localStorage.setItem("padelleague.seenReferralNotifications", JSON.stringify(updated));
        hasCheckedRef.current = true;
      } catch (error) {
        console.error("Error checking referral notifications:", error);
        hasCheckedRef.current = true;
      }
    };

    checkNotifications();
  }, []);

  if (!show || !notification) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative mx-4 max-w-md transform animate-[scale-in_0.3s_ease-out] rounded-3xl bg-gradient-to-br from-yellow-500/20 via-amber-500/15 to-orange-500/10 p-8 text-center shadow-2xl ring-2 ring-yellow-400/30">
        {/* Confettis effet */}
        <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-yellow-400/20 blur-2xl" />
        <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />

        {/* Contenu */}
        <div className="relative z-10">
          <div className="mb-4 text-6xl">
            {notification.type === "referrer" ? "🎉" : "🎁"}
          </div>
          <h2 className="mb-3 text-3xl font-bold text-yellow-300">
            {notification.type === "referrer" ? "Excellent !" : "Bienvenue !"}
          </h2>
          <p className="mb-6 text-lg text-white/90">
            {notification.type === "referrer" ? (
              <>
                <span className="font-semibold text-white">{notification.referredName || "Un joueur"}</span> a utilisé votre code de parrainage.
                <br />
                <span className="font-semibold text-yellow-300">Vous gagnez +1 boost !</span>
              </>
            ) : (
              <>
                Vous avez reçu <span className="font-semibold text-yellow-300">+1 boost</span> grâce au code de parrainage utilisé.
              </>
            )}
          </p>

          {/* Affichage du boost */}
          <div className="mx-auto mb-6 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-yellow-400/25 to-amber-500/20 px-6 py-4 shadow-lg ring-1 ring-yellow-400/40">
            <Image
              src="/images/Éclair boost.png"
              alt="Boost"
              width={40}
              height={40}
              className="object-contain"
              unoptimized
            />
            <div className="text-left">
              <div className="text-sm font-medium text-yellow-200/80">Récompense</div>
              <div className="text-2xl font-bold text-white">+1 boost</div>
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={() => setShow(false)}
            className="mt-6 rounded-xl bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/20"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}


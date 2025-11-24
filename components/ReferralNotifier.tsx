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
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Contenu */}
        <div className="text-center">
          {/* Emoji - seulement pour le parrain */}
          {notification.type === "referrer" && (
            <div className="mb-3 text-center text-5xl">
              🎉
            </div>
          )}
          
          {/* Titre */}
          <h3 className="mb-1 text-center text-xl font-extrabold text-gray-900">
            {notification.type === "referrer" ? "Excellent !" : "Bienvenue !"}
          </h3>
          
          {/* Message */}
          <p className="mb-4 text-sm text-gray-700">
            {notification.type === "referrer" ? (
              <>
                <span className="font-semibold text-gray-900">{notification.referredName || "Un joueur"}</span> a utilisé votre code de parrainage.
                <br />
                <span className="font-semibold text-blue-600">Vous gagnez +1 boost !</span>
              </>
            ) : (
              <>
                Vous avez reçu <span className="font-semibold text-blue-600">+1 boost</span> grâce au code de parrainage utilisé.
              </>
            )}
          </p>

          {/* Affichage du boost */}
          <div className="mx-auto mb-6 flex w-full max-w-sm items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Image
              src="/images/Éclair boost.png"
              alt="Boost"
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
            <div className="text-left">
              <div className="text-xs text-gray-600">Récompense</div>
              <div className="text-sm font-bold text-gray-900">+1 boost</div>
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md"
            onClick={() => setShow(false)}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import ReferralJoinedNotifier from '@/components/ReferralJoinedNotifier'

interface ReferralInfo {
  referralCode: string | null;
  referralCount: number;
  maxReferrals: number;
  referrals: Array<{
    referredId: string;
    referredName: string;
    createdAt: string;
  }>;
}

export default function ReferralSection({ userId }: { userId: string }) {
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadReferralInfo = async () => {
      try {
        const response = await fetch("/api/referrals/info");
        if (response.ok) {
          const data = await response.json();
          setReferralInfo(data);
        }
      } catch (error) {
        console.error("Error loading referral info:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReferralInfo();
  }, [userId]);

  const handleCopyCode = async () => {
    if (!referralInfo?.referralCode) return;

    try {
      await navigator.clipboard.writeText(referralInfo.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying code:", error);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl sm:rounded-2xl border-2 border-white/80 p-4 sm:p-6 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]">
        <div className="text-sm text-white/70">Chargement...</div>
      </div>
    );
  }

  if (!referralInfo || !referralInfo.referralCode) {
    return null;
  }

  const isMaxReached = referralInfo.referralCount >= referralInfo.maxReferrals;
  const canShare = !isMaxReached;

  // Adapter les données pour le notificateur
  const referralsForNotifier = referralInfo.referrals?.map(r => ({
    id: r.referredId,
    name: r.referredName,
    joined_at: r.createdAt
  })) || []

  return (
    <>
      {/* Notificateur invisible */}
      <ReferralJoinedNotifier referrals={referralsForNotifier} />
      
      <div className="rounded-xl sm:rounded-2xl border-2 border-white/80 p-4 sm:p-6 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)] relative overflow-hidden" style={{
      background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%), radial-gradient(circle at 30% 20%, rgba(0,102,255,0.08), transparent 70%)"
    }}>
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-3">
          Mon code de parrainage
        </h3>

        {/* Code de parrainage avec bouton copier */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-3 font-mono text-lg sm:text-xl font-bold text-white tracking-wider">
              {referralInfo.referralCode}
            </div>
            <button
              onClick={handleCopyCode}
              disabled={!canShare}
              className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                canShare
                  ? "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
              }`}
            >
              {copied ? "✓ Copié" : "Copier"}
            </button>
          </div>
          {!canShare && (
            <p className="text-xs text-yellow-300">
              ⚠️ Vous avez atteint la limite de {referralInfo.maxReferrals} filleuls
            </p>
          )}
        </div>

        {/* Compteur de parrainages */}
        <div className="mb-4 rounded-lg bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/80">Filleuls parrainés</span>
            <span className="text-lg font-bold text-white">
              {referralInfo.referralCount}/{referralInfo.maxReferrals}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isMaxReached
                  ? "bg-green-500"
                  : referralInfo.referralCount > 0
                  ? "bg-blue-500"
                  : "bg-white/20"
              }`}
              style={{ width: `${(referralInfo.referralCount / referralInfo.maxReferrals) * 100}%` }}
            />
          </div>
        </div>

        {/* Liste des filleuls */}
        {referralInfo.referrals.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-white/90 mb-2">Filleuls parrainés :</h4>
            <div className="space-y-2">
              {referralInfo.referrals.map((referral) => (
                <div
                  key={referral.referredId}
                  className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                >
                  <span className="text-sm text-white/90">{referral.referredName}</span>
                  <span className="text-xs text-white/60">
                    {new Date(referral.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message d'information */}
        <div className="mt-4 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
          <p className="text-xs text-white/80">
            Partagez votre code avec vos amis ! Vous recevrez <strong className="text-white">+1 boost</strong> pour chaque filleul qui s'inscrit, et ils recevront aussi <strong className="text-white">+1 boost</strong>.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}


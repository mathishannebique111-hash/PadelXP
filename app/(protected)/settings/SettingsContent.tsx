"use client";

import Link from "next/link";
import { User, MessageCircle, Star, Trash2, ChevronRight, LogOut, Shield } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import LogoutButton from "@/components/LogoutButton";
import Image from "next/image";

export default function SettingsContent() {
  const menuItems = [
    {
      label: "Modifier mon profil",
      icon: User,
      href: "/settings/profile",
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      label: "Support PadelXP",
      icon: MessageCircle,
      href: "/settings/support",
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      label: "Avis",
      icon: Star,
      href: "/settings/reviews",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
    },
    {
      label: "Supprimer mon compte",
      icon: Trash2,
      href: "/settings/delete",
      color: "text-red-400",
      bgColor: "bg-red-400/10",
    },
  ];

  return (
    <div className="relative min-h-screen pb-20">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,102,255,0.1),transparent)] z-0 pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-6">
        <PageTitle title="Paramètres" />

        {/* Menu List */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider ml-2 mb-2">
            Mon Compte
          </h3>

          <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm divide-y divide-white/5">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>
            ))}
          </div>
        </div>

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

          <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <Image src="/images/logo.png" alt="PadelXP" width={20} height={20} className="w-5 h-5" />
            <span className="text-xs font-semibold text-white">PadelXP</span>
            <span className="text-xs text-gray-500">v1.2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

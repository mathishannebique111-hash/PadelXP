"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SupportChatSection from "@/components/settings/SupportChatSection";

export default function SupportPage() {
    return (
        <div className="relative min-h-screen pb-20">
            {/* Background avec overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(74,222,128,0.1),transparent)] z-0 pointer-events-none" />

            <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-6">
                {/* Header avec bouton retour */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Support PadelXP</h1>
                </div>

                {/* Le chat prend tout l'espace restant ou une bonne hauteur */}
                <div className="h-[calc(100vh-180px)] min-h-[500px]">
                    <SupportChatSection fullPage={true} />
                </div>
            </div>
        </div>
    );
}

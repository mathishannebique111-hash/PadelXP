"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReviewsSection from "@/components/settings/ReviewsSection";

export default function ReviewsPage() {
    return (
        <div className="relative min-h-screen pb-20">
            {/* Background avec overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.1),transparent)] z-0 pointer-events-none" />

            <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-6">
                {/* Header avec bouton retour */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Avis et Notes</h1>
                </div>

                <ReviewsSection fullPage={true} />
            </div>
        </div>
    );
}

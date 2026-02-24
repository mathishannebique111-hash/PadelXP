"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProfilePhotoUpload from "@/components/settings/ProfilePhotoUpload";
import PersonalDetailsSettings from "@/components/settings/PersonalDetailsSettings";
import UsernameSettings from "@/components/settings/UsernameSettings";
import WhatsAppSettings from "@/components/settings/WhatsAppSettings";
import LocationSettings from "@/components/settings/LocationSettings";

export default function EditProfilePage() {
    return (
        <div className="relative min-h-screen pb-20">
            {/* Background avec overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,102,255,0.1),transparent)] z-0 pointer-events-none" />

            <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-6">
                {/* Header avec bouton retour */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Modifier mon profil</h1>
                </div>

                <div className="space-y-6">
                    <ProfilePhotoUpload />
                    <PersonalDetailsSettings />
                    <LocationSettings />
                    <UsernameSettings />
                    <WhatsAppSettings />
                </div>
            </div>
        </div>
    );
}

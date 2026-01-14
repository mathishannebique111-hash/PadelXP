"use client";

import dynamic from "next/dynamic";

// Import dynamique pour éviter les erreurs SSR avec Capacitor
const OfflineScreen = dynamic(() => import("@/components/OfflineScreen"), {
    ssr: false,
});

export default function OfflineWrapper() {
    return <OfflineScreen />;
}

"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePopupQueue } from "@/contexts/PopupQueueContext";

function NotifierContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { enqueuePopup } = usePopupQueue();

    useEffect(() => {
        if (!searchParams) return;

        const isPremiumSuccess = searchParams.get("premium_success") === "true";

        if (isPremiumSuccess) {
            // 1. Déclencher le popup
            enqueuePopup({ type: "premium_success" });

            // 2. Nettoyer l'URL sans recharger la page
            const params = new URLSearchParams(searchParams.toString());
            params.delete("premium_success");

            const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
            router.replace(newUrl, { scroll: false });
        }
    }, [searchParams, enqueuePopup, router]);

    return null;
}

export default function PremiumSuccessNotifier() {
    return (
        <Suspense fallback={null}>
            <NotifierContent />
        </Suspense>
    );
}

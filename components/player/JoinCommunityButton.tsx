"use client";

import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

export default function JoinCommunityButton() {
    const [storeUrl, setStoreUrl] = useState("/download");

    useEffect(() => {
        const userAgent = navigator.userAgent || "";
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroid = /Android/.test(userAgent);

        if (isIOS) {
            setStoreUrl("https://apps.apple.com/app/id6757870307");
        } else if (isAndroid) {
            setStoreUrl("https://play.google.com/store/apps/details?id=eu.padelxp.player");
        }
    }, []);

    return (
        <a
            href={storeUrl}
            className="w-full py-3 px-6 text-black font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg text-base uppercase tracking-tight"
            style={{
                backgroundColor: 'rgb(var(--theme-secondary-accent))',
                boxShadow: '0 10px 15px -3px rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)'
            }}
        >
            <Trophy size={20} />
            Rejoindre la communauté PadelXP
        </a>
    );
}

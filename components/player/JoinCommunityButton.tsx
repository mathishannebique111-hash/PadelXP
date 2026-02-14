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
            className="w-full py-4 px-6 bg-padel-green hover:bg-padel-green/90 text-black font-extrabold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-padel-green/20 text-lg uppercase tracking-tight"
        >
            <Trophy size={22} />
            Rejoindre la communauté PadelXP
        </a>
    );
}

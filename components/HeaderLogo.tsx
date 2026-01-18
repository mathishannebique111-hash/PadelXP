"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export default function HeaderLogo() {
    const pathname = usePathname();
    const isSettingsPage = pathname === "/settings";

    if (isSettingsPage) return null;

    return (
        <div className="absolute top-0 left-0 right-0 z-5 pointer-events-none flex justify-center" style={{ top: 'calc(env(safe-area-inset-top, 0px) - 2.5rem)' }}>
            <div className="relative w-[36rem] h-[9rem] sm:w-[42rem] sm:h-[10.5rem] lg:w-[48rem] lg:h-[12rem] opacity-100">
                <Image
                    src="/images/padel-xp-logo-transparent.png"
                    alt="PadelXP"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
        </div>
    );
}

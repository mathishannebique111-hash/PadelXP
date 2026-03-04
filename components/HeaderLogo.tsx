"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

interface HeaderLogoProps {
    logoUrl?: string | null;
}

export default function HeaderLogo({ logoUrl }: HeaderLogoProps) {
    const pathname = usePathname();
    // if (isSettingsPage) return null;

    // Club logos are compact images, PadelXP logo is a wide transparent banner
    const isClubLogo = !!logoUrl;

    return (
        <div className="absolute top-0 left-0 right-0 z-5 pointer-events-none flex justify-center site-header-logo [.questionnaire-open_&]:hidden" style={{ top: isClubLogo ? 'calc(var(--sat, 0px) + 0.5rem)' : 'calc(var(--sat, 0px) - 2.5rem)' }}>
            <div className={isClubLogo
                ? "relative w-[4rem] h-[4rem] sm:w-[4.5rem] sm:h-[4.5rem] opacity-100"
                : "relative w-[36rem] h-[9rem] sm:w-[42rem] sm:h-[10.5rem] lg:w-[48rem] lg:h-[12rem] opacity-100"
            }>
                <Image
                    src={logoUrl || "/images/padel-xp-logo-transparent.png"}
                    alt="Logo"
                    fill
                    className={isClubLogo ? "object-contain drop-shadow-lg" : "object-contain"}
                    priority
                />
            </div>
        </div>
    );
}

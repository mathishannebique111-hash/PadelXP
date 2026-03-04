'use client';

import { useEffect, useState } from 'react';

interface ClubInstallPageProps {
    clubName: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
}

export default function ClubInstallPage({ clubName, logoUrl, primaryColor, secondaryColor, backgroundColor }: ClubInstallPageProps) {
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setPlatform('ios');
        } else if (/android/.test(ua)) {
            setPlatform('android');
        }

        // Vérifier si déjà installé en mode standalone (PWA)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }
    }, []);

    // Si l'app est déjà installée (mode standalone), rediriger vers login
    if (isInstalled) {
        if (typeof window !== 'undefined') {
            window.location.href = '/player/signup';
        }
        return null;
    }

    const isLightBg = (() => {
        const hex = backgroundColor.replace('#', '');
        if (hex.length < 6) return false;
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 155;
    })();

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
            style={{ backgroundColor: backgroundColor }}
        >
            <div className="relative z-10 flex flex-col items-center gap-[2rem]">
                {/* Logo du club */}
                <div
                    className="w-40 h-40 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden"
                    style={{ background: isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }}
                >
                    {logoUrl ? (
                        <img src={logoUrl} alt={clubName} className="w-28 h-28 object-contain" />
                    ) : (
                        <span className="text-5xl font-black" style={{ color: isLightBg ? '#000000' : '#ffffff' }}>{clubName.charAt(0)}</span>
                    )}
                </div>

                {/* Nom du club */}
                <h1 className="text-[2rem] font-black tracking-tight" style={{ color: isLightBg ? '#000000' : '#ffffff' }}>{clubName}</h1>
            </div>
        </div>
    );
}

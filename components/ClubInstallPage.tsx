'use client';

import { useEffect, useState } from 'react';

interface ClubInstallPageProps {
    clubName: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
}

export default function ClubInstallPage({ clubName, logoUrl, primaryColor, secondaryColor }: ClubInstallPageProps) {
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

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primaryColor}22 0%, #0a0a1a 40%, #0a0a1a 60%, ${primaryColor}15 100%)` }}
        >
            {/* Orbe décoratif */}
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none"
                style={{ backgroundColor: primaryColor }}
            />

            <div className="relative z-10 max-w-sm flex flex-col items-center gap-8">
                {/* Logo du club */}
                <div
                    className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                    {logoUrl ? (
                        <img src={logoUrl} alt={clubName} className="w-20 h-20 object-contain rounded-2xl" />
                    ) : (
                        <span className="text-4xl font-black text-white">{clubName.charAt(0)}</span>
                    )}
                </div>

                {/* Nom du club */}
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{clubName}</h1>
                    <p className="text-gray-400 mt-2 text-sm">Classements · Badges · Challenges</p>
                </div>

                {/* Séparateur */}
                <div className="w-16 h-0.5 rounded-full" style={{ backgroundColor: primaryColor }} />

                {/* Instructions d'installation */}
                <div className="space-y-4 w-full">
                    {platform === 'ios' && (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-4">
                            <p className="text-white font-semibold text-base">Installer l'application</p>
                            <div className="flex flex-col gap-3 text-left text-sm text-gray-300">
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: 'white' }}>1</span>
                                    <span>Appuyez sur le bouton <strong className="text-white">Partager</strong> <span className="inline-block text-lg leading-none align-middle">⬆️</span> en bas de l'écran</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: 'white' }}>2</span>
                                    <span>Descendez et appuyez sur <strong className="text-white">« Sur l'écran d'accueil »</strong> <span className="inline-block text-lg leading-none align-middle">➕</span></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: 'white' }}>3</span>
                                    <span>Appuyez sur <strong className="text-white">« Ajouter »</strong> en haut à droite</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {platform === 'android' && (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-4">
                            <p className="text-white font-semibold text-base">Installer l'application</p>
                            <div className="flex flex-col gap-3 text-left text-sm text-gray-300">
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: 'white' }}>1</span>
                                    <span>Appuyez sur le menu <strong className="text-white">⋮</strong> en haut à droite</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: 'white' }}>2</span>
                                    <span>Appuyez sur <strong className="text-white">« Ajouter à l'écran d'accueil »</strong></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: primaryColor, color: 'white' }}>3</span>
                                    <span>Confirmez en appuyant sur <strong className="text-white">« Ajouter »</strong></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {platform === 'desktop' && (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-3">
                            <p className="text-white font-semibold text-base">📱 Scannez depuis votre téléphone</p>
                            <p className="text-gray-400 text-sm">Pour la meilleure expérience, ouvrez ce lien depuis votre smartphone.</p>
                        </div>
                    )}
                </div>

                {/* Lien alternatif vers la version web */}
                <a
                    href="/player/signup"
                    className="text-sm underline decoration-dotted underline-offset-4 transition-colors"
                    style={{ color: primaryColor }}
                >
                    Ou continuer sur le navigateur →
                </a>

                {/* Footer branding */}
                <p className="text-gray-600 text-xs mt-4">
                    Propulsé par <span className="font-semibold text-gray-500">PadelXP</span>
                </p>
            </div>
        </div>
    );
}

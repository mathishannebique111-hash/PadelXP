'use client';

import { useEffect, useState } from 'react';
import { Share, SquarePlus, MoreVertical, Download, Monitor, Smartphone } from 'lucide-react';

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
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            setIsInstalled(true);
        }
    }, []);

    // Si l'app est déjà installée (mode standalone), rediriger vers signup
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

    const textColor = isLightBg ? '#000000' : '#ffffff';
    const mutedTextColor = isLightBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    const cardBg = isLightBg ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const accentColor = primaryColor;

    return (
        <div
            className="min-h-screen flex flex-col items-center p-6 text-center relative overflow-y-auto"
            style={{ backgroundColor: backgroundColor }}
        >
            <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8 py-12">
                {/* Header Branded */}
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-32 h-32 rounded-[2rem] flex items-center justify-center shadow-2xl overflow-hidden"
                        style={{ background: cardBg }}
                    >
                        {logoUrl ? (
                            <img src={logoUrl} alt={clubName} className="w-24 h-24 object-contain" />
                        ) : (
                            <span className="text-4xl font-black" style={{ color: textColor }}>{clubName.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: textColor }}>{clubName}</h1>
                        <p className="text-sm font-medium mt-1" style={{ color: accentColor }}>Application Officielle</p>
                    </div>
                </div>

                {/* Instructions Box */}
                <div className="w-full space-y-6">
                    <div className="p-8 rounded-3xl border border-white/10 backdrop-blur-md text-left space-y-6" style={{ backgroundColor: cardBg }}>
                        <div className="flex items-center gap-3">
                            <Download className="w-5 h-5" style={{ color: accentColor }} />
                            <h2 className="text-lg font-bold" style={{ color: textColor }}>Installer l'application</h2>
                        </div>

                        {platform === 'ios' && (
                            <div className="space-y-6">
                                <p className="text-sm leading-relaxed" style={{ color: mutedTextColor }}>
                                    Pour une expérience optimale, ajoutez l'application à votre écran d'accueil :
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: accentColor, color: '#fff' }}>1</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold" style={{ color: textColor }}>Appuyez sur le bouton "Partager"</p>
                                            <div className="mt-2 p-2 rounded-lg inline-flex items-center gap-2 bg-white/10 border border-white/10">
                                                <Share className="w-5 h-5 text-blue-400" />
                                                <span className="text-[10px] uppercase font-bold text-white/40">Icône en bas</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: accentColor, color: '#fff' }}>2</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold" style={{ color: textColor }}>Faites défiler et sélectionnez</p>
                                            <p className="text-xs mt-1" style={{ color: mutedTextColor }}>"Sur l'écran d'accueil"</p>
                                            <div className="mt-2 p-2 rounded-lg inline-flex items-center gap-2 bg-white/10 border border-white/10">
                                                <SquarePlus className="w-5 h-5 text-white" />
                                                <span className="text-[11px] font-bold text-white">Ajouter à l'écran d'accueil</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {platform === 'android' && (
                            <div className="space-y-6">
                                <p className="text-sm leading-relaxed" style={{ color: mutedTextColor }}>
                                    Suivez ces étapes pour installer l'application sur votre Android :
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: accentColor, color: '#fff' }}>1</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold" style={{ color: textColor }}>Ouvrez le menu de Chrome</p>
                                            <div className="mt-2 p-2 rounded-lg inline-flex items-center gap-2 bg-white/10 border border-white/10">
                                                <MoreVertical className="w-5 h-5 text-white" />
                                                <span className="text-[10px] uppercase font-bold text-white/40">Icône en haut à droite</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: accentColor, color: '#fff' }}>2</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold" style={{ color: textColor }}>Appuyez sur "Installer l'application"</p>
                                            <p className="text-xs mt-1" style={{ color: mutedTextColor }}>ou "Ajouter à l'écran d'accueil"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {platform === 'desktop' && (
                            <div className="space-y-4 py-4 text-center">
                                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-20" style={{ color: textColor }} />
                                <p className="text-sm" style={{ color: textColor }}>
                                    Pour profiter de l'expérience joueur {clubName}, connectez-vous depuis votre smartphone ou tablette.
                                </p>
                                <div className="pt-4 flex items-center justify-center gap-2 opacity-40">
                                    <Smartphone className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Mobile requis</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer simple */}
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-30" style={{ color: textColor }}>
                    Propulsé par PadelXP.eu
                </p>
            </div>
        </div>
    );
}


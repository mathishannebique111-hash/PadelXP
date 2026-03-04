'use client';

import { useState, useEffect } from 'react';

interface SplashOverlayProps {
    isApp: boolean;
    clubLogoUrl?: string | null;
    clubPrimaryColor?: string | null;
    clubBackgroundColor?: string | null;
    clubName?: string | null;
}

export default function SplashOverlay({ isApp, clubLogoUrl, clubPrimaryColor, clubBackgroundColor, clubName }: SplashOverlayProps) {
    const [visible, setVisible] = useState(true);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        if (!isApp) return;

        const handleHide = () => {
            setFading(true);
            setTimeout(() => {
                setVisible(false);
            }, 400); // Légèrement plus long que la transition CSS pour être sûr
        };

        window.addEventListener('hide-splash-overlay', handleHide);

        // Sécurité : forcer la disparition après 2 secondes si pas d'événement
        const fallbackTimer = setTimeout(() => {
            if (visible) handleHide();
        }, 2000);

        return () => {
            window.removeEventListener('hide-splash-overlay', handleHide);
            clearTimeout(fallbackTimer);
        };
    }, [isApp, visible]);

    if (!isApp || !visible) return null;

    const bgColor = clubBackgroundColor || clubPrimaryColor || '#071554';
    const logoSrc = clubLogoUrl || '/images/Logo sans fond.png';

    return (
        <div
            id="css-splash-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: bgColor,
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: '10vh',
                transition: 'opacity 0.3s ease-out',
                opacity: fading ? 0 : 1,
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                <img
                    src={logoSrc}
                    alt="App"
                    style={{ width: '140px', height: 'auto' }}
                />
                {clubName && (
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '900',
                        color: (function () {
                            const hex = bgColor.replace('#', '');
                            if (hex.length < 6) return '#ffffff';
                            const r = parseInt(hex.substring(0, 2), 16);
                            const g = parseInt(hex.substring(2, 4), 16);
                            const b = parseInt(hex.substring(4, 6), 16);
                            const yiq = (r * 299 + g * 587 + b * 114) / 1000;
                            return yiq > 155 ? '#000000' : '#ffffff';
                        })(),
                        margin: 0,
                        textAlign: 'center',
                        fontFamily: 'Inter, -apple-system, system-ui, sans-serif'
                    }}>
                        {clubName}
                    </h1>
                )}
            </div>
        </div>
    );
}


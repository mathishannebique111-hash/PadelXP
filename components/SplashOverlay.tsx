'use client';

import { useState, useEffect } from 'react';

interface SplashOverlayProps {
    isApp: boolean;
    clubLogoUrl?: string | null;
    clubPrimaryColor?: string | null;
    clubBackgroundColor?: string | null;
}

export default function SplashOverlay({ isApp, clubLogoUrl, clubPrimaryColor, clubBackgroundColor }: SplashOverlayProps) {
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
                transition: 'opacity 0.3s ease-out',
                opacity: fading ? 0 : 1,
                pointerEvents: fading ? 'none' : 'auto',
            }}
        >
            <img
                src={logoSrc}
                alt="App"
                style={{ width: '280px', height: 'auto' }}
            />
        </div>
    );
}


'use client';

import { useState, useEffect } from 'react';

interface SplashOverlayProps {
    isApp: boolean;
}

export default function SplashOverlay({ isApp }: SplashOverlayProps) {
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
        return () => window.removeEventListener('hide-splash-overlay', handleHide);
    }, [isApp]);

    if (!isApp || !visible) return null;

    return (
        <div
            id="css-splash-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#071554',
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
                src="/images/Logo sans fond.png"
                alt="PadelXP"
                style={{ width: '280px', height: 'auto' }}
            />
        </div>
    );
}

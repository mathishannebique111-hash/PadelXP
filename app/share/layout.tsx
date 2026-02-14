'use client';

import { useEffect } from "react";

export default function ShareLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    useEffect(() => {
        // Force background color on html and body tags for total uniformity
        document.documentElement.style.backgroundColor = '#172554';
        document.body.style.backgroundColor = '#172554';

        // Add player-page class to enable related styles in SafeAreas/globals.css
        document.documentElement.classList.add('player-page');
        document.body.classList.add('player-page');

        return () => {
            // Cleanup cleanup if necessary, but generally we want it to stay for sub-routes
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#172554]">
            {children}
        </div>
    );
}

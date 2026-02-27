"use client";
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function PadelBallTransition() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isChanging, setIsChanging] = useState(false);

    useEffect(() => {
        // On transition start (pathname or searchParams change)
        setIsChanging(true);

        // Hide after a short delay or when the page is likely ready
        // Note: Next.js doesn't have a perfect "routeChangeComplete" for Server Components 
        // but this provides immediate feedback while the new page loads.
        const timer = setTimeout(() => {
            setIsChanging(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    return (
        <AnimatePresence>
            {isChanging && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-black/10 backdrop-blur-[2px]"
                >
                    <motion.div
                        animate={{
                            y: [0, -40, 0],
                            scale: [1, 0.9, 1.1, 1],
                            rotate: [0, 180, 360]
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="relative w-16 h-16"
                    >
                        {/* The Padel Ball SVG */}
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(204,255,0,0.6)]">
                            <circle cx="50" cy="50" r="48" fill="#CCFF00" />
                            {/* Typical padel/tennis ball lines */}
                            <path
                                d="M 15 50 Q 50 15 85 50"
                                fill="none"
                                stroke="#FFFFFF"
                                strokeWidth="4"
                                strokeLinecap="round"
                                opacity="0.8"
                            />
                            <path
                                d="M 15 50 Q 50 85 85 50"
                                fill="none"
                                stroke="#FFFFFF"
                                strokeWidth="4"
                                strokeLinecap="round"
                                opacity="0.8"
                            />
                            {/* Texture/Shine */}
                            <circle cx="35" cy="35" r="5" fill="white" opacity="0.3" />
                        </svg>

                        {/* Shadow below the ball */}
                        <motion.div
                            animate={{
                                scale: [1, 0.5, 1],
                                opacity: [0.3, 0.1, 0.3]
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/40 rounded-full blur-md"
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

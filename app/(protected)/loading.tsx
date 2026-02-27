import React from 'react';
import PadelLoader from '@/components/ui/PadelLoader';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#172554]">
            {/* Background gradients to match the app aesthetic */}
            <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 160px, rgba(0,0,0,0.8) 70%, #000000 100%)' }} />

            <div className="relative z-10 flex flex-col items-center gap-6">
                <PadelLoader className="scale-125" text="Chargement..." />

                {/* Subtle animated logo or brand mark if needed */}
                <div className="mt-8 animate-pulse text-slate-500 font-bold tracking-widest text-[10px] uppercase">
                    PADELXP · L'expérience ultime
                </div>
            </div>
        </div>
    );
}

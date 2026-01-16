'use client';

import { useState, useEffect } from 'react';

interface GracePeriodTimerProps {
    trialEndDate: Date;
}

export default function GracePeriodTimer({ trialEndDate }: GracePeriodTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        // La période de grâce est de 48h APRES la fin de l'essai
        const gracePeriodEnd = new Date(trialEndDate.getTime() + 48 * 60 * 60 * 1000);

        const calculateTimeLeft = () => {
            const now = new Date();
            const difference = gracePeriodEnd.getTime() - now.getTime();

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft(null);
                return;
            }

            setIsExpired(false);
            setTimeLeft({
                hours: Math.floor((difference / (1000 * 60 * 60))),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [trialEndDate]);

    if (isExpired) {
        return (
            <span className="font-bold text-red-500">
                Coupure imminente
            </span>
        );
    }

    if (!timeLeft) return null;

    return (
        <span className="font-mono font-bold text-red-400">
            {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
        </span>
    );
}

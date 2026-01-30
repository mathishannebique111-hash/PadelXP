'use client';

import { usePathname } from 'next/navigation';
import TrialExpiredOverlay from './TrialExpiredOverlay';

interface TrialGuardProps {
    children: React.ReactNode;
    isTrialExpired: boolean;
    daysInGrace: number;
    hasActiveSubscription: boolean;
}

/**
 * Composant client qui protège les pages du dashboard quand l'essai est expiré.
 * Affiche un overlay sur toutes les pages SAUF /dashboard/facturation.
 */
export default function TrialGuard({
    children,
    isTrialExpired,
    daysInGrace,
    hasActiveSubscription,
}: TrialGuardProps) {
    const pathname = usePathname();

    // Pages autorisées même si l'essai est expiré
    const allowedPaths = [
        '/dashboard/facturation',
        '/dashboard/facturation/checkout',
        '/dashboard/facturation/success',
    ];

    // Vérifier si la page actuelle est autorisée
    const isAllowedPage = allowedPaths.some(path => pathname?.startsWith(path));

    // Ne pas bloquer si :
    // - L'essai n'est pas expiré
    // - L'utilisateur a un abonnement actif
    // - On est sur une page autorisée
    const shouldBlock = isTrialExpired && !hasActiveSubscription && !isAllowedPage;

    return (
        <>
            {children}
            {shouldBlock && <TrialExpiredOverlay daysInGrace={daysInGrace} />}
        </>
    );
}

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';

export default function ClubSuspendedPage() {
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

    useEffect(() => {
        // On pourrait récupérer la date exacte de suppression via une API
        // Pour l'instant, on affiche juste le message statique
        setDaysRemaining(45);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Image
                        src="/images/padelxp.png"
                        alt="PadelXP"
                        width={120}
                        height={40}
                        className="h-10 w-auto"
                    />
                </div>

                {/* Icône d'alerte */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-orange-500/20 p-4">
                        <AlertTriangle className="w-12 h-12 text-orange-400" />
                    </div>
                </div>

                {/* Titre */}
                <h1 className="text-2xl font-bold text-white">
                    Accès temporairement suspendu
                </h1>

                {/* Message principal */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <p className="text-white/80 text-sm leading-relaxed">
                        Votre club n'a pas souhaité continuer avec PadelXP.
                    </p>

                    <p className="text-white/70 text-sm leading-relaxed">
                        Vos données seront sauvegardées pendant <span className="font-semibold text-orange-300">45 jours</span> puis entièrement supprimées.
                    </p>

                    <p className="text-white/70 text-sm leading-relaxed">
                        Si votre club renouvelle son engagement avec PadelXP durant cette période de 45 jours, vous pourrez à nouveau accéder à votre compte et retrouver toutes vos données.
                    </p>
                </div>

                {/* Action */}
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
                    <p className="text-blue-200 text-sm">
                        Contactez votre club pour plus d'informations sur les raisons de cet arrêt.
                    </p>
                </div>

                {/* Footer */}
                <p className="text-white/40 text-xs">
                    © {new Date().getFullYear()} PadelXP. Tous droits réservés.
                </p>
            </div>
        </div>
    );
}

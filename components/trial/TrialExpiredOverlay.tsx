'use client';

import { Clock } from 'lucide-react';
import Link from 'next/link';

interface TrialExpiredOverlayProps {
    daysInGrace: number; // Nombre de jours restants dans la période de grâce
}

/**
 * Overlay affiché sur les pages du dashboard quand l'essai est expiré.
 * La page en dessous est floutée et l'utilisateur doit aller sur la page abonnement.
 */
export default function TrialExpiredOverlay({ daysInGrace }: TrialExpiredOverlayProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Fond flouté */}
            <div className="absolute inset-0 backdrop-blur-md bg-black/60" />

            {/* Contenu du message */}
            <div className="relative z-10 max-w-md mx-4 p-8 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/20 shadow-2xl text-center">
                {/* Icône */}
                <div className="mb-6 flex justify-center">
                    <div className="p-4 rounded-full bg-orange-500/20 border border-orange-400/30">
                        <Clock className="w-12 h-12 text-orange-400" />
                    </div>
                </div>

                {/* Titre */}
                <h2 className="text-2xl font-bold text-white mb-3">
                    Période d'essai terminée
                </h2>

                {/* Message */}
                <p className="text-white/80 mb-6 leading-relaxed">
                    Votre période d'essai est terminée. Sélectionnez une offre pour continuer à utiliser la plateforme.
                </p>

                {/* Info période de grâce */}
                {daysInGrace > 0 && (
                    <div className="mb-6 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-400/20">
                        <p className="text-sm text-orange-300">
                            ⏳ Il vous reste <span className="font-bold">{daysInGrace} jour{daysInGrace > 1 ? 's' : ''}</span> pour choisir votre abonnement
                        </p>
                    </div>
                )}

                {/* Bouton CTA */}
                <Link
                    href="/dashboard/facturation"
                    className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl text-white font-bold text-base transition-all hover:scale-105 active:scale-100 shadow-[0_0_30px_rgba(0,102,255,0.4)]"
                    style={{ background: 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)' }}
                >
                    Aller sur la page Abonnement & essai
                </Link>
            </div>
        </div>
    );
}

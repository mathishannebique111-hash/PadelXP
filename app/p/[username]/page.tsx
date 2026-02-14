'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const APP_SCHEME = 'eu.padelxp.player';
// Rediriger vers la page /download qui contient les liens corrects vers les stores
const DOWNLOAD_PAGE_URL = '/download';

export default function ProfileShareRedirectPage() {
    const params = useParams();
    const username = params?.username as string;
    const [isRedirecting, setIsRedirecting] = useState(true);

    useEffect(() => {
        if (!username) return;

        const userAgent = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroid = /Android/.test(userAgent);
        const isMobile = isIOS || isAndroid;

        // Si on est sur desktop, rediriger vers la page web
        if (!isMobile) {
            window.location.href = `/share/${username}`;
            return;
        }

        // Sur mobile, essayer d'ouvrir l'app via le scheme personnalisé
        const deepLinkUrl = `${APP_SCHEME}://player/${username}`;

        // Créer un iframe invisible pour tenter d'ouvrir l'app
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = deepLinkUrl;
        document.body.appendChild(iframe);

        // Aussi essayer window.location (certains navigateurs le supportent mieux)
        setTimeout(() => {
            window.location.href = deepLinkUrl;
        }, 100);

        // Si l'app n'est pas installée, rediriger vers la page /download après un délai
        const fallbackTimeout = setTimeout(() => {
            setIsRedirecting(false);

            // Vérifier si on est toujours sur la page (l'app n'a pas été ouverte)
            if (document.visibilityState !== 'hidden') {
                // Rediriger vers la page de téléchargement qui contient les bons liens stores
                window.location.href = DOWNLOAD_PAGE_URL;
            }
        }, 1500);

        // Nettoyer si la page devient cachée (l'app s'est ouverte)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                clearTimeout(fallbackTimeout);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(fallbackTimeout);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        };
    }, [username]);

    // Écran de chargement pendant la redirection
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-sm w-full text-center space-y-6">
                {/* Logo */}
                <div className="mb-8">
                    <Image
                        src="/images/Logo.png"
                        alt="PadelXP"
                        width={120}
                        height={40}
                        className="mx-auto"
                    />
                </div>

                {isRedirecting ? (
                    <>
                        {/* Spinner */}
                        <div className="w-12 h-12 border-4 border-padel-green/30 border-t-padel-green rounded-full animate-spin mx-auto" />
                        <p className="text-gray-400">Ouverture de l'application...</p>
                    </>
                ) : (
                    <p className="text-gray-400">Redirection en cours...</p>
                )}
            </div>
        </div>
    );
}

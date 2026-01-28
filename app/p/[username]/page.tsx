'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const APP_SCHEME = 'eu.padelxp.player';
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/padelxp';
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=eu.padelxp.player';

export default function ProfileShareRedirectPage() {
    const params = useParams();
    const username = params?.username as string;
    const [isRedirecting, setIsRedirecting] = useState(true);
    const [showFallback, setShowFallback] = useState(false);

    useEffect(() => {
        if (!username) return;

        const userAgent = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroid = /Android/.test(userAgent);
        const isMobile = isIOS || isAndroid;

        // Si on est sur desktop, rediriger vers la page web
        if (!isMobile) {
            window.location.href = `/player/${username}`;
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

        // Si l'app n'est pas installée, rediriger vers le store après un délai
        const fallbackTimeout = setTimeout(() => {
            setIsRedirecting(false);

            // Vérifier si on est toujours sur la page (l'app n'a pas été ouverte)
            if (document.visibilityState !== 'hidden') {
                if (isIOS) {
                    window.location.href = IOS_APP_STORE_URL;
                } else if (isAndroid) {
                    window.location.href = ANDROID_PLAY_STORE_URL;
                } else {
                    setShowFallback(true);
                }
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
                        src="/images/logo.png"
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
                ) : showFallback ? (
                    <>
                        <h1 className="text-2xl font-bold">Voir le profil de @{username}</h1>
                        <p className="text-gray-400">
                            Téléchargez l'application PadelXP pour voir ce profil et jouer avec d'autres joueurs !
                        </p>
                        <div className="flex flex-col gap-3 pt-4">
                            <a
                                href={IOS_APP_STORE_URL}
                                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
                            >
                                📱 Télécharger sur l'App Store
                            </a>
                            <a
                                href={ANDROID_PLAY_STORE_URL}
                                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
                            >
                                🤖 Télécharger sur Google Play
                            </a>
                        </div>
                        <Link
                            href={`/player/${username}`}
                            className="text-sm text-gray-500 hover:text-gray-300 underline mt-4 inline-block"
                        >
                            Voir la version web →
                        </Link>
                    </>
                ) : (
                    <p className="text-gray-400">Redirection en cours...</p>
                )}
            </div>
        </div>
    );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Composant qui détecte les tokens d'authentification Supabase dans l'URL
 * et redirige vers la page appropriée.
 * 
 * Cas d'utilisation principal: quand Supabase redirige vers "/" au lieu de "/clubs/signup"
 * pour les invitations admin, ce composant capture les tokens et redirige correctement.
 */
export default function AuthRedirectHandler() {
    const router = useRouter();

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Récupérer les paramètres du hash
        const hash = window.location.hash;
        if (!hash || hash.length < 2) return;

        const hashParams = new URLSearchParams(hash.slice(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        const errorDescription = hashParams.get("error_description");

        // Si erreur d'authentification, ne rien faire
        if (errorDescription) {
            console.error("[AuthRedirectHandler] Auth error:", errorDescription);
            return;
        }

        // Si on a des tokens d'authentification
        if (accessToken) {
            // Déterminer la destination en fonction du type
            // Pour les invitations (magiclink, invite, recovery), rediriger vers /clubs/signup
            if (type === "magiclink" || type === "invite" || type === "recovery") {
                // Construire l'URL vers /clubs/signup avec les tokens
                const signupUrl = `/clubs/signup${hash}`;
                console.log("[AuthRedirectHandler] Redirecting to:", signupUrl);
                router.replace(signupUrl);
                return;
            }
        }
    }, [router]);

    // Ce composant ne rend rien visuellement
    return null;
}

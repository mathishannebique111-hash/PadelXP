import { NextRequest, NextResponse } from "next/server";
import { extractSubdomain, getClubBranding } from "@/lib/club-branding";

/**
 * API Route : /api/manifest
 * Génère un manifest.json dynamique en fonction du sous-domaine.
 * Cela permet à chaque club d'avoir son propre nom et icône PWA
 * quand les joueurs "ajoutent à l'écran d'accueil".
 */
export async function GET(req: NextRequest) {
    const host = req.headers.get("host") || "";
    const subdomain = req.headers.get("x-club-subdomain") || extractSubdomain(host);
    const branding = await getClubBranding(subdomain);

    // Utiliser le logo du club comme icône PWA, ou le logo PadelXP par défaut
    const iconUrl = branding.logo_url || "/images/flavicon.png";

    const manifest = {
        name: branding.name,
        short_name: branding.name,
        description: `${branding.name} — Classements, badges et challenges de padel`,
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#172554",
        theme_color: branding.primary_color,
        icons: [
            {
                src: iconUrl,
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable",
            },
            {
                src: iconUrl,
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable",
            },
        ],
    };

    return NextResponse.json(manifest, {
        headers: {
            "Content-Type": "application/manifest+json",
            // Cache court pour permettre les mises à jour de branding
            "Cache-Control": "public, max-age=3600",
        },
    });
}

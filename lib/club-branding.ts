import { createClient } from "@supabase/supabase-js";

export interface ClubBranding {
    id: string;
    name: string;
    slug: string;
    subdomain: string | null;
    logo_url: string | null;
    banner_url: string | null;
    primary_color: string;
    secondary_color: string;
    background_color: string;
    enabled_features: {
        rankings: boolean;
        challenges: boolean;
        reservations: boolean;
        boost: boolean;
        leagues: boolean;
    };
    external_booking_url: string | null;
    has_reservations_option: boolean;
}

const DEFAULT_BRANDING: ClubBranding = {
    id: "",
    name: "PadelXP",
    slug: "",
    subdomain: null,
    logo_url: null,
    banner_url: null,
    primary_color: "#0066FF",
    secondary_color: "#CCFF00",
    background_color: "#172554",
    enabled_features: {
        rankings: true,
        challenges: true,
        reservations: false,
        boost: true,
        leagues: true,
    },
    external_booking_url: null,
    has_reservations_option: false,
};

/**
 * Extrait le sous-domaine depuis le hostname.
 * Ex: "amiens.padelxp.eu" -> "amiens"
 * Ex: "padelxp.eu" -> null
 * Ex: "localhost:3000" -> null
 */
export function extractSubdomain(hostname: string | null): string | null {
    // Override pour le développement
    const forcedSubdomain = process.env.NEXT_PUBLIC_FORCE_CLUB_SUBDOMAIN;
    if (forcedSubdomain && forcedSubdomain !== "") {
        return forcedSubdomain;
    }

    if (!hostname) return null;

    // Enlever le port si présent
    const cleanHost = hostname.split(":")[0];

    // Localhost -> pas de sous-domaine
    if (cleanHost === "localhost" || cleanHost === "127.0.0.1") return null;

    const parts = cleanHost.split(".");

    // padelxp.eu (2 parties) ou www.padelxp.eu -> pas de club
    if (parts.length <= 2) return null;
    if (parts[0] === "www" || parts[0] === "app") return null;

    return parts[0];
}

/**
 * Convertit un hex (#2563EB) en triplet RGB nu (37 99 235)
 * pour être utilisé avec les variables CSS type rgb(var(--theme-accent))
 */
export function hexToRgbTriplet(hex: string): string {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r} ${g} ${b}`;
}

/**
 * Détermine si le texte superposé à une couleur doit être noir ou blanc.
 * Retourne "#000000" (noir) pour un fond clair, et "#ffffff" (blanc) pour un fond sombre.
 */
export function getContrastColor(hex: string): string {
    const clean = hex.replace("#", "");
    if (clean.length < 6) return "#ffffff"; // Par défaut blanc
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    // Formule de luminosité relative (YIQ)
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq > 155 ? "#000000" : "#ffffff";
}

/**
 * Récupère le branding d'un club depuis Supabase via son sous-domaine.
 * Renvoie le branding par défaut (PadelXP) si le club n'est pas trouvé.
 */
export async function getClubBranding(
    subdomain: string | null
): Promise<ClubBranding> {
    // Priorité au sous-domaine forcé si présent
    const effectiveSubdomain = process.env.NEXT_PUBLIC_FORCE_CLUB_SUBDOMAIN || subdomain;

    if (!effectiveSubdomain) return DEFAULT_BRANDING;

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
            .from("clubs")
            .select(
                "id, name, slug, subdomain, logo_url, banner_url, primary_color, secondary_color, background_color, enabled_features, external_booking_url, is_suspended, subscription_status, has_reservations_option"
            )
            .or(`subdomain.eq.${effectiveSubdomain},slug.eq.${effectiveSubdomain}`)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            console.warn(
                `[ClubBranding] Club not found for subdomain: ${subdomain}`
            );
            return DEFAULT_BRANDING;
        }

        // Vérifier si le club est arrêté (suspendu ou abonnement expiré/annulé)
        const isStopped = data.is_suspended || 
                         ['canceled', 'trial_expired'].includes(data.subscription_status || '');
        
        if (isStopped) {
            console.warn(`[ClubBranding] Club is stopped for subdomain: ${subdomain}`);
            return DEFAULT_BRANDING;
        }

        return {
            ...DEFAULT_BRANDING,
            ...data,
            primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
            secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
            background_color: data.background_color || DEFAULT_BRANDING.background_color,
            enabled_features: {
                ...DEFAULT_BRANDING.enabled_features,
                ...(data.enabled_features || {}),
                reservations: !!data.has_reservations_option,
            },
            has_reservations_option: !!data.has_reservations_option,
        };
    } catch (err) {
        console.error("[ClubBranding] Error fetching club branding:", err);
        return DEFAULT_BRANDING;
    }
}

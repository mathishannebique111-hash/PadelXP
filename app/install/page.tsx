import { headers } from "next/headers";
import { extractSubdomain, getClubBranding } from "@/lib/club-branding";
import ClubInstallPage from "@/components/ClubInstallPage";

/**
 * Page d'installation pour les sous-domaines de clubs.
 * Quand un joueur visite "nomduclub.padelxp.eu/install",
 * il voit une page brandée avec les instructions pour ajouter l'app.
 */
export default async function ClubInstallRoute() {
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const subdomain =
        headersList.get("x-club-subdomain") || extractSubdomain(host);
    const branding = await getClubBranding(subdomain);

    // Si pas de sous-domaine club, rediriger vers la page download classique
    if (!subdomain || branding.id === "") {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="max-w-md text-center space-y-4">
                    <h1 className="text-3xl font-bold">Club non trouvé</h1>
                    <p className="text-gray-400">
                        Ce lien ne correspond à aucun club enregistré.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ClubInstallPage
            clubName={branding.name}
            logoUrl={branding.logo_url}
            primaryColor={branding.primary_color}
            secondaryColor={branding.secondary_color}
        />
    );
}

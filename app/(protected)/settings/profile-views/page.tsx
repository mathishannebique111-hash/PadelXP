import { headers } from "next/headers";
import { extractSubdomain } from "@/lib/club-branding";
import VisitorsList from "./VisitorsList";

export const metadata = {
    title: "Vues de profil - PadelXP",
    description: "Découvrez qui a consulté votre profil PadelXP.",
};

export default async function ProfileViewsPage() {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const isClub = !!(headersList.get('x-club-subdomain') || extractSubdomain(host));

    return (
        <div className="w-full min-h-screen bg-theme-bg">
            <div className="absolute inset-0 -top-40 bg-[radial-gradient(circle_at_50%_0%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none hide-in-club" />
            <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-4">
                <VisitorsList />
            </div>
        </div>
    );
}

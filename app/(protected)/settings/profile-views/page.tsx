import VisitorsList from "./VisitorsList";

export const metadata = {
    title: "Vues de profil - PadelXP",
    description: "Découvrez qui a consulté votre profil PadelXP.",
};

export default function ProfileViewsPage() {
    return (
        <div className="relative min-h-screen">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,102,255,0.1),transparent)] z-0 pointer-events-none" />
            <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-8">
                <VisitorsList />
            </div>
        </div>
    );
}

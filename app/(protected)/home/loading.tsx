import PadelLoader from "@/components/ui/PadelLoader";

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <PadelLoader text="Chargement du profil..." />
        </div>
    );
}

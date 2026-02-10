import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white bg-black">
            <div className="w-full max-w-md bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-md">
                <h1 className="text-2xl font-bold mb-4">Mot de passe oublié</h1>
                <p className="text-white/70 mb-6">
                    Cette fonctionnalité sera bientôt disponible. Veuillez contacter le support si vous ne parvenez pas à accéder à votre compte.
                </p>
                <Link href="/login" className="flex items-center justify-center gap-2 text-[#0066FF] hover:underline font-medium">
                    <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                </Link>
            </div>
        </div>
    );
}

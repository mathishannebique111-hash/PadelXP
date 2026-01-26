import Footer from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <nav className="absolute top-0 left-0 right-0 z-50 px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <img src="/images/Logo sans fond.png" alt="PadelXP" className="h-24 w-24 md:h-28 md:w-28 object-contain" />
                    </Link>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-32">
                <Link
                    href="/"
                    className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à l'accueil
                </Link>

                <h1 className="text-4xl md:text-5xl font-extrabold mb-8 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    À propos
                </h1>

                <div className="prose prose-invert max-w-none text-white/80 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Notre Histoire</h2>
                        <p>
                            PadelXP est né d'une passion commune pour le padel. En tant que joueurs, nous avons constaté qu'il manquait une solution moderne et engageante pour connecter les clubs et les joueurs.
                        </p>
                        <p>
                            Notre mission est de digitaliser l'expérience padel en apportant des outils professionnels aux clubs tout en gamifiant la progression des joueurs.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Notre Mission</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Simplifier la gestion des clubs</li>
                            <li>Créer une communauté vibrante</li>
                            <li>Rendre la compétition accessible et fun</li>
                            <li>Innover continuellement pour le sport</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">L'Équipe</h2>
                        <p>
                            PadelXP est développé par des passionnés, pour des passionnés. Nous travaillons chaque jour pour améliorer la plateforme basée sur vos retours.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

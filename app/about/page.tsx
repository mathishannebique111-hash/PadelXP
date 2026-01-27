import type { Metadata } from "next";
import BackButton from "@/components/legal/BackButton";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
    title: "À propos - PadelXP",
    description: "Découvrez l'histoire et la mission de PadelXP",
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-8 py-16">
                <div className="mb-8">
                    <BackButton />
                </div>

                <h1 className="text-4xl font-extrabold mb-8">À propos de PadelXP</h1>

                <div className="prose prose-invert max-w-none space-y-8 text-white/80">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">L'origine du projet</h2>
                        <div className="space-y-4 text-white/80">
                            <p>
                                L'idée de PadelXP est née d'un constat simple après plusieurs années de pratique.
                                En arpentant de nombreux clubs et complexes de padel, j'ai réalisé qu'une étape manquait
                                systématiquement à l'expérience du joueur.
                            </p>
                            <p>
                                Dans la plupart des structures, le scénario était toujours le même :
                                <strong> je venais, je jouais et je repartais</strong>, sans aucune véritable
                                expérience sociale ou engagement autour des matchs. Il n'y avait pas de lien
                                durable entre les parties, pas de suivi de progression partagé, et peu d'animation
                                communautaire.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Notre Mission</h2>
                        <div className="space-y-4 text-white/80">
                            <p>
                                C'est pour combler ce vide que j'ai imaginé PadelXP : une plateforme conçue pour créer
                                une <strong>expérience unique</strong> pour les joueurs et les clubs.
                            </p>
                            <p>
                                Notre mission est de transformer chaque club en une véritable communauté d'élite,
                                où chaque match compte, chaque victoire est célébrée et chaque joueur se sent investi
                                dans la vie de son complexe.
                            </p>
                            <p>
                                Nous apportons aux clubs les outils nécessaires pour animer leur communauté,
                                fidéliser leurs joueurs et digitaliser l'émulation naturelle du sport.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Pourquoi PadelXP ?</h2>
                        <div className="space-y-2 text-white/80">
                            <ul className="list-disc list-inside ml-4 space-y-2">
                                <li><strong>Engagement :</strong> Créer une raison de revenir jouer au-delà de la simple partie.</li>
                                <li><strong>Reconnaissance :</strong> Valoriser chaque progression avec des classements et des badges.</li>
                                <li><strong>Animation :</strong> Donner aux gérants de clubs les moyens d'animer leur structure sans effort administratif.</li>
                                <li><strong>Communauté :</strong> Faciliter les rencontres et les échanges entre passionnés.</li>
                            </ul>
                        </div>
                    </section>

                    <p className="text-white/60 pt-8 border-t border-white/10">
                        Rejoignez l'aventure et transformons ensemble l'expérience padel.
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}

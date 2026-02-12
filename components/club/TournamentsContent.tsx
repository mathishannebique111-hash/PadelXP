export default function TournamentsContent() {
    return (
        <div className="min-h-[40vh] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#0a0f2c] shadow-2xl ring-1 ring-white/10">
                <div className="p-8 md:p-12 lg:p-16 flex flex-col items-center text-center relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 w-64 h-64 bg-green-500/10 blur-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" />

                    {/* Badge */}
                    <div className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] md:text-xs font-bold tracking-widest uppercase text-white shadow-inner mb-6 md:mb-8 backdrop-blur-sm">
                        <span className="text-gray-400">LIGUES</span>
                        <span className="text-[#BFFF00]">ARRIVE BIENTÔT</span>
                    </div>

                    {/* Title */}
                    <h1 className="relative text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] mb-6 md:mb-8">
                        Créez vos ligues <span className="text-[#BFFF00]">entre amis</span>
                    </h1>

                    {/* Features List */}
                    <div className="relative space-y-4 md:space-y-6 flex flex-col items-center">
                        <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-lg">
                            Bientôt, les membres premium pourront créer des ligues privées pour se défier entre amis. Invitez vos partenaires, jouez vos matchs et découvrez qui est vraiment le meilleur grâce à un classement dédié et automatisé.
                        </p>

                        <ul className="space-y-3 md:space-y-4 text-sm md:text-base text-gray-300 text-left">
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                                <span>Création de ligues privées entre amis</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                                <span>Classement automatisé et historique des matchs</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                                <span>Voir qui est le meilleur joueur de votre groupe</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

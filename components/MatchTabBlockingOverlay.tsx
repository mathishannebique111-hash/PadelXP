import { Trophy } from "lucide-react";

interface MatchTabBlockingOverlayProps {
    type: 'record' | 'history';
    onEvaluate: () => void;
}

export default function MatchTabBlockingOverlay({ type, onEvaluate }: MatchTabBlockingOverlayProps) {
    const message = type === 'record'
        ? "Veuillez évaluer votre niveau pour pouvoir enregistrer des matchs et faire évoluer votre classement."
        : "Veuillez évaluez votre niveau pour pouvoir confirmer vos matchs et consulter votre historique.";

    return (
        <div className="absolute inset-0 z-50 rounded-3xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-[#071554]/40 border border-white/10" style={{ minHeight: '400px' }}>
            <div className="bg-padel-green/20 p-4 rounded-full mb-6">
                <Trophy className="w-10 h-10 text-padel-green" />
            </div>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Évaluation requise</h2>
            <p className="text-white/80 max-w-md mb-8 text-base font-medium leading-relaxed">
                {message}
            </p>
            <button
                onClick={onEvaluate}
                className="px-8 py-4 rounded-2xl bg-padel-green text-[#071554] font-black text-lg shadow-[0_0_30px_rgba(204,255,0,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center min-w-[200px] uppercase tracking-wider"
            >
                Évaluer mon niveau
            </button>
        </div>
    );
}

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
        <div className="absolute inset-0 z-50 rounded-3xl flex flex-col items-center justify-start p-6 pt-20 text-center backdrop-blur-md bg-[#071554]/40 border border-white/10" style={{ minHeight: '400px' }}>
            <div className="p-4 rounded-full mb-6" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent-rgb, 191,255,0), 0.2)' }}>
                <Trophy className="w-10 h-10" style={{ color: 'rgb(var(--theme-secondary-accent))' }} />
            </div>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Évaluation requise</h2>
            <p className="text-white/80 max-w-md mb-8 text-base font-medium leading-relaxed">
                {message}
            </p>
            <button
                onClick={onEvaluate}
                className="px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center min-w-[200px] uppercase tracking-wider"
                style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: 'var(--theme-player-page, #071554)', boxShadow: '0 0 30px rgba(var(--theme-secondary-accent-rgb, 191,255,0), 0.3)' }}
            >
                Évaluer mon niveau
            </button>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { updateClubName } from './actions';
import { useRouter } from 'next/navigation';

interface ClubNameChangeFormProps {
    clubId: string;
    initialName: string;
}

export default function ClubNameChangeForm({ clubId, initialName }: ClubNameChangeFormProps) {
    const [name, setName] = useState(initialName);
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        setMessage(null);

        try {
            const result = await updateClubName(clubId, name);
            if (result.success) {
                setMessage({ type: 'success', text: 'Nom du club mis à jour avec succès !' });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: result.error || 'Une erreur est survenue.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Erreur réseau ou serveur.' });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="mb-8 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
            <h3 className="text-sm font-semibold text-yellow-200 mb-2 flex items-center gap-2">
                <span>🔧</span> Option temporaire : Changer le nom du club
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    placeholder="Nouveau nom du club"
                    required
                    disabled={isPending}
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 text-white text-sm font-semibold transition-colors flex-shrink-0"
                >
                    {isPending ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
            </form>
            {message && (
                <p className={`mt-2 text-xs font-medium ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message.text}
                </p>
            )}
        </div>
    );
}

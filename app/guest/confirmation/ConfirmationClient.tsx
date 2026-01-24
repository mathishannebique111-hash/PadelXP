"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, AlertTriangle } from "lucide-react";

interface ConfirmationClientProps {
    guestId: string;
    matchId: string;
    matchStatus: string;
    initialConfirmed: boolean | null; // null = pas répondu, true = confirmé, false = refusé
}

export default function ConfirmationClient({
    guestId,
    matchId,
    matchStatus,
    initialConfirmed
}: ConfirmationClientProps) {
    const router = useRouter();
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [responseType, setResponseType] = useState<"confirmed" | "refused" | null>(
        initialConfirmed === true ? "confirmed" : initialConfirmed === false ? "refused" : null
    );
    const [errorMessage, setErrorMessage] = useState("");

    const handleResponse = async (confirmed: boolean) => {
        setStatus("loading");
        setErrorMessage("");

        try {
            const res = await fetch("/api/guest/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guestId, matchId, confirmed }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Une erreur est survenue");
            }

            setStatus("success");
            setResponseType(confirmed ? "confirmed" : "refused");

            // Refresh pour voir le statut à jour (optionnel)
            router.refresh();

        } catch (err: any) {
            setStatus("error");
            setErrorMessage(err.message);
        }
    };

    if (matchStatus !== "pending" && status !== "success") {
        return (
            <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                    <AlertTriangle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Match déjà traité</h3>
                <p className="text-gray-600">
                    Ce match a déjà été {matchStatus === 'confirmed' ? 'validé' : 'annulé'}.
                    Votre réponse n'est plus nécessaire.
                </p>
            </div>
        );
    }

    if (responseType !== null) {
        return (
            <div className={`text-center p-8 rounded-xl border ${responseType === 'confirmed'
                ? 'bg-green-50 border-green-100'
                : 'bg-red-50 border-red-100'
                }`}>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${responseType === 'confirmed' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                    {responseType === 'confirmed' ? (
                        <Check className="w-8 h-8 text-green-600" />
                    ) : (
                        <X className="w-8 h-8 text-red-600" />
                    )}
                </div>
                <h3 className={`text-xl font-bold mb-2 ${responseType === 'confirmed' ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {responseType === 'confirmed' ? 'Confirmation enregistrée !' : 'Match refusé'}
                </h3>
                <p className={responseType === 'confirmed' ? 'text-green-700' : 'text-red-700'}>
                    {responseType === 'confirmed'
                        ? 'Merci. Si le match est validé par les autres joueurs, vous recevrez peut-être une notification finale.'
                        : 'Votre refus a été pris en compte. Si un autre joueur refuse également, le match sera annulé.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={() => handleResponse(true)}
                    disabled={status === "loading"}
                    className="flex flex-col items-center justify-center p-6 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
                >
                    {status === "loading" ? (
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                    ) : (
                        <Check className="w-8 h-8 mb-3" />
                    )}
                    <span className="text-lg font-bold">Confirmer le match</span>
                    <span className="text-sm opacity-90 mt-1">C'est correct</span>
                </button>

                <button
                    onClick={() => handleResponse(false)}
                    disabled={status === "loading"}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-600 rounded-xl transition-all disabled:opacity-70"
                >
                    {status === "loading" ? (
                        <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mb-2" />
                    ) : (
                        <X className="w-8 h-8 mb-3" />
                    )}
                    <span className="text-lg font-bold">Refuser</span>
                    <span className="text-sm opacity-70 mt-1">Score incorrect ou erreur</span>
                </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
                En confirmant, vous acceptez que ce match apparaisse dans l'historique de PadelXP.
            </p>
        </div>
    );
}

"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { removeMember, deleteGuest, hideVisitor } from "@/app/dashboard/membres/actions";
import { useRouter } from "next/navigation";

interface DeletePlayerButtonProps {
    playerId: string;
    playerType: "member" | "guest" | "visitor";
    playerName: string;
}

export default function DeletePlayerButton({ playerId, playerType, playerName }: DeletePlayerButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        let actionLabel = "";
        let confirmMessage = "";

        switch (playerType) {
            case "member":
                actionLabel = "retirer ce membre du club";
                confirmMessage = `Êtes-vous sûr de vouloir retirer ${playerName} du club ?\n\nLe joueur ne sera plus associé à votre club mais son compte PadelXP restera actif.`;
                break;
            case "guest":
                actionLabel = "supprimer cet invité";
                confirmMessage = `Êtes-vous sûr de vouloir supprimer invité (${playerName}) ?\n\nCette action est irréversible.`;
                break;
            case "visitor":
                actionLabel = "masquer ce visiteur";
                confirmMessage = `Êtes-vous sûr de vouloir masquer ${playerName} de la liste ?\n\nIl ne sera plus visible dans "Joueurs de passage", mais ses matchs resteront dans l'historique global pour préserver les statistiques.`;
                break;
        }

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setIsDeleting(true);
        try {
            if (playerType === "member") {
                await removeMember(playerId);
            } else if (playerType === "visitor") {
                await hideVisitor(playerId);
            } else {
                await deleteGuest(playerId);
            }

            // Pas besoin de router.refresh() ici car les server actions utilisent revalidatePath,
            // mais on peut le garder pour être sûr si l'action ne le faisait pas.
            // revalidatePath dans l'action s'occupe de la mise à jour des données.
        } catch (error) {
            console.error("Erreur suppression:", error);
            alert(error instanceof Error ? error.message : "Une erreur est survenue");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-red-300/70 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
            title={playerType === "member" ? "Retirer du club" : playerType === "visitor" ? "Masquer de la liste" : "Supprimer"}
        >
            {isDeleting ? (
                <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <Trash2 size={16} />
            )}
        </button>
    );
}

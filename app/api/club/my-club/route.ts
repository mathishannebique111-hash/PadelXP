import { NextResponse } from "next/server";
import { getUserClubId } from "@/lib/utils/club-utils";

export async function GET() {
    try {
        const clubId = await getUserClubId();
        
        if (!clubId) {
            return NextResponse.json({ error: "Aucun club trouvé pour cet utilisateur" }, { status: 404 });
        }

        return NextResponse.json({ clubId });
    } catch (error) {
        console.error("[api/club/my-club] Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

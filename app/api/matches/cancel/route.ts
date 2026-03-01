import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function POST(req: Request) {
    try {
        const { matchId } = await req.json();

        if (!matchId) {
            return NextResponse.json({ error: "matchId requis" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch (error) {
                            // Ignorer
                        }
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // 1. Vérifier le match et son statut
        const { data: match, error: matchError } = await supabaseAdmin
            .from("matches")
            .select("status")
            .eq("id", matchId)
            .single();

        if (matchError || !match) {
            return NextResponse.json({ error: "Match non trouvé" }, { status: 404 });
        }

        if (match.status !== 'pending') {
            return NextResponse.json({ error: "Impossible d'annuler un match déjà validé ou rejeté" }, { status: 400 });
        }

        // 2. Vérifier que l'utilisateur est bien celui qui a créé le match
        // (Le créateur est le premier à avoir une confirmation enregistrée)
        const { data: confirmations, error: confError } = await supabaseAdmin
            .from("match_confirmations")
            .select("user_id, created_at")
            .eq("match_id", matchId)
            .order("created_at", { ascending: true })
            .limit(1);

        if (confError || !confirmations || confirmations.length === 0) {
            return NextResponse.json({ error: "Créateur non identifié" }, { status: 400 });
        }

        if (confirmations[0].user_id !== user.id) {
            return NextResponse.json({ error: "Seul le créateur du match peut l'annuler" }, { status: 403 });
        }

        // 3. Supprimer le match et ses dépendances
        // (On le fait séquentiellement pour être propre même sans cascades parfaites)
        await supabaseAdmin.from("match_confirmations").delete().eq("match_id", matchId);
        await supabaseAdmin.from("match_participants").delete().eq("match_id", matchId);

        // Supprimer les notifications liées
        await supabaseAdmin.from("notifications").delete().filter("data->>match_id", "eq", matchId);

        const { error: deleteError } = await supabaseAdmin
            .from("matches")
            .delete()
            .eq("id", matchId);

        if (deleteError) {
            logger.error("Error deleting match", { matchId, error: deleteError.message });
            return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
        }

        logger.info("Match cancelled successfully", { matchId, userId: user.id });

        return NextResponse.json({ success: true, message: "Match annulé avec succès" });

    } catch (error) {
        logger.error("Unexpected error in match cancellation", { error: (error as Error).message });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

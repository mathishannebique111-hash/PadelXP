import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { password } = await req.json();
    const email = "contactpadelxp@gmail.com";

    if (!password || password.length < 6) {
        return NextResponse.json(
            { error: "Le mot de passe doit contenir au moins 6 caractères" },
            { status: 400 }
        );
    }

    try {
        // 1. Créer le user Auth
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                first_name: "Admin",
                last_name: "PadelXP",
            },
        });

        if (createError) throw createError;
        if (!user) throw new Error("Erreur lors de la création de l'utilisateur");

        // 2. Forcer les droits admin et l'onboarding dans profiles
        // Note: Le trigger 'handle_admin_restoration' devrait déjà avoir fait le travail pour is_admin
        // mais on assure le coup ici.
        const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
                id: user.id,
                email: email,
                first_name: "Admin",
                last_name: "PadelXP",
                is_admin: true,
                has_completed_onboarding: true,
                onboarding_step: 4,
                role: "admin",
            });

        if (profileError) {
            console.error("Profile update error:", profileError);
            // On ne bloque pas si le profil plante, car le trigger SQL est la sécurité principale
        }

        return NextResponse.json({ success: true, userId: user.id });
    } catch (err: any) {
        console.error("Admin create error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

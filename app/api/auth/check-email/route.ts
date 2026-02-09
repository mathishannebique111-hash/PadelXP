import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // Utiliser listUsers pour chercher l'email (plus fiable que getUserById si on a que l'email et qu'on est admin)
        // Note: listUsers est limité à 50 par défaut, mais on peut filtrer ?
        // Non, listUsers ne filtre pas par email directement facilement dans toutes les versions.
        // Mais on peut utiliser `admin.listUsers()` qui est paginé.
        // Mieux : admin.generateLink type "magiclink" qui renvoie une erreur si user not found ? Non dangereux.

        // La méthode propre : admin.listUsers() ne permet pas de filtrer par email dans toutes les versions JS.
        // Mais on peut utiliser le hack de tenter de récupérer le user par email ? NON, pas de méthode getUserByEmail dans admin api public.

        // Si on ne peut pas filter, on peut utiliser rpc si on a une fonction postgres.
        // Sinon, on peut utiliser `from('profiles').select('id').eq('email', email)` si profiles est sync.
        // Le user veut savoir si un COMPTE (Auth) existe.

        // Solution : utiliser `supabaseAdmin.rpc('check_email_exists', { email })` si on avait la fonction.
        // Sinon, essayer de créer un user avec un mdp bidon et voir si ça fail ? Non side effect.

        // Allons au plus simple : on suppose que la table `profiles` est synchronisée avec `auth.users` via trigger (classique Supabase).
        // Donc on check la table profiles.

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (profile) {
            return NextResponse.json({ exists: true });
        }

        // Si pas dans profiles, il pourrait être dans auth.users mais pas profiles (bug sync).
        // Essayons quand même de voir si on peut le trouver dans auth via listUsers (très inefficace si beaucoup de users).
        // Heureusement `supabase.auth.admin.listUsers` n'est pas fait pour la recherche.

        // ATTENTION: Si on a accès à la base de données directement via le service role, on peut requêter auth.users ?
        // Non, via l'API Data, on ne peut pas requêter le schéma auth par défaut.

        // ALORS : On va assumer que `profiles` est la source de vérité pour l'application "PadelXP".
        // Si un user est dans auth mais pas dans profiles, il est "cassé" pour l'app de toute façon.

        return NextResponse.json({ exists: false });

    } catch (error) {
        console.error("Check email error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

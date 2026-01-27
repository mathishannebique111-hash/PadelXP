import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const email = "contactpadelxp@gmail.com";

    try {
        // Liste les utilisateurs pour voir si l'email existe
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const adminUser = users.find((u) => u.email === email);

        return NextResponse.json({ exists: !!adminUser });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

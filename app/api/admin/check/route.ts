import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const email = "contactpadelxp@gmail.com";

    try {
        let adminUser = null;
        let page = 1;

        // Loop through all pages to ensure we find the admin user even if there are >50 users
        while (true) {
            const { data: { users }, error } = await supabase.auth.admin.listUsers({
                page,
                perPage: 1000
            });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (!users || users.length === 0) break;

            const found = users.find((u) => u.email === email);
            if (found) {
                adminUser = found;
                break;
            }

            page++;
        }

        return NextResponse.json({ exists: !!adminUser });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

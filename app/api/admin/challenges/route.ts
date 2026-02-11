import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "challenges";
const GLOBAL_KEY = "__global__/challenges.json";

interface Challenge {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    objective: string;
    reward: string;
    created_at: string;
    is_global: true;
}

/**
 * GET /api/admin/challenges — List all global challenges
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isAdmin(user.email)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await serviceClient.storage
            .from(BUCKET)
            .download(GLOBAL_KEY);

        if (error || !data) {
            // No file yet → empty list
            return NextResponse.json({ challenges: [] });
        }

        const text = await data.text();
        const challenges: Challenge[] = JSON.parse(text);
        return NextResponse.json({ challenges });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/admin/challenges — Create a global challenge
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isAdmin(user.email)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, start_date, end_date, objective, reward } = body;

        if (!name || !start_date || !end_date || !objective || !reward) {
            return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
        }

        const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Load existing
        let challenges: Challenge[] = [];
        const { data: existing } = await serviceClient.storage
            .from(BUCKET)
            .download(GLOBAL_KEY);

        if (existing) {
            try {
                const text = await existing.text();
                challenges = JSON.parse(text);
            } catch { }
        }

        // Create new challenge
        const newChallenge: Challenge = {
            id: crypto.randomUUID(),
            name: name.trim(),
            start_date,
            end_date,
            objective: objective.trim(),
            reward: reward.trim(),
            created_at: new Date().toISOString(),
            is_global: true,
        };

        challenges.push(newChallenge);

        // Save
        const blob = new Blob([JSON.stringify(challenges, null, 2)], {
            type: "application/json",
        });
        const { error: uploadError } = await serviceClient.storage
            .from(BUCKET)
            .upload(GLOBAL_KEY, blob, { upsert: true, contentType: "application/json" });

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        return NextResponse.json({ challenge: newChallenge, ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/challenges — Delete a global challenge by id
 */
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isAdmin(user.email)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const challengeId = searchParams.get("id");
        if (!challengeId) {
            return NextResponse.json({ error: "ID requis" }, { status: 400 });
        }

        const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        let challenges: Challenge[] = [];
        const { data: existing } = await serviceClient.storage
            .from(BUCKET)
            .download(GLOBAL_KEY);

        if (existing) {
            try {
                const text = await existing.text();
                challenges = JSON.parse(text);
            } catch { }
        }

        const filtered = challenges.filter((c) => c.id !== challengeId);
        if (filtered.length === challenges.length) {
            return NextResponse.json({ error: "Challenge non trouvé" }, { status: 404 });
        }

        const blob = new Blob([JSON.stringify(filtered, null, 2)], {
            type: "application/json",
        });
        await serviceClient.storage
            .from(BUCKET)
            .upload(GLOBAL_KEY, blob, { upsert: true, contentType: "application/json" });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
    }
}

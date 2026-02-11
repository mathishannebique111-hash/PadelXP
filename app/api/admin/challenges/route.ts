import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "challenges";
const GLOBAL_KEY = "__global__/challenges.json";

// Validation Schema (Same as Club API)
const challengeSchema = z.object({
    name: z.string().trim().min(1, "Le titre est requis").max(100, "Le titre est trop long"),
    objective: z.string().trim().min(1, "L'objectif est requis").max(500, "L'objectif est trop long"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
    rewardType: z.enum(["points", "badge"], { errorMap: () => ({ message: "Type de récompense invalide" }) }),
    rewardLabel: z.string().trim().min(1, "Le label de récompense est requis").max(50, "Le label est trop long"),
}).refine(
    (data) => {
        const start = new Date(data.startDate + "T00:00:00.000Z");
        const end = new Date(data.endDate + "T23:59:59.999Z");
        return end >= start;
    },
    { message: "La date de fin doit être postérieure ou égale à la date de début", path: ["endDate"] }
);

interface Challenge {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    objective: string;
    reward_type: "points" | "badge";
    reward_label: string;
    created_at: string;
    is_global: true;
}

// Ensure bucket exists
async function ensureBucket(client: any) {
    try {
        await client.storage.createBucket(BUCKET, {
            public: false,
            fileSizeLimit: 1024 * 1024,
            allowedMimeTypes: ["application/json"],
        });
    } catch (error: any) {
        // Ignore if already exists
    }
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

        await ensureBucket(serviceClient);

        const { data, error } = await serviceClient.storage
            .from(BUCKET)
            .download(GLOBAL_KEY);

        if (error || !data) {
            return NextResponse.json({ challenges: [] });
        }

        const text = await data.text();
        let challenges: Challenge[] = [];
        try {
            challenges = JSON.parse(text);
        } catch { }

        const mappedChallenges = challenges.map(c => ({
            id: c.id,
            title: c.title || (c as any).name, // Handle legacy 'name' field
            startDate: c.start_date,
            endDate: c.end_date,
            objective: c.objective,
            rewardType: c.reward_type || (c as any).reward ? "points" : "points", // Legacy fallback
            rewardLabel: c.reward_label || (c as any).reward || "",
            createdAt: c.created_at,
            status: (() => {
                const now = new Date();
                const start = new Date(c.start_date);
                const end = new Date(c.end_date);
                if (now < start) return "upcoming";
                if (now > end) return "completed";
                return "active";
            })(),
            isGlobal: true
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ challenges: mappedChallenges });
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

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = challengeSchema.safeParse(body);
        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors;
            const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";
            return NextResponse.json({ error: firstError, details: fieldErrors }, { status: 400 });
        }

        const payload = parsed.data;

        const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        await ensureBucket(serviceClient);

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
            id: randomUUID(),
            title: payload.name,
            start_date: payload.startDate,
            end_date: payload.endDate,
            objective: payload.objective,
            reward_type: payload.rewardType as any,
            reward_label: payload.rewardLabel,
            created_at: new Date().toISOString(),
            is_global: true,
        };

        challenges.push(newChallenge);

        // Save
        const blob = new Blob([JSON.stringify(challenges, null, 2)], {
            type: "application/json",
        });

        await serviceClient.storage
            .from(BUCKET)
            .upload(GLOBAL_KEY, blob, { upsert: true, contentType: "application/json" });

        return NextResponse.json({
            challenge: {
                id: newChallenge.id,
                title: newChallenge.title,
                startDate: newChallenge.start_date,
                endDate: newChallenge.end_date,
                objective: newChallenge.objective,
                rewardType: newChallenge.reward_type,
                rewardLabel: newChallenge.reward_label,
                createdAt: newChallenge.created_at,
                status: "upcoming" // Simply default to upcoming/active based on dates, frontend handles logic
            },
            ok: true
        });
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

        // Save even if empty
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

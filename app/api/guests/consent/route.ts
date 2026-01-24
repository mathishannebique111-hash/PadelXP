import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

const consentSchema = z.object({
    guestId: z.string().uuid(),
    consent: z.boolean(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = consentSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid data", details: parsed.error.format() },
                { status: 400 }
            );
        }

        const { guestId, consent } = parsed.data;

        // Verify guest exists
        const { data: guest, error: fetchError } = await supabaseAdmin
            .from("guest_players")
            .select("id")
            .eq("id", guestId)
            .single();

        if (fetchError || !guest) {
            return NextResponse.json({ error: "Guest not found" }, { status: 404 });
        }

        // Update consent and mark as confirmed
        const { error: updateError } = await supabaseAdmin
            .from("guest_players")
            .update({
                marketing_consent: consent,
                confirmed_at: new Date().toISOString()
            })
            .eq("id", guestId);

        if (updateError) {
            return NextResponse.json(
                { error: "Failed to update consent" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

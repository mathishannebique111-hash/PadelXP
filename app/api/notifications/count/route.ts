import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

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

export async function GET(req: Request) {
    try {
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
                            // Ignore
                        }
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ total: 0, matches: 0, invitations: 0, notifications: 0 });
        }

        // 1. Count Pending Matches (Participant & Status Pending)
        // We reuse the logic from pending/route.ts but simplified for count
        const { data: participations } = await supabaseAdmin
            .from("match_participants")
            .select("match_id")
            .eq("user_id", user.id)
            .eq("player_type", "user");

        let matchesCount = 0;
        if (participations && participations.length > 0) {
            const matchIds = participations.map(p => p.match_id);
            const { count } = await supabaseAdmin
                .from("matches")
                .select("id", { count: 'exact', head: true })
                .in("id", matchIds)
                .eq("status", "pending");
            matchesCount = count || 0;
        }

        // 2. Count Pending Invitations (Received & Pending)
        const { count: invitationsCount } = await supabaseAdmin
            .from("match_invitations")
            .select("id", { count: 'exact', head: true })
            .eq("receiver_id", user.id)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString());

        // 3. Count Unread Notifications
        const { count: notificationsCount } = await supabaseAdmin
            .from("notifications")
            .select("id", { count: 'exact', head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        const total = matchesCount + (invitationsCount || 0) + (notificationsCount || 0);

        return NextResponse.json({
            total,
            matches: matchesCount,
            invitations: invitationsCount || 0,
            notifications: notificationsCount || 0
        });

    } catch (error) {
        console.error("Error fetching notification counts:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

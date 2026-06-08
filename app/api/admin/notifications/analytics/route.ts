import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  try {
    // Auth check
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
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin && !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const clubId = searchParams.get("clubId");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get all notifications in the period
    let query = supabaseAdmin
      .from("notifications")
      .select("id, user_id, type, is_read, clicked_at, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    const { data: notifications, error } = await query;
    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user profiles for display
    const userIds = [...new Set((notifications || []).map((n: any) => n.user_id))];

    let profiles: any[] = [];
    if (userIds.length > 0) {
      // Filter by club if specified
      let profileQuery = supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, club_id")
        .in("id", userIds);

      if (clubId) {
        profileQuery = profileQuery.eq("club_id", clubId);
      }

      const { data: profilesData } = await profileQuery;
      profiles = profilesData || [];
    }

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const filteredUserIds = new Set(profiles.map((p: any) => p.id));

    // Filter notifications to only include users from selected club
    const filteredNotifications = clubId
      ? (notifications || []).filter((n: any) => filteredUserIds.has(n.user_id))
      : notifications || [];

    // Per-player stats
    const playerStats = new Map<string, { sent: number; read: number; clicked: number }>();
    for (const n of filteredNotifications) {
      if (!playerStats.has(n.user_id)) {
        playerStats.set(n.user_id, { sent: 0, read: 0, clicked: 0 });
      }
      const stats = playerStats.get(n.user_id)!;
      stats.sent++;
      if (n.is_read) stats.read++;
      if (n.clicked_at) stats.clicked++;
    }

    const playerStatsArray = Array.from(playerStats.entries())
      .map(([userId, stats]) => {
        const profile = profileMap.get(userId);
        return {
          userId,
          fullName: profile?.full_name || "Inconnu",
          email: profile?.email || "",
          clubId: profile?.club_id || null,
          ...stats,
          openRate: stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0,
        };
      })
      .sort((a, b) => b.sent - a.sent);

    // Per-type stats
    const typeStats = new Map<string, { sent: number; read: number; clicked: number }>();
    for (const n of filteredNotifications) {
      if (!typeStats.has(n.type)) {
        typeStats.set(n.type, { sent: 0, read: 0, clicked: 0 });
      }
      const stats = typeStats.get(n.type)!;
      stats.sent++;
      if (n.is_read) stats.read++;
      if (n.clicked_at) stats.clicked++;
    }

    const typeStatsArray = Array.from(typeStats.entries())
      .map(([type, stats]) => ({
        type,
        ...stats,
        openRate: stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0,
      }))
      .sort((a, b) => b.sent - a.sent);

    // Daily stats for chart
    const dailyStats = new Map<string, { sent: number; clicked: number }>();
    for (const n of filteredNotifications) {
      const day = n.created_at.split("T")[0];
      if (!dailyStats.has(day)) {
        dailyStats.set(day, { sent: 0, clicked: 0 });
      }
      const stats = dailyStats.get(day)!;
      stats.sent++;
      if (n.clicked_at) stats.clicked++;
    }

    const dailyStatsArray = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        ...stats,
        openRate: stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Overall stats
    const totalSent = filteredNotifications.length;
    const totalRead = filteredNotifications.filter((n: any) => n.is_read).length;
    const totalClicked = filteredNotifications.filter((n: any) => n.clicked_at).length;

    // Get clubs for filter
    const { data: clubs } = await supabaseAdmin
      .from("clubs")
      .select("id, name")
      .order("name");

    return NextResponse.json({
      overview: {
        totalSent,
        totalRead,
        totalClicked,
        readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
        uniqueUsers: filteredUserIds.size || playerStats.size,
      },
      playerStats: playerStatsArray,
      typeStats: typeStatsArray,
      dailyStats: dailyStatsArray,
      clubs: clubs || [],
    });
  } catch (error) {
    console.error("Error in notification analytics:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

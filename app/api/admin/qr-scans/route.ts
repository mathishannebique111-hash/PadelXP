import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = "force-dynamic";

// GET: nombre total réel de scans du QR code de téléchargement (admin uniquement).
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Même logique d'autorisation que le layout admin : email admin OU profiles.is_admin.
    let allowed = isAdmin(user.email);
    if (!allowed) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      allowed = !!profile?.is_admin;
    }
    if (!allowed) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { count, error } = await supabaseAdmin
      .from("qr_scans")
      .select("*", { count: "exact", head: true })
      .eq("source", "download");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

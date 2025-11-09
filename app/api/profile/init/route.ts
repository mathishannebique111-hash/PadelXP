import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn("[api/profile/init] Missing Supabase service configuration");
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = null as any;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data, error } = await serviceClient.auth.getUser(token);
    if (error || !data?.user) {
      console.error("[api/profile/init] bearer auth error", error);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    user = data.user;
  } else {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser();
    if (!cookieUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    user = cookieUser;
  }

  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.email ? user.email.split("@")[0] : "Joueur");

  const { data: existing, error } = await serviceClient
    .from("profiles")
    .select("id, club_id, club_slug, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[api/profile/init] fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing) {
    if (!existing.display_name) {
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({ display_name: fullName })
        .eq("id", user.id);
      if (updateError) {
        console.warn("[api/profile/init] update display_name warning", updateError);
      }
    }
    return NextResponse.json({ ok: true, profile: { ...existing, display_name: existing.display_name || fullName } });
  }

  const insertPayload = {
    id: user.id,
    email: user.email,
    display_name: fullName,
  };

  const { data: inserted, error: insertError } = await serviceClient
    .from("profiles")
    .insert(insertPayload)
    .select("id, club_id, club_slug, display_name")
    .maybeSingle();

  if (insertError) {
    console.error("[api/profile/init] insert error", insertError);
    return NextResponse.json({ error: insertError.message, code: insertError.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: inserted });
}

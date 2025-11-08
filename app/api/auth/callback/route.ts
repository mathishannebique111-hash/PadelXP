import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { event, session } = await request.json();

    if (event === "SIGNED_OUT") {
      const supabase = createRouteHandlerClient({ cookies });
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true });
    }

    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      const supabase = createRouteHandlerClient({ cookies });
      await supabase.auth.setSession(session);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[auth/callback] error", error);
    return NextResponse.json({ error: error?.message || "Failed to handle auth callback" }, { status: 400 });
  }
}

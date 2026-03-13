import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { event, session } = await request.json();

    if (event === "SIGNED_OUT") {
      const supabase = await createClient();
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true });
    }

    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      const supabase = await createClient();
      await supabase.auth.setSession(session);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error("[auth/callback] error", { error: error?.message || String(error), stack: error?.stack });
    return NextResponse.json({ error: error?.message || "Failed to handle auth callback" }, { status: 400 });
  }
}

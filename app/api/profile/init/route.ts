import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.email ? user.email.split("@")[0] : "Joueur");

  // Check if profile exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // Ensure display name is set
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: fullName })
      .eq("id", user.id);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message, code: updateError.code }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name: fullName })
    .select()
    .single();

  if (insertError) {
    // Si le profil existe déjà (race condition), c'est OK
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, message: "Profile already exists" });
    }
    return NextResponse.json({ 
      error: insertError.message, 
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

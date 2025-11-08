import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";

const createGuestSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createGuestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { first_name, last_name } = parsed.data;

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Utiliser service_role pour créer le guest (bypass RLS si nécessaire)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Configuration manquante" },
      { status: 500 }
    );
  }

  const serviceSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Vérifier si un guest avec ce nom existe déjà (sans notion de ligue)
  const { data: existingGuest } = await serviceSupabase
    .from("guest_players")
    .select("id, first_name, last_name")
    .eq("first_name", first_name.trim())
    .eq("last_name", last_name.trim())
    .maybeSingle();

  if (existingGuest) {
    return NextResponse.json({
      id: existingGuest.id,
      first_name: existingGuest.first_name,
      last_name: existingGuest.last_name,
    });
  }

  // Créer le nouveau guest
  const insertData = {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
  };

  const { data: newGuest, error: insertError } = await serviceSupabase
    .from("guest_players")
    .insert(insertData)
    .select("id, first_name, last_name")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: `Erreur lors de la création du joueur invité: ${insertError.message}`, details: insertError.message, code: insertError.code },
      { status: 400 }
    );
  }

  if (!newGuest) {
    return NextResponse.json(
      { error: "Le joueur invité n'a pas pu être créé" },
      { status: 500 }
    );
  }

  return NextResponse.json(newGuest);
}


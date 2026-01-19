import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";
import { capitalizeFullName } from "@/lib/utils/name-utils";

/**
 * Schéma de création d'un guest : prénom/nom obligatoires, trim automatique, 60 caractères max.
 */
const createGuestSchema = z.object({
  first_name: z.string().trim().min(1, "Le prénom est requis").max(60, "Le prénom est trop long"),
  last_name: z.string().trim().min(1, "Le nom est requis").max(60, "Le nom est trop long"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
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

  const { first_name: rawFirstName, last_name: rawLastName, email } = parsed.data;

  // Capitaliser automatiquement le prénom et le nom
  const { firstName, lastName } = capitalizeFullName(rawFirstName, rawLastName);

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
  // Si un email est fourni, on vérifie aussi par email
  let existingGuestQuery = serviceSupabase
    .from("guest_players")
    .select("id, first_name, last_name, email")
    .eq("first_name", firstName)
    .eq("last_name", lastName);

  const { data: existingGuestByName } = await existingGuestQuery.maybeSingle();

  let existingGuest = existingGuestByName;

  // Si pas trouvé par nom mais email fourni, vérifier l'email
  if (!existingGuest && email) {
    const { data: existingGuestByEmail } = await serviceSupabase
      .from("guest_players")
      .select("id, first_name, last_name, email")
      .eq("email", email)
      .maybeSingle();

    if (existingGuestByEmail) {
      existingGuest = existingGuestByEmail;
    }
  }

  if (existingGuest) {
    // Si le guest existe mais n'a pas d'email et qu'on en fournit un, on pourrait le mettre à jour...
    // Pour l'instant on renvoie juste l'existant
    return NextResponse.json({
      id: existingGuest.id,
      first_name: existingGuest.first_name,
      last_name: existingGuest.last_name,
      email: existingGuest.email
    });
  }

  // Créer le nouveau guest avec les noms capitalisés
  const insertData = {
    first_name: firstName,
    last_name: lastName,
    email: email || null,
    invited_by_user_id: user.id
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


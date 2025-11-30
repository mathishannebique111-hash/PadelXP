import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { signupRateLimit, getClientIP, checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ClubSignupSchema = z.object({
  email: z.string().email("Email invalide").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().trim().min(1, "Le prénom est requis"),
  lastName: z.string().trim().min(1, "Le nom est requis"),
});

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Serveur mal configuré" },
        { status: 500 }
      );
    }

    // 🔒 Rate limiting par IP (3 inscriptions / heure)
    const ip = getClientIP(req);
    const rl = await checkRateLimit(signupRateLimit, `signup:${ip}`);

    if (!rl.success) {
      return NextResponse.json(
        {
          error:
            "Trop de tentatives d'inscription depuis votre adresse IP. Merci de réessayer plus tard.",
        },
        {
          status: 429,
          headers: {
            ...(rl.limit !== undefined
              ? { "X-RateLimit-Limit": String(rl.limit) }
              : {}),
            ...(rl.remaining !== undefined
              ? { "X-RateLimit-Remaining": String(rl.remaining) }
              : {}),
            ...(rl.reset !== undefined
              ? { "X-RateLimit-Reset": String(rl.reset) }
              : {}),
          },
        }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();

    // Validation Zod
    const parsed = ClubSignupSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors).flat()[0] ??
        "Champs requis manquants";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password, firstName, lastName } = parsed.data;

    const fullName = `${firstName} ${lastName}`.trim();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        role: "owner",
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes("already registered")) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cet email" },
          { status: 409 }
        );
      }
      logger.error({ email: email.substring(0, 5) + "…", error }, "[clubs/signup] createUser error");
      return NextResponse.json(
        { error: error.message || "Impossible de créer le compte" },
        { status: 500 }
      );
    }

    if (!data?.user) {
      return NextResponse.json(
        { error: "Création du compte incomplète" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    logger.error({ error: err }, "[clubs/signup] unexpected error");
    return NextResponse.json(
      { error: err?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

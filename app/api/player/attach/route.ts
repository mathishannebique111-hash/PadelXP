import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { capitalizeFullName } from "@/lib/utils/name-utils";
import { processReferralCode } from "@/lib/utils/referral-utils";
import { logger } from "@/lib/logger";
import slugify from "slugify";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const nameRegex = /^[a-zA-Z0-9À-ÿ\s\-']+$/;

/**
 * Schéma d'attachement joueur : slug/code obligatoires, identités optionnelles mais nettoyées.
 */
const playerAttachSchema = z.object({
  slug: z.string().trim().min(1, "Slug requis"),
  code: z.string().trim().min(1, "Code requis"),
  firstName: z
    .string()
    .trim()
    .min(1, "Prénom requis")
    .max(100, "Prénom trop long")
    .regex(nameRegex, "Prénom invalide")
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "Nom requis")
    .max(100, "Nom trop long")
    .regex(nameRegex, "Nom invalide")
    .optional(),
  displayName: z
    .string()
    .trim()
    .min(1, "Nom d'affichage requis")
    .max(100, "Nom d'affichage trop long")
    .regex(nameRegex, "Nom d'affichage invalide")
    .optional(),
  email: z.string().trim().email("Email invalide").transform((value) => value.toLowerCase()).optional(),
  referralCode: z.string().trim().max(50).optional(),
});

export async function POST(req: Request) {
  try {
    if (!SERVICE_ROLE_KEY) {
      logger.error("[player/attach] Missing SUPABASE_SERVICE_ROLE_KEY env var", {});
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const parsedBody = playerAttachSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    let { slug, code, firstName, lastName, displayName, email, referralCode } = parsedBody.data;

    slug = String(slug).trim();
    code = String(code).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");

    const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Identifier l'utilisateur via le header Authorization (access token) ou via les cookies
    let user = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      if (tokenError) {
        logger.error("[player/attach] Token lookup error", { error: tokenError });
      } else {
        user = tokenData?.user ?? null;
      }
    }

    if (!user) {
      const supabase = await createClient();
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      user = cookieUser ?? null;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, slug, code_invitation, status")
      .eq("slug", slug)
      .single();

    if (clubError || !club) {
      logger.error("[player/attach] Club lookup error", { slug, error: clubError });
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    if (club.status !== "active") {
      return NextResponse.json({ error: "Club inactif" }, { status: 403 });
    }

    const expectedCode = String(club.code_invitation || "").trim().toUpperCase();
    if (!expectedCode || code !== expectedCode) {
      return NextResponse.json({ error: "Code d’invitation incorrect" }, { status: 403 });
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, email, username, referral_code")
      .eq("id", user.id)
      .maybeSingle();

    // Récupérer les valeurs brutes
    const rawDisplayName = (displayName || existingProfile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Joueur").trim();
    const rawFirst = (firstName || existingProfile?.first_name || user.user_metadata?.first_name || rawDisplayName.split(' ')[0] || "").trim();
    const rawLast = (lastName || existingProfile?.last_name || user.user_metadata?.last_name || rawDisplayName.split(' ').slice(1).join(' ') || "").trim();

    // Capitaliser automatiquement le prénom et le nom
    const { firstName: normalizedFirst, lastName: normalizedLast } = capitalizeFullName(rawFirst, rawLast);
    const normalizedEmail = email || existingProfile?.email || user.email || null;

    // Reconstruire le display_name avec les noms capitalisés
    const finalDisplayName = normalizedFirst && normalizedLast
      ? `${normalizedFirst} ${normalizedLast}`.trim()
      : normalizedFirst || normalizedLast || rawDisplayName;

    // Vérifier si le profil existe déjà pour savoir si on doit générer un code de parrainage
    const shouldGenerateReferralCode = !existingProfile;

    const upsertPayload = {
      id: user.id,
      display_name: finalDisplayName,
      first_name: normalizedFirst || null,
      last_name: normalizedLast || null,
      email: normalizedEmail,
      club_id: club.id,
      club_slug: club.slug,
      // Le code de parrainage sera généré automatiquement par le trigger SQL si null
      referral_code: existingProfile?.referral_code || null,
      // Username : conserver s'il existe, sinon on le générera
      username: existingProfile?.username || null,
    };

    // Génération du username si nécessaire
    if (!upsertPayload.username) {
      const cleanFirst = slugify(normalizedFirst || "Joueur", { lower: false, strict: true });
      const cleanLastInitial = (normalizedLast || "").charAt(0).toUpperCase();
      let baseUsername = `@${cleanFirst}${cleanLastInitial}`;

      // Vérifier si le username existe déjà
      const { data: existingUser } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", baseUsername)
        .maybeSingle();

      if (existingUser && existingUser.id !== user.id) {
        // En cas de collision, ajouter un suffixe aléatoire
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        baseUsername = `${baseUsername}_${randomSuffix}`;
      }

      upsertPayload.username = baseUsername;
    }

    let upsertedProfile = null;
    let upsertError = null;

    // Première tentative d'upsert
    const upsertResult = await supabaseAdmin
      .from("profiles")
      .upsert(upsertPayload, { onConflict: "id" })
      .select("id, club_id, club_slug")
      .single();

    upsertedProfile = upsertResult.data;
    upsertError = upsertResult.error;

    // Si erreur liée au code de parrainage (contrainte unique), réessayer
    if (upsertError && (upsertError.code === "23505" || upsertError.message?.includes("referral_code"))) {
      logger.warn({ userId: user.id.substring(0, 8) + "…", clubId: club.id.substring(0, 8) + "…" }, "[player/attach] Referral code conflict, retrying with null code to trigger regeneration...");
      const retryPayload = {
        ...upsertPayload,
        referral_code: null, // Laisser le trigger générer un nouveau code
      };
      const retryResult = await supabaseAdmin
        .from("profiles")
        .upsert(retryPayload, { onConflict: "id" })
        .select("id, club_id, club_slug")
        .single();

      if (retryResult.error || !retryResult.data) {
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: club.id.substring(0, 8) + "…", error: retryResult.error }, "[player/attach] Retry upsert error");
        return NextResponse.json({
          error: "Erreur lors de la création du profil. Veuillez réessayer ou contacter le support."
        }, { status: 500 });
      }

      upsertedProfile = retryResult.data;
      upsertError = null;
    }

    if (upsertError || !upsertedProfile) {
      logger.error("[player/attach] Upsert error", { userId: user.id.substring(0, 8) + "…", clubId: club.id.substring(0, 8) + "…", error: upsertError });
      return NextResponse.json({
        error: upsertError?.message || "Impossible d'attacher le club. Veuillez réessayer ou contacter le support."
      }, { status: 400 });
    }

    // 2. CRÉER / METTRE À JOUR L'ENTRÉE DANS user_clubs
    const { error: userClubError } = await supabaseAdmin
      .from("user_clubs")
      .upsert({
        user_id: user.id,
        club_id: club.id,
        role: 'principal', // Par défaut lors de l'inscription/attachement via ce flow
        club_points: 0, // Initialement 0 pour un nouveau club
      }, { onConflict: 'user_id, club_id' });

    if (userClubError) {
      logger.error("[player/attach] user_clubs upsert error", { userId: user.id, clubId: club.id, error: userClubError });
      // On ne bloque pas si ça échoue, mais on loggue
    }

    // Traiter le code de parrainage si fourni
    let referralResult = null;
    if (referralCode && referralCode.trim().length > 0) {
      try {
        referralResult = await processReferralCode(referralCode.trim(), user.id);
        if (!referralResult.success) {
          logger.warn("[player/attach] Referral code processing failed", { userId: user.id.substring(0, 8) + "…", referralCode: referralCode.substring(0, 5) + "…", error: referralResult.error });
          // Ne pas échouer l'inscription si le code de parrainage échoue
          // On retourne quand même un succès mais avec un avertissement
        }
      } catch (referralError) {
        logger.error("[player/attach] Referral code processing error", { userId: user.id.substring(0, 8) + "…", referralCode: referralCode.substring(0, 5) + "…", error: referralError });
        // Ne pas échouer l'inscription si le code de parrainage échoue
      }
    }

    return NextResponse.json({
      ok: true,
      referralProcessed: referralResult?.success || false,
      referralError: referralResult?.error || null,
    });
  } catch (e) {
    logger.error("[player/attach] Unexpected error", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}



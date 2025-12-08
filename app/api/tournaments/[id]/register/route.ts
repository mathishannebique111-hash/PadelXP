import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Lire et valider rapidement le body
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body facultatif, mais on forcera les champs obligatoires ci-dessous
    }

    const player_first_name = (body?.player_first_name ?? "").toString().trim();
    const player_last_name = (body?.player_last_name ?? "").toString().trim();
    const player_license = (body?.player_license ?? "").toString().trim();
    const player_rank = body?.player_rank ? parseInt(body.player_rank, 10) : null;
    const partner_first_name = (body?.partner_first_name ?? "").toString().trim();
    const partner_last_name = (body?.partner_last_name ?? "").toString().trim();
    const partner_license = (body?.partner_license ?? "").toString().trim();
    const partner_rank = body?.partner_rank ? parseInt(body.partner_rank, 10) : null;

    if (!player_first_name || !player_last_name || !player_license || !partner_first_name || !partner_last_name || !partner_license || !player_rank || !partner_rank) {
      return NextResponse.json(
        { error: "Merci de remplir toutes les informations obligatoires, y compris les classements nationaux." },
        { status: 400 }
      );
    }

    // Construire les noms complets dès maintenant pour pouvoir les utiliser partout
    const player1_name = `${player_first_name} ${player_last_name}`.trim();
    const partner_name = `${partner_first_name} ${partner_last_name}`.trim();

    if (isNaN(player_rank) || isNaN(partner_rank) || player_rank <= 0 || partner_rank <= 0) {
      return NextResponse.json(
        { error: "Les classements nationaux doivent être des nombres positifs." },
        { status: 400 }
      );
    }

    // Récupérer le profil joueur avec le client admin (bypass RLS)
    // Un utilisateur connecté DOIT avoir un profil
    if (!supabaseAdmin) {
      logger.error(
        {
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SERVICE_ROLE_KEY,
        },
        "[tournaments/register] Supabase admin client not configured"
      );
      return NextResponse.json(
        { error: "Service d'inscription non disponible" },
        { status: 500 }
      );
    }

    // Vérifier que le profil existe et récupérer les informations nécessaires pour le nom
    // Essayer d'abord avec toutes les colonnes, puis avec seulement id si certaines colonnes n'existent pas
    let profile: { id: string; full_name?: string | null; first_name?: string | null; last_name?: string | null; display_name?: string | null } | null = null;
    let profileCheckError: any = null;
    
    const { data: profileDataFromDb, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, first_name, last_name, display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      // Si erreur due à colonnes manquantes (code 42703), essayer avec seulement id
      if (profileError.code === "42703") {
        logger.warn(
          {
            userId: user.id.substring(0, 8) + "…",
            error: profileError.message,
          },
          "[tournaments/register] Some profile columns missing, trying with id only"
        );
        
        const { data: profileIdOnly, error: profileIdError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profileIdError) {
          profileCheckError = profileIdError;
        } else if (profileIdOnly) {
          profile = { id: profileIdOnly.id, full_name: null, first_name: null, last_name: null, display_name: null };
        }
      } else {
        profileCheckError = profileError;
      }
    } else {
      profile = profileDataFromDb;
    }

    if (profileCheckError) {
      logger.error(
        {
          userId: user.id.substring(0, 8) + "…",
          error: profileCheckError.message,
          code: profileCheckError.code,
          details: profileCheckError.details,
        },
        "[tournaments/register] Error checking if profile exists"
      );
      return NextResponse.json(
        { error: "Erreur lors de la vérification de votre profil" },
        { status: 500 }
      );
    }

    if (!profile) {
      // Si vraiment pas de profil (cas rare), créer un profil minimal
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
        },
        "[tournaments/register] User profile not found, creating minimal profile"
      );

      const displayName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        (user.email ? user.email.split("@")[0] : "Joueur");

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          display_name: displayName,
        })
        .select("id, full_name, first_name, last_name, display_name")
        .single();

      if (createError || !newProfile) {
        logger.error(
          {
            userId: user.id.substring(0, 8) + "…",
            error: createError?.message,
            code: createError?.code,
            details: createError?.details,
          },
          "[tournaments/register] Error creating minimal user profile"
        );
        return NextResponse.json(
          { error: "Erreur lors de la création de votre profil. Veuillez contacter le support." },
          { status: 500 }
        );
      }
      // Utiliser le nouveau profil créé
      profile = { 
        id: newProfile.id, 
        full_name: newProfile.full_name || null, 
        first_name: newProfile.first_name || null, 
        last_name: newProfile.last_name || null, 
        display_name: newProfile.display_name || displayName 
      };
    }

    // S'assurer que profile est défini avec toutes les propriétés nécessaires
    const profileData = profile || { id: user.id, full_name: null, first_name: null, last_name: null, display_name: null };

    // Vérifier tournoi + statut
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, status, max_teams")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          error: tournamentError?.message,
        },
        "[tournaments/register] Tournament not found"
      );
      return NextResponse.json(
        { error: "Tournoi introuvable" },
        { status: 404 }
      );
    }

    // Les inscriptions sont ouvertes uniquement si le statut est "open"
    // Elles sont fermées si le statut est "registration_closed", "draw_published", "in_progress", "completed", "cancelled", ou "draft"
    if (tournament.status !== "open") {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          status: tournament.status,
        },
        "[tournaments/register] Tournament is not open for registration"
      );
      return NextResponse.json(
        { error: "Les inscriptions ne sont pas ouvertes pour ce tournoi" },
        { status: 400 }
      );
    }

    // Vérifier la capacité maximale d'équipes (max_teams)
    if (supabaseAdmin) {
      const { count: activeCount, error: countError } = await supabaseAdmin
        .from("tournament_registrations")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", id)
        .in("status", ["pending", "confirmed", "validated"]);

      if (countError) {
        logger.warn(
          {
            tournamentId: id.substring(0, 8) + "…",
            userId: user.id.substring(0, 8) + "…",
            error: countError.message,
          },
          "[tournaments/register] Could not count active registrations"
        );
      } else if (
        typeof tournament.max_teams === "number" &&
        tournament.max_teams > 0 &&
        typeof activeCount === "number" &&
        activeCount >= tournament.max_teams
      ) {
        return NextResponse.json(
          {
            error:
              "Le nombre maximum d'équipes est déjà atteint pour ce tournoi.",
          },
          { status: 400 }
        );
      }
    }

    // Vérifier inscription existante (une paire par joueur dans ce tournoi)
    // Utiliser supabaseAdmin pour bypasser RLS
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", id)
      .eq("player1_id", profileData.id)
      .maybeSingle();

    if (existingError) {
      logger.error(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          error: existingError.message,
          code: existingError.code,
        },
        "[tournaments/register] Error checking existing registration"
      );
      return NextResponse.json(
        { error: "Erreur lors de la vérification de votre inscription" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "Vous êtes déjà inscrit à ce tournoi" },
        { status: 400 }
      );
    }

    // Chercher le partenaire dans la base par licence
    // Note: Si la colonne license_number n'existe pas, on va créer un profil invité temporaire
    let partnerProfile: { id: string } | null = null;
    
    const { data: partnerData, error: partnerError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("license_number", partner_license)
      .maybeSingle();

    if (partnerError) {
      // Si erreur due à colonne manquante, on continue sans chercher par licence
      if (partnerError.code === "42703") {
        logger.warn(
          {
            partnerLicense: partner_license.substring(0, 8) + "…",
            tournamentId: id.substring(0, 8) + "…",
            error: partnerError.message,
          },
          "[tournaments/register] license_number column not found, will create guest profile"
        );
      } else {
        logger.error(
          {
            partnerLicense: partner_license.substring(0, 8) + "…",
            tournamentId: id.substring(0, 8) + "…",
            error: partnerError.message,
            code: partnerError.code,
          },
          "[tournaments/register] Error searching for partner"
        );
        return NextResponse.json(
          { error: "Erreur lors de la recherche du partenaire" },
          { status: 500 }
        );
      }
    } else if (partnerData) {
      partnerProfile = partnerData;
    }

    // Si le partenaire n'est pas trouvé, créer un profil invité temporaire
    if (!partnerProfile) {
      try {
        // Générer un UUID pour le profil invité
        const guestProfileId = randomUUID();
        
        // Créer le profil invité avec plusieurs tentatives (colonnes minimales d'abord)
        let guestProfile = null;
        let guestError: any = null;

        // Tentative 1 : Insertion minimale avec seulement id et display_name (colonnes qui existent toujours)
        logger.info(
          {
            partnerName: partner_name?.substring(0, 20) + "…",
            guestProfileId: guestProfileId.substring(0, 8) + "…",
          },
          "[tournaments/register] Attempting to create guest profile with minimal fields"
        );

        const minimalGuestInsert = await supabaseAdmin
          .from("profiles")
          .insert({
            id: guestProfileId,
            display_name: partner_name || "Partenaire invité",
          })
          .select("id")
          .single();

        guestProfile = minimalGuestInsert.data;
        guestError = minimalGuestInsert.error;

        if (guestError) {
          logger.error(
            {
              partnerName: partner_name?.substring(0, 20) + "…",
              error: guestError.message,
              code: guestError.code,
              details: guestError.details,
              hint: guestError.hint,
            },
            "[tournaments/register] Minimal guest profile insert failed"
          );
        }

      // Si succès, essayer de mettre à jour avec license_number si la colonne existe
      // Mais seulement si la licence n'est pas déjà utilisée par un autre profil
      if (guestProfile && !guestError && partner_license) {
        // Vérifier d'abord si cette licence est déjà utilisée
        const { data: existingLicense, error: checkLicenseError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("license_number", partner_license)
          .maybeSingle();
        
        // Si la colonne n'existe pas (42703), on ignore
        if (checkLicenseError && checkLicenseError.code === "42703") {
          // Colonne n'existe pas, on ne peut pas mettre à jour
        } else if (checkLicenseError) {
          // Autre erreur, on log mais on continue
          logger.warn(
            {
              partnerName: partner_name.substring(0, 20) + "…",
              error: checkLicenseError.message,
            },
            "[tournaments/register] Could not check if license_number exists"
          );
        } else if (!existingLicense) {
          // La licence n'existe pas, on peut l'ajouter
          const updateWithLicense = await supabaseAdmin
            .from("profiles")
            .update({ license_number: partner_license })
            .eq("id", guestProfileId)
            .select("id")
            .single();
          
          // Ignorer l'erreur si la colonne n'existe pas (code 42703) ou contrainte unique (23505)
          if (updateWithLicense.error && 
              updateWithLicense.error.code !== "42703" && 
              updateWithLicense.error.code !== "23505") {
            logger.warn(
              {
                partnerName: partner_name.substring(0, 20) + "…",
                error: updateWithLicense.error.message,
                code: updateWithLicense.error.code,
              },
              "[tournaments/register] Could not update license_number for guest profile"
            );
          }
        } else {
          // La licence existe déjà pour un autre profil, on ne fait rien
          logger.info(
            {
              partnerName: partner_name.substring(0, 20) + "…",
            },
            "[tournaments/register] License number already exists for another profile, skipping update"
          );
        }
      }

      // Si la première tentative a échoué, essayer avec toutes les colonnes possibles
      if (!guestProfile || guestError) {
        logger.warn(
          {
            partnerName: partner_name.substring(0, 20) + "…",
            error: guestError?.message,
            code: guestError?.code,
          },
          "[tournaments/register] Minimal insert failed, trying with additional fields"
        );

        // Tentative 2 : Avec license_number si disponible
        const fullGuestInsert = await supabaseAdmin
          .from("profiles")
          .insert({
            id: guestProfileId,
            display_name: partner_name || "Partenaire invité",
            license_number: partner_license || null,
          })
          .select("id")
          .single();

        guestProfile = fullGuestInsert.data;
        guestError = fullGuestInsert.error;

        // Si erreur due à colonnes manquantes (42703), on ignore car on a déjà essayé le minimal
        if (guestError && guestError.code === "42703") {
          // Réessayer avec minimal seulement
          const retryMinimal = await supabaseAdmin
            .from("profiles")
            .insert({
              id: guestProfileId,
              display_name: partner_name || "Partenaire invité",
            })
            .select("id")
            .single();
          
          guestProfile = retryMinimal.data;
          guestError = retryMinimal.error;
        }
      }

        if (guestError || !guestProfile) {
          logger.error(
            {
              partnerName: partner_name?.substring(0, 20) + "…",
              partnerLicense: partner_license?.substring(0, 8) + "…",
              error: guestError?.message,
              code: guestError?.code,
              details: guestError?.details,
              hint: guestError?.hint,
            },
            "[tournaments/register] Error creating guest profile for partner after all attempts"
          );
          
          // Si création échoue après toutes les tentatives, retourner une erreur claire
          return NextResponse.json(
            {
              error:
                "Impossible de créer le profil du partenaire. Veuillez vérifier que votre partenaire est inscrit sur la plateforme.",
              details: guestError?.message || "Erreur inconnue lors de la création du profil invité",
            },
            { status: 400 }
          );
        }

        partnerProfile = guestProfile;
        logger.info(
          {
            partnerName: partner_name?.substring(0, 20) + "…",
            guestProfileId: guestProfileId.substring(0, 8) + "…",
          },
          "[tournaments/register] Guest profile created for partner"
        );
      } catch (guestProfileError: any) {
        logger.error(
          {
            partnerName: partner_name?.substring(0, 20) + "…",
            error: guestProfileError?.message,
            stack: guestProfileError?.stack,
          },
          "[tournaments/register] Unexpected error while creating guest profile"
        );
        return NextResponse.json(
          {
            error:
              "Impossible de créer le profil du partenaire. Veuillez vérifier que votre partenaire est inscrit sur la plateforme.",
            details: guestProfileError?.message || "Erreur inattendue",
          },
          { status: 400 }
        );
      }
    }

    // Vérifier que le partenaire n'est pas le même que le joueur
    if (partnerProfile.id === profileData.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous inscrire avec vous-même comme partenaire" },
        { status: 400 }
      );
    }


    // Définir les classements (player1 = joueur principal, player2 = partenaire)
    const player1_rank = player_rank;
    const player2_rank = partner_rank;

    // Calculer le total des classements
    const pair_total_rank = player1_rank + player2_rank;

    // Compter les inscriptions existantes pour déterminer registration_order
    const { count } = await supabaseAdmin
      .from("tournament_registrations")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", id);

    const registration_order = (count || 0) + 1;

    // Création de l'entrée dans tournament_registrations
    // Tentative avec toutes les colonnes (si la migration a été exécutée)
    let registration = null;
    let insertError: any = null;

    const firstInsert = await supabaseAdmin
      .from("tournament_registrations")
      .insert({
        tournament_id: id,
        player1_id: profileData.id,
        player2_id: partnerProfile!.id,
        player1_name,
        player1_rank,
        player2_name: partner_name,
        player2_rank,
        pair_total_rank,
        registration_order,
        pair_weight: pair_total_rank, // Utiliser pair_total_rank comme pair_weight
        phase: "waiting_list", // Phase valide selon la contrainte CHECK
        status: "pending",
      })
      .select()
      .single();

    registration = firstInsert.data;
    insertError = firstInsert.error;

    // Si erreur due à des colonnes manquantes (code 42703 = undefined_column), retenter avec colonnes minimales
    if ((!registration || insertError) && insertError?.code === "42703") {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          error: insertError.message,
        },
        "[tournaments/register] Optional columns missing on tournament_registrations, retrying minimal insert"
      );

      // Insertion minimale sans les colonnes de classement (si migration pas encore exécutée)
      const fallbackInsert = await supabaseAdmin
        .from("tournament_registrations")
        .insert({
          tournament_id: id,
          player1_id: profileData.id,
          player2_id: partnerProfile!.id,
          registration_order,
          pair_weight: pair_total_rank,
          phase: "waiting_list", // Phase valide selon la contrainte CHECK
          status: "pending",
        })
        .select()
        .single();

      registration = fallbackInsert.data;
      insertError = fallbackInsert.error;
    }

    if (insertError || !registration) {
      logger.error(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          error: insertError?.message,
          code: insertError?.code,
          details: insertError?.details,
        },
        "[tournaments/register] Error creating registration"
      );

      // Gestion explicite des cas fréquents
      if (insertError?.code === "23505") {
        // Contrainte d'unicité violée: paire déjà inscrite
        return NextResponse.json(
          { error: "Already registered" },
          { status: 400 }
        );
      }

      // Message d'erreur plus détaillé pour le debug
      const errorMessage = insertError?.message || "Error creating registration";
      return NextResponse.json(
        { 
          error: errorMessage,
          code: insertError?.code,
          hint: insertError?.code === "42703" 
            ? "Les colonnes de classement ne sont pas encore disponibles. Veuillez exécuter la migration SQL."
            : undefined
        },
        { status: 500 }
      );
    }

    logger.info(
      {
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        registrationId: registration.id.substring(0, 8) + "…",
        pairTotalRank: pair_total_rank,
      },
      "[tournaments/register] Registration created"
    );

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error: any) {
    logger.error(
      { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error?.code,
        details: error?.details,
      },
      "[tournaments/register] Unexpected error"
    );
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message || "Erreur interne du serveur"
          : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}


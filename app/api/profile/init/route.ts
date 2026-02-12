import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { updateEngagementMetrics, checkAutoExtensionEligibility, grantAutoExtension } from "@/lib/trial-hybrid";
import { revalidatePath } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  logger.warn("[api/profile/init] Missing Supabase service configuration", {});
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
      logger.error("[api/profile/init] bearer auth error", { error: error, tokenPreview: token.substring(0, 8) + "…" });
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
    "Joueur";

  // Log pour diagnostic
  logger.info("[api/profile/init] Starting profile init", {
    userId: user.id.substring(0, 8) + "…",
    email: user.email?.substring(0, 10) + "…",
    hasMetadata: !!user.user_metadata,
    metadataClubId: user.user_metadata?.club_id || null
  });

  const { data: existing, error } = await serviceClient
    .from("profiles")
    .select("id, club_id, club_slug, display_name, has_completed_onboarding, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("[api/profile/init] fetch error", { error: error, userId: user.id.substring(0, 8) + "…", email: user.email?.substring(0, 10) + "…" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let clubIdForUser: string | null = null;
  let clubSlugForUser: string | null = null;
  let clubNameForUser: string | null = null;
  let clubLogoForUser: string | null = null;

  // Vérifier d'abord les métadonnées utilisateur pour club_id (cas où le club a été créé mais club_admins n'existe pas encore)
  const userMetadata = user.user_metadata || {};
  const metadataClubId = userMetadata.club_id as string | null | undefined;

  logger.info("[api/profile/init] Checking club association", {
    userId: user.id.substring(0, 8) + "…",
    email: user.email?.substring(0, 10) + "…",
    metadataClubId: metadataClubId || null
  });

  // PRIORITÉ 1: Vérifier dans club_admins par user_id
  const { data: clubAdmin, error: clubAdminError } = await serviceClient
    .from("club_admins")
    .select("club_id, activated_at, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (clubAdminError) {
    logger.error("[api/profile/init] Error fetching club_admins by user_id", { error: clubAdminError, userId: user.id.substring(0, 8) + "…", email: user.email?.substring(0, 10) + "…" });
  }

  // PRIORITÉ 2: Si pas trouvé par user_id, chercher par email (cas où l'email existe mais user_id est différent ou NULL)
  let clubAdminByEmail = null;
  if (!clubAdmin && user.email) {
    const { data: emailAdmin, error: emailAdminError } = await serviceClient
      .from("club_admins")
      .select("club_id, activated_at, email, user_id")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    if (emailAdminError) {
      logger.error("[api/profile/init] Error fetching club_admins by email", { error: emailAdminError, email: user.email.substring(0, 10) + "…" });
    } else if (emailAdmin) {
      clubAdminByEmail = emailAdmin;
      logger.info("[api/profile/init] Found club_admins entry by email", {
        email: user.email.substring(0, 10) + "…",
        foundClubId: emailAdmin.club_id?.substring(0, 8) + "…",
        existingUserId: emailAdmin.user_id?.substring(0, 8) + "…" || "NULL"
      });
    }
  }

  logger.info("[api/profile/init] Club admin check result", {
    userId: user.id.substring(0, 8) + "…",
    email: user.email?.substring(0, 10) + "…",
    hasClubAdminByUserId: !!clubAdmin,
    hasClubAdminByEmail: !!clubAdminByEmail,
    clubAdminClubId: clubAdmin?.club_id || clubAdminByEmail?.club_id || null,
    clubAdminActivated: !!(clubAdmin?.activated_at || clubAdminByEmail?.activated_at)
  });

  // Priorité : club_admins activé (par user_id) > club_admins par email > métadonnées > club_admins non activé
  if (clubAdmin?.activated_at) {
    clubIdForUser = clubAdmin.club_id;
  } else if (clubAdminByEmail?.club_id) {
    // Trouvé par email, mettre à jour avec le user_id actuel
    clubIdForUser = clubAdminByEmail.club_id;

    logger.info("[api/profile/init] Updating club_admins with current user_id", {
      userId: user.id.substring(0, 8) + "…",
      email: user.email?.substring(0, 10) + "…",
      clubId: (clubIdForUser || "unknown").substring(0, 8) + "…"
    });

    // Récupérer les infos du club d'abord
    const { data: clubRow } = await serviceClient
      .from("clubs")
      .select("id, slug, name, logo_url")
      .eq("id", clubIdForUser)
      .maybeSingle();

    if (clubRow) {
      clubSlugForUser = clubRow.slug ?? null;
      clubNameForUser = clubRow.name ?? null;
      clubLogoForUser = clubRow.logo_url ?? null;
    }

    // Mettre à jour l'entrée club_admins avec le user_id actuel
    const { error: updateAdminError } = await serviceClient
      .from("club_admins")
      .update({
        user_id: user.id,
        activated_at: clubAdminByEmail.activated_at || new Date().toISOString()
      })
      .eq("club_id", clubIdForUser)
      .eq("email", user.email!.toLowerCase());

    if (updateAdminError) {
      logger.error("[api/profile/init] Error updating club_admins with user_id", { error: updateAdminError, email: user.email?.substring(0, 10) + "…" });
      // Ne pas bloquer, continuer avec le club_id trouvé
    } else {
      logger.info("[api/profile/init] Successfully updated club_admins with user_id", {
        userId: user.id.substring(0, 8) + "…",
        clubId: (clubIdForUser || "unknown").substring(0, 8) + "…"
      });
    }
  } else if (metadataClubId) {
    // Si l'utilisateur a un club_id dans ses métadonnées, vérifier que le club existe
    const { data: clubFromMetadata } = await serviceClient
      .from("clubs")
      .select("id, slug, name, logo_url")
      .eq("id", metadataClubId)
      .maybeSingle();

    if (clubFromMetadata) {
      clubIdForUser = clubFromMetadata.id;
      clubSlugForUser = clubFromMetadata.slug ?? null;
      clubNameForUser = clubFromMetadata.name ?? null;
      clubLogoForUser = clubFromMetadata.logo_url ?? null;

      // Créer ou activer l'entrée club_admins si elle n'existe pas
      if (!clubAdmin) {
        // Déterminer le rôle adéquat : "owner" par défaut, mais respecter un éventuel rôle "admin"
        const desiredRole =
          (userMetadata.role as string | null)?.toLowerCase() === "admin" ? "admin" : "owner";
        const { error: createAdminError } = await serviceClient
          .from("club_admins")
          .insert({
            club_id: String(clubIdForUser),
            user_id: user.id,
            email: user.email || '',
            role: desiredRole,
            invited_by: user.id,
            activated_at: new Date().toISOString(),
          });

        if (createAdminError) {
          logger.warn("[api/profile/init] Could not create club_admins entry (non-blocking)", { error: createAdminError, userId: user.id.substring(0, 8) + "…", clubId: (clubIdForUser || "unknown").substring(0, 8) + "…" });
        }
      } else if (!clubAdmin.activated_at) {
        // Activer l'entrée existante
        const { error: activationError } = await serviceClient
          .from("club_admins")
          .update({ activated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("club_id", clubIdForUser);

        if (activationError) {
          logger.warn("[api/profile/init] Could not activate club_admins entry (non-blocking)", { error: activationError, userId: user.id.substring(0, 8) + "…", clubId: (clubIdForUser || "unknown").substring(0, 8) + "…" });
        }
      }
    }
  } else if (clubAdmin?.club_id && !clubAdmin.activated_at) {
    // Cas où club_admins existe mais n'est pas activé
    const { data: activationRow, error: activationError } = await serviceClient
      .from("club_admins")
      .update({ activated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("club_id", clubAdmin.club_id)
      .select("club_id, activated_at")
      .maybeSingle();

    if (activationError) {
      logger.error("[api/profile/init] activation update error", { error: activationError, userId: user.id.substring(0, 8) + "…", clubId: clubAdmin.club_id.substring(0, 8) + "…" });
      return NextResponse.json(
        {
          error:
            "Impossible d'activer votre invitation administrateur. Utilisez le lien reçu par email pour définir votre mot de passe.",
          redirect: "/clubs/signup",
        },
        { status: 409 }
      );
    }

    if (activationRow?.club_id) {
      clubIdForUser = activationRow.club_id;
    }
  }

  // NOUVEAU: Vérifier si l'utilisateur est un administrateur de club
  // Les admins ne doivent PAS être enregistrés comme joueurs dans leur propre club
  let isClubAdministrator = false;
  let adminRole: string | null = null;

  if (clubIdForUser) {
    // Vérifier le rôle dans club_admins
    const { data: adminCheck } = await serviceClient
      .from("club_admins")
      .select("role")
      .eq("user_id", user.id)
      .eq("club_id", clubIdForUser)
      .maybeSingle();

    if (adminCheck) {
      adminRole = adminCheck.role;
      isClubAdministrator = adminRole === "owner" || adminRole === "admin";

      logger.info("[api/profile/init] Club admin role check", {
        userId: user.id.substring(0, 8) + "…",
        clubId: clubIdForUser.substring(0, 8) + "…",
        role: adminRole,
        isAdmin: isClubAdministrator
      });
    }
  }

  // Si l'utilisateur est un admin de club, ne PAS créer/mettre à jour son profil joueur
  // Mettre seulement à jour ses métadonnées et rediriger vers le dashboard
  if (isClubAdministrator && clubIdForUser) {
    logger.info("[api/profile/init] User is club admin, skipping player profile creation", {
      userId: user.id.substring(0, 8) + "…",
      clubId: clubIdForUser.substring(0, 8) + "…",
      role: adminRole
    });

    // Récupérer les infos du club pour les métadonnées
    if (!clubSlugForUser || !clubNameForUser || !clubLogoForUser) {
      const { data: clubRow } = await serviceClient
        .from("clubs")
        .select("slug, name, logo_url")
        .eq("id", clubIdForUser)
        .maybeSingle();
      if (clubRow) {
        clubSlugForUser = clubSlugForUser ?? (clubRow.slug ?? null);
        clubNameForUser = clubNameForUser ?? (clubRow.name ?? null);
        clubLogoForUser = clubLogoForUser ?? (clubRow.logo_url ?? null);
      }
    }

    // Mettre à jour les métadonnées de l'utilisateur pour le dashboard
    try {
      const { data: existingUser } = await serviceClient.auth.admin.getUserById(user.id);
      const mergedMetadata = {
        ...(existingUser?.user?.user_metadata || {}),
        club_id: clubIdForUser,
        club_slug: clubSlugForUser,
        club_name: clubNameForUser ?? (existingUser?.user?.user_metadata?.club_name as string | null) ?? null,
        club_logo_url: clubLogoForUser ?? (existingUser?.user?.user_metadata?.club_logo_url as string | null) ?? null,
      };
      await serviceClient.auth.admin.updateUserById(user.id, {
        user_metadata: mergedMetadata,
      });

      logger.info("[api/profile/init] Updated admin metadata, redirecting to dashboard", {
        userId: user.id.substring(0, 8) + "…",
        clubId: clubIdForUser.substring(0, 8) + "…"
      });
    } catch (metadataError) {
      logger.warn("[api/profile/init] metadata update warning (club admin)", { error: metadataError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" });
    }

    // Retourner sans profil joueur - l'admin accède seulement au dashboard
    return NextResponse.json({
      ok: true,
      redirect: "/dashboard",
      profile: null, // Pas de profil joueur pour les admins
    });
  }

  if (clubIdForUser) {
    const { data: clubRow } = await serviceClient
      .from("clubs")
      .select("slug, name, logo_url")
      .eq("id", clubIdForUser)
      .maybeSingle();
    if (clubRow) {
      clubSlugForUser = clubSlugForUser ?? (clubRow.slug ?? null);
      clubNameForUser = clubRow.name ?? null;
      clubLogoForUser = clubRow.logo_url ?? null;
    }
  }

  if (clubIdForUser && (!clubNameForUser || !clubLogoForUser)) {
    const { data: ownerRows } = await serviceClient
      .from("club_admins")
      .select("user_id")
      .eq("club_id", clubIdForUser)
      .eq("role", "owner");

    const ownerId = ownerRows?.[0]?.user_id as string | undefined;
    if (ownerId) {
      try {
        const { data: ownerUser } = await serviceClient.auth.admin.getUserById(ownerId);
        const ownerMeta = (ownerUser?.user?.user_metadata || {}) as Record<string, any>;
        if (!clubNameForUser && typeof ownerMeta.club_name === "string") {
          clubNameForUser = ownerMeta.club_name;
        }
        if (!clubLogoForUser && typeof ownerMeta.club_logo_url === "string") {
          clubLogoForUser = ownerMeta.club_logo_url;
        }
        if (!clubSlugForUser && typeof ownerMeta.club_slug === "string") {
          clubSlugForUser = ownerMeta.club_slug;
        }
      } catch (ownerMetaError) {
        logger.warn("[api/profile/init] owner metadata lookup warning", { error: ownerMetaError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…", ownerId: ownerId.substring(0, 8) + "…" });
      }
    }
  }

  if (existing) {
    const updates: Record<string, any> = {};
    if (!existing.display_name) {
      updates.display_name = fullName;
    }
    if (clubIdForUser && !existing.club_id) {
      updates.club_id = clubIdForUser;
    }
    if (clubSlugForUser && !existing.club_slug) {
      updates.club_slug = clubSlugForUser;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError, data: updatedRows } = await serviceClient
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("id, club_id, club_slug, display_name")
        .maybeSingle();

      if (!updateError && updatedRows) {
        const profilePayload = {
          ...updatedRows,
          display_name: updatedRows.display_name || fullName,
        };

        if (clubIdForUser) {
          try {
            const { data: existingUser } = await serviceClient.auth.admin.getUserById(user.id);
            const mergedMetadata = {
              ...(existingUser?.user?.user_metadata || {}),
              club_id: clubIdForUser,
              club_slug: clubSlugForUser ?? profilePayload.club_slug ?? null,
              club_name:
                clubNameForUser ??
                (existingUser?.user?.user_metadata?.club_name as string | null) ??
                null,
              club_logo_url:
                clubLogoForUser ??
                (existingUser?.user?.user_metadata?.club_logo_url as string | null) ??
                null,
            };
            await serviceClient.auth.admin.updateUserById(user.id, {
              user_metadata: mergedMetadata,
            });
          } catch (metadataError) {
            logger.warn("[api/profile/init] metadata update warning (updated profile)", { error: metadataError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" });
          }

          // Auto-extension après ajout d'un joueur au club
          try {
            logger.info("[profile/init] Trial check after player added to club", { clubId: String(clubIdForUser).substring(0, 8) + "…" });
            await updateEngagementMetrics(String(clubIdForUser));
            const eligibility = await checkAutoExtensionEligibility(String(clubIdForUser));
            logger.info("[profile/init] Trial eligibility", { clubId: String(clubIdForUser).substring(0, 8) + "…", eligible: eligibility.eligible, reason: eligibility.reason });
            if (eligibility.eligible && eligibility.reason) {
              const grantRes = await grantAutoExtension(String(clubIdForUser), eligibility.reason);
              if (grantRes.success) {
                logger.info("[api/profile/init] Auto extension granted after player added to club", { clubId: String(clubIdForUser).substring(0, 8) + "…", reason: eligibility.reason });
                // Rafraîchir les pages frontend
                revalidatePath('/dashboard');
                revalidatePath('/dashboard/facturation');
              } else {
                logger.warn("[api/profile/init] Auto extension grant failed after player added to club", { clubId: String(clubIdForUser).substring(0, 8) + "…", error: grantRes.error });
              }
            } else {
              logger.info("[api/profile/init] No auto extension (threshold not met or already unlocked)", { clubId: String(clubIdForUser).substring(0, 8) + "…" });
            }
          } catch (extErr) {
            logger.error("[api/profile/init] Auto extension check error", { clubId: String(clubIdForUser).substring(0, 8) + "…", error: (extErr as Error).message });
          }
        }

        return NextResponse.json({
          ok: true,
          profile: profilePayload,
        });
      }
      if (updateError) {
        logger.warn("[api/profile/init] update warning", { error: updateError, userId: user.id.substring(0, 8) + "…" });
      }
    }

    if (clubIdForUser) {
      try {
        const { data: existingUser } = await serviceClient.auth.admin.getUserById(user.id);
        const mergedMetadata = {
          ...(existingUser?.user?.user_metadata || {}),
          club_id: clubIdForUser,
          club_slug: clubSlugForUser ?? existing.club_slug ?? null,
          club_name:
            clubNameForUser ??
            (existingUser?.user?.user_metadata?.club_name as string | null) ??
            null,
          club_logo_url:
            clubLogoForUser ??
            (existingUser?.user?.user_metadata?.club_logo_url as string | null) ??
            null,
        };
        await serviceClient.auth.admin.updateUserById(user.id, {
          user_metadata: mergedMetadata,
        });
      } catch (metadataError) {
        logger.warn("[api/profile/init] metadata update warning", { error: metadataError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" });
      }

      // Auto-extension après ajout d'un joueur au club (profil existant)
      if (!existing.club_id && clubIdForUser) {
        try {
          logger.info("[profile/init] Trial check after existing player added to club", { clubId: String(clubIdForUser).substring(0, 8) + "…" });
          await updateEngagementMetrics(String(clubIdForUser));
          const eligibility = await checkAutoExtensionEligibility(String(clubIdForUser));
          logger.info("[profile/init] Trial eligibility", { clubId: String(clubIdForUser).substring(0, 8) + "…", eligible: eligibility.eligible, reason: eligibility.reason });
          if (eligibility.eligible && eligibility.reason) {
            const grantRes = await grantAutoExtension(String(clubIdForUser), eligibility.reason);
            if (grantRes.success) {
              logger.info("[api/profile/init] Auto extension granted after existing player added to club", { clubId: String(clubIdForUser).substring(0, 8) + "…", reason: eligibility.reason });
              // Rafraîchir les pages frontend
              revalidatePath('/dashboard');
              revalidatePath('/dashboard/facturation');
            } else {
              logger.warn("[api/profile/init] Auto extension grant failed after existing player added to club", { clubId: String(clubIdForUser).substring(0, 8) + "…", error: grantRes.error });
            }
          } else {
            logger.info("[api/profile/init] No auto extension (threshold not met or already unlocked)", { clubId: clubIdForUser.substring(0, 8) + "…" });
          }
        } catch (extErr) {
          logger.error("[api/profile/init] Auto extension check error", { clubId: clubIdForUser.substring(0, 8) + "…", error: (extErr as Error).message });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      profile: {
        ...existing,
        club_id: existing.club_id ?? clubIdForUser ?? null,
        club_slug: existing.club_slug ?? clubSlugForUser ?? null,
        display_name: existing.display_name || fullName,
        has_completed_onboarding: existing.has_completed_onboarding ?? false,
        is_admin: existing.is_admin ?? false,
      },
    });
  }

  // Si l'utilisateur n'a pas de profil existant et est un admin de club qui essaie d'accéder au dashboard club
  // On ne crée pas de profil joueur automatiquement, on le redirige vers le dashboard
  // Vérifier aussi si l'utilisateur a un club_id dans ses métadonnées (même sans club_admins)
  if (clubIdForUser) {
    logger.info("[api/profile/init] Club found, redirecting to dashboard", {
      userId: user.id.substring(0, 8) + "…",
      email: user.email?.substring(0, 10) + "…",
      clubId: clubIdForUser.substring(0, 8) + "…",
      clubSlug: clubSlugForUser || null
    });

    try {
      const { data: existingUser } = await serviceClient.auth.admin.getUserById(user.id);
      const mergedMetadata = {
        ...(existingUser?.user?.user_metadata || {}),
        club_id: clubIdForUser,
        club_slug: clubSlugForUser,
        club_name: clubNameForUser ?? (existingUser?.user?.user_metadata?.club_name as string | null) ?? null,
        club_logo_url: clubLogoForUser ?? (existingUser?.user?.user_metadata?.club_logo_url as string | null) ?? null,
      };
      await serviceClient.auth.admin.updateUserById(user.id, {
        user_metadata: mergedMetadata,
      });
    } catch (metadataError) {
      logger.warn("[api/profile/init] metadata update warning (admin without profile)", { error: metadataError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" });
    }

    return NextResponse.json({
      ok: true,
      redirect: "/dashboard",
      profile: null, // Pas de profil joueur
    });
  }


  // Log détaillé avant de retourner l'erreur
  logger.warn("[api/profile/init] No club found for user", {
    userId: user.id.substring(0, 8) + "…",
    email: user.email || "no email",
    hasProfile: !!existing,
    hasMetadataClubId: !!metadataClubId,
    hasClubAdmin: !!clubAdmin,
    clubIdForUser: clubIdForUser || null,
    role: userMetadata.role || null
  });

  // NOUVEAU: Si l'utilisateur a le rôle "owner" dans ses métadonnées mais pas de club_id,
  // c'est qu'il a créé un compte club mais n'a pas terminé l'onboarding
  // On le redirige vers l'onboarding au lieu de retourner une erreur 404
  const userRole = userMetadata.role as string | undefined;
  if (userRole === "owner" || userRole === "admin") {
    logger.info("[api/profile/init] User has club role but no club, redirecting to onboarding", {
      userId: user.id.substring(0, 8) + "…",
      email: user.email?.substring(0, 10) + "…",
      role: userRole
    });

    return NextResponse.json({
      ok: true,
      redirect: "/onboarding",
      profile: null,
    });
  }

  // Si on arrive ici, l'utilisateur n'a pas de profil joueur ni de rôle club
  // Il doit créer son compte via l'inscription joueurs
  return NextResponse.json(
    { error: "Aucun compte joueur trouvé pour cet email. Créez d'abord votre compte via l'inscription joueurs." },
    { status: 404 }
  );
}

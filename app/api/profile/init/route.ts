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
  logger.warn({}, "[api/profile/init] Missing Supabase service configuration");
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
      logger.error({ error: error, tokenPreview: token.substring(0, 8) + "…" }, "[api/profile/init] bearer auth error");
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

  // Log pour diagnostic
  logger.info({ 
    userId: user.id.substring(0, 8) + "…", 
    email: user.email?.substring(0, 10) + "…",
    hasMetadata: !!user.user_metadata,
    metadataClubId: user.user_metadata?.club_id || null
  }, "[api/profile/init] Starting profile init");

  const { data: existing, error } = await serviceClient
    .from("profiles")
    .select("id, club_id, club_slug, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logger.error({ error: error, userId: user.id.substring(0, 8) + "…", email: user.email?.substring(0, 10) + "…" }, "[api/profile/init] fetch error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let clubIdForUser: string | null = null;
  let clubSlugForUser: string | null = null;
  let clubNameForUser: string | null = null;
  let clubLogoForUser: string | null = null;

  // Vérifier d'abord les métadonnées utilisateur pour club_id (cas où le club a été créé mais club_admins n'existe pas encore)
  const userMetadata = user.user_metadata || {};
  const metadataClubId = userMetadata.club_id as string | null | undefined;
  
  logger.info({ 
    userId: user.id.substring(0, 8) + "…", 
    email: user.email?.substring(0, 10) + "…",
    metadataClubId: metadataClubId || null
  }, "[api/profile/init] Checking club association");
  
  // PRIORITÉ 1: Vérifier dans club_admins par user_id
  const { data: clubAdmin, error: clubAdminError } = await serviceClient
    .from("club_admins")
    .select("club_id, activated_at, email")
    .eq("user_id", user.id)
    .maybeSingle();
  
  if (clubAdminError) {
    logger.error({ error: clubAdminError, userId: user.id.substring(0, 8) + "…", email: user.email?.substring(0, 10) + "…" }, "[api/profile/init] Error fetching club_admins by user_id");
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
      logger.error({ error: emailAdminError, email: user.email.substring(0, 10) + "…" }, "[api/profile/init] Error fetching club_admins by email");
    } else if (emailAdmin) {
      clubAdminByEmail = emailAdmin;
      logger.info({ 
        email: user.email.substring(0, 10) + "…",
        foundClubId: emailAdmin.club_id?.substring(0, 8) + "…",
        existingUserId: emailAdmin.user_id?.substring(0, 8) + "…" || "NULL"
      }, "[api/profile/init] Found club_admins entry by email");
    }
  }
  
  logger.info({ 
    userId: user.id.substring(0, 8) + "…", 
    email: user.email?.substring(0, 10) + "…",
    hasClubAdminByUserId: !!clubAdmin,
    hasClubAdminByEmail: !!clubAdminByEmail,
    clubAdminClubId: clubAdmin?.club_id || clubAdminByEmail?.club_id || null,
    clubAdminActivated: !!(clubAdmin?.activated_at || clubAdminByEmail?.activated_at)
  }, "[api/profile/init] Club admin check result");

  // Priorité : club_admins activé (par user_id) > club_admins par email > métadonnées > club_admins non activé
  if (clubAdmin?.activated_at) {
    clubIdForUser = clubAdmin.club_id;
  } else if (clubAdminByEmail?.club_id) {
    // Trouvé par email, mettre à jour avec le user_id actuel
    clubIdForUser = clubAdminByEmail.club_id;
    
    logger.info({ 
      userId: user.id.substring(0, 8) + "…", 
      email: user.email?.substring(0, 10) + "…",
      clubId: clubIdForUser.substring(0, 8) + "…"
    }, "[api/profile/init] Updating club_admins with current user_id");
    
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
      logger.error({ error: updateAdminError, email: user.email?.substring(0, 10) + "…" }, "[api/profile/init] Error updating club_admins with user_id");
      // Ne pas bloquer, continuer avec le club_id trouvé
    } else {
      logger.info({ 
        userId: user.id.substring(0, 8) + "…", 
        clubId: clubIdForUser.substring(0, 8) + "…"
      }, "[api/profile/init] Successfully updated club_admins with user_id");
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
          logger.warn({ error: createAdminError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" }, "[api/profile/init] Could not create club_admins entry (non-blocking)");
        }
      } else if (!clubAdmin.activated_at) {
        // Activer l'entrée existante
        const { error: activationError } = await serviceClient
          .from("club_admins")
          .update({ activated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("club_id", clubIdForUser);
        
        if (activationError) {
          logger.warn({ error: activationError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" }, "[api/profile/init] Could not activate club_admins entry (non-blocking)");
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
      logger.error({ error: activationError, userId: user.id.substring(0, 8) + "…", clubId: clubAdmin.club_id.substring(0, 8) + "…" }, "[api/profile/init] activation update error");
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
        logger.warn({ error: ownerMetaError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…", ownerId: ownerId.substring(0, 8) + "…" }, "[api/profile/init] owner metadata lookup warning");
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
            logger.warn({ error: metadataError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" }, "[api/profile/init] metadata update warning (updated profile)");
          }

          // Auto-extension après ajout d'un joueur au club
          try {
            logger.info({ clubId: clubIdForUser.substring(0, 8) + "…" }, '[profile/init] Trial check after player added to club');
            await updateEngagementMetrics(clubIdForUser);
            const eligibility = await checkAutoExtensionEligibility(clubIdForUser);
            logger.info({ clubId: clubIdForUser.substring(0, 8) + "…", eligible: eligibility.eligible, reason: eligibility.reason }, '[profile/init] Trial eligibility');
            if (eligibility.eligible && eligibility.reason) {
              const grantRes = await grantAutoExtension(clubIdForUser, eligibility.reason);
              if (grantRes.success) {
                logger.info({ clubId: clubIdForUser.substring(0, 8) + "…", reason: eligibility.reason }, '[profile/init] Auto extension granted after player added to club');
                // Rafraîchir les pages frontend
                revalidatePath('/dashboard');
                revalidatePath('/dashboard/facturation');
              } else {
                logger.warn({ clubId: clubIdForUser.substring(0, 8) + "…", error: grantRes.error }, '[profile/init] Auto extension grant failed after player added to club');
              }
            } else {
              logger.info({ clubId: clubIdForUser.substring(0, 8) + "…" }, '[profile/init] No auto extension (threshold not met or already unlocked)');
            }
          } catch (extErr) {
            logger.error({ clubId: clubIdForUser.substring(0, 8) + "…", error: (extErr as Error).message }, '[profile/init] Auto extension check error');
          }
        }

        return NextResponse.json({
          ok: true,
          profile: profilePayload,
        });
      }
      if (updateError) {
        logger.warn({ error: updateError, userId: user.id.substring(0, 8) + "…" }, "[api/profile/init] update warning");
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
        logger.warn({ error: metadataError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" }, "[api/profile/init] metadata update warning");
      }

      // Auto-extension après ajout d'un joueur au club (profil existant)
      if (!existing.club_id && clubIdForUser) {
        try {
          logger.info({ clubId: clubIdForUser.substring(0, 8) + "…" }, '[profile/init] Trial check after existing player added to club');
          await updateEngagementMetrics(clubIdForUser);
          const eligibility = await checkAutoExtensionEligibility(clubIdForUser);
          logger.info({ clubId: clubIdForUser.substring(0, 8) + "…", eligible: eligibility.eligible, reason: eligibility.reason }, '[profile/init] Trial eligibility');
          if (eligibility.eligible && eligibility.reason) {
            const grantRes = await grantAutoExtension(clubIdForUser, eligibility.reason);
            if (grantRes.success) {
              logger.info({ clubId: clubIdForUser.substring(0, 8) + "…", reason: eligibility.reason }, '[profile/init] Auto extension granted after existing player added to club');
              // Rafraîchir les pages frontend
              revalidatePath('/dashboard');
              revalidatePath('/dashboard/facturation');
            } else {
              logger.warn({ clubId: clubIdForUser.substring(0, 8) + "…", error: grantRes.error }, '[profile/init] Auto extension grant failed after existing player added to club');
            }
          } else {
            logger.info({ clubId: clubIdForUser.substring(0, 8) + "…" }, '[profile/init] No auto extension (threshold not met or already unlocked)');
          }
        } catch (extErr) {
          logger.error({ clubId: clubIdForUser.substring(0, 8) + "…", error: (extErr as Error).message }, '[profile/init] Auto extension check error');
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
      },
    });
  }

  // Si l'utilisateur n'a pas de profil existant et est un admin de club qui essaie d'accéder au dashboard club
  // On ne crée pas de profil joueur automatiquement, on le redirige vers le dashboard
  // Vérifier aussi si l'utilisateur a un club_id dans ses métadonnées (même sans club_admins)
  if (clubIdForUser) {
    logger.info({ 
      userId: user.id.substring(0, 8) + "…", 
      email: user.email?.substring(0, 10) + "…",
      clubId: clubIdForUser.substring(0, 8) + "…",
      clubSlug: clubSlugForUser || null
    }, "[api/profile/init] Club found, redirecting to dashboard");
    
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
      logger.warn({ error: metadataError, userId: user.id.substring(0, 8) + "…", clubId: clubIdForUser.substring(0, 8) + "…" }, "[api/profile/init] metadata update warning (admin without profile)");
    }
    
    return NextResponse.json({
      ok: true,
      redirect: "/dashboard",
      profile: null, // Pas de profil joueur
    });
  }


  // Log détaillé avant de retourner l'erreur
  logger.warn({ 
    userId: user.id.substring(0, 8) + "…", 
    email: user.email || "no email",
    hasProfile: !!existing,
    hasMetadataClubId: !!metadataClubId,
    hasClubAdmin: !!clubAdmin,
    clubIdForUser: clubIdForUser || null
  }, "[api/profile/init] No club found for user");

  // Si on arrive ici, l'utilisateur n'a pas de profil joueur
  // Il doit créer son compte via l'inscription joueurs
  return NextResponse.json(
    { error: "Aucun compte joueur trouvé pour cet email. Créez d'abord votre compte via l'inscription joueurs." },
    { status: 404 }
  );
}

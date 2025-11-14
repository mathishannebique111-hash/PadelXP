import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn("[api/profile/init] Missing Supabase service configuration");
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
      console.error("[api/profile/init] bearer auth error", error);
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

  const { data: existing, error } = await serviceClient
    .from("profiles")
    .select("id, club_id, club_slug, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[api/profile/init] fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let clubIdForUser: string | null = null;
  let clubSlugForUser: string | null = null;
  let clubNameForUser: string | null = null;
  let clubLogoForUser: string | null = null;

  const { data: clubAdmin } = await serviceClient
    .from("club_admins")
    .select("club_id, activated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (clubAdmin?.activated_at) {
    clubIdForUser = clubAdmin.club_id;
  } else if (clubAdmin?.club_id && !clubAdmin.activated_at) {
    const { data: activationRow, error: activationError } = await serviceClient
      .from("club_admins")
      .update({ activated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("club_id", clubAdmin.club_id)
      .select("club_id, activated_at")
      .maybeSingle();

    if (activationError) {
      console.error("[api/profile/init] activation update error", activationError);
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
        console.warn("[api/profile/init] owner metadata lookup warning", ownerMetaError);
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
            console.warn("[api/profile/init] metadata update warning (updated profile)", metadataError);
          }
        }

        return NextResponse.json({
          ok: true,
          profile: profilePayload,
        });
      }
      if (updateError) {
        console.warn("[api/profile/init] update warning", updateError);
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
        console.warn("[api/profile/init] metadata update warning", metadataError);
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
  if (clubAdmin && clubIdForUser) {
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
      console.warn("[api/profile/init] metadata update warning (admin without profile)", metadataError);
    }
    
    return NextResponse.json({
      ok: true,
      redirect: "/dashboard",
      profile: null, // Pas de profil joueur
    });
  }

  // Si on arrive ici, l'utilisateur n'a pas de profil joueur
  // Il doit créer son compte via l'inscription joueurs
  return NextResponse.json(
    { error: "Aucun compte joueur trouvé pour cet email. Créez d'abord votre compte via l'inscription joueurs." },
    { status: 404 }
  );
}

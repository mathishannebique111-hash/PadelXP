import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const clubId = params.id;

    console.log('[Admin Actions API] Fetching actions for club:', clubId);

    // Récupérer TOUT l'historique des actions pour ce club (sans limite)
    // D'abord récupérer les actions sans la jointure pour éviter les erreurs
    const { data: actions, error } = await supabaseAdmin
      .from('admin_club_actions')
      .select('id, action_type, action_description, previous_value, new_value, created_at, admin_user_id')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Actions API] Error fetching actions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Admin Actions API] Found', actions?.length || 0, 'actions');

    // Si aucune action, retourner un tableau vide
    if (!actions || actions.length === 0) {
      console.log('[Admin Actions API] No actions found for club:', clubId);
      return NextResponse.json({ actions: [] });
    }

    // Récupérer les profils admin séparément pour éviter les problèmes de jointure
    const adminUserIds = [...new Set(actions.map((a: any) => a.admin_user_id).filter(Boolean))];
    const adminProfilesMap: Record<string, { email?: string; display_name?: string }> = {};

    if (adminUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, display_name')
        .in('id', adminUserIds);

      if (profiles) {
        profiles.forEach((profile: any) => {
          adminProfilesMap[profile.id] = {
            email: profile.email,
            display_name: profile.display_name,
          };
        });
      }
    }

    // Formatter les données pour inclure le nom de l'admin
    const formattedActions = actions.map((action: any) => {
      const adminProfile = adminProfilesMap[action.admin_user_id] || {};
      return {
        ...action,
        admin_name: adminProfile.display_name || adminProfile.email || 'Admin',
      };
    });

    console.log('[Admin Actions API] Returning', formattedActions.length, 'formatted actions');

    return NextResponse.json({ actions: formattedActions });
  } catch (error) {
    console.error('[Admin Actions API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

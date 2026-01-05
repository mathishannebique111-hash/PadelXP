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
    const clubId = params.id;

    // Récupérer TOUT l'historique des actions pour ce club (sans limite)
    const { data: actions, error } = await supabaseAdmin
      .from('admin_club_actions')
      .select(`
        id,
        action_type,
        action_description,
        previous_value,
        new_value,
        created_at,
        admin_user_id,
        admin_profiles:admin_user_id (
          email,
          display_name
        )
      `)
      .eq('club_id', clubId)
      .order('created_at', { ascending: false }); // Plus récentes en premier, mais sans limite

    if (error) {
      console.error('Error fetching admin club actions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Formatter les données pour inclure le nom de l'admin
    const formattedActions = (actions || []).map((action: any) => ({
      ...action,
      admin_name: action.admin_profiles?.display_name || action.admin_profiles?.email || 'Admin inconnu',
    }));

    return NextResponse.json({ actions: formattedActions });
  } catch (error) {
    console.error('Unexpected error in admin club actions API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

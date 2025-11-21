import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[player/profile] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Essayer d'abord avec le client normal
    let profile = null;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[player/profile] Error fetching profile with client:', profileError);
    } else {
      profile = profileData;
    }

    // Si pas de profil trouvé ou erreur, essayer avec le client admin (bypass RLS)
    if (!profile && SUPABASE_URL && SERVICE_ROLE_KEY) {
      const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: adminProfile, error: adminError } = await serviceClient
        .from('profiles')
        .select('id, first_name, last_name, display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (adminError) {
        console.error('[player/profile] Error fetching profile with admin:', adminError);
      } else if (adminProfile) {
        profile = adminProfile;
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      );
    }

    // Utiliser UNIQUEMENT first_name et last_name de la base de données
    // Ne pas extraire depuis display_name - si ces champs sont vides, c'est une erreur
    const first_name = profile.first_name || '';
    const last_name = profile.last_name || '';

    return NextResponse.json({
      id: profile.id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      display_name: profile.display_name,
      hasFirstName: !!first_name && !!first_name.trim(),
      hasLastName: !!last_name && !!last_name.trim(),
      hasCompleteName: !!(first_name && first_name.trim() && last_name && last_name.trim()),
    });
  } catch (error) {
    console.error('[player/profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


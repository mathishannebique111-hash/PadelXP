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
    // Verify admin status
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const clubId = params.id;

    console.log('Fetching club with ID:', clubId);

    // Fetch club details - explicitly include email field
    // Use select('*') to get all fields including any that might be missing
    const { data: club, error } = await supabaseAdmin
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();

    if (error) {
      console.error('Error fetching club from Supabase:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        clubId,
      });
      
      // If club not found, return 404
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Club not found', club: null }, { status: 404 });
      }
      
      return NextResponse.json({ error: error.message, club: null }, { status: 500 });
    }

    if (!club) {
      console.error('Club is null for ID:', clubId);
      return NextResponse.json({ error: 'Club not found', club: null }, { status: 404 });
    }

    // Log to verify email is present
    console.log('Club fetched successfully:', { 
      id: club.id, 
      name: club.name, 
      email: club.email,
      trial_end_date: club.trial_end_date,
      subscription_status: club.subscription_status,
    });

    return NextResponse.json({ club, error: null });
  } catch (error) {
    console.error('Unexpected error in admin club API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

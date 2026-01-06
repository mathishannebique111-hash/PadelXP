import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clubId = searchParams.get('club_id');

    if (!clubId) {
      return NextResponse.json({ error: 'club_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier que l'utilisateur appartient au club
    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    // Vérifier aussi dans la table clubs pour les admins de club
    const { data: club } = await supabase
      .from('clubs')
      .select('id, owner_id')
      .eq('id', clubId)
      .maybeSingle();

    const isAuthorized = 
      profile?.club_id === clubId || 
      club?.owner_id === user.id ||
      user.email === 'contactpadelxp@gmail.com' ||
      user.email === 'mathis.hannebique111@gmail.com';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Récupérer le statut de l'abonnement
    const { data: clubData, error: clubError } = await supabase
      .from('clubs')
      .select('subscription_status, trial_end_date, trial_current_end_date, selected_plan, subscription_started_at')
      .eq('id', clubId)
      .maybeSingle();

    if (clubError) {
      console.error('Error fetching club subscription status:', clubError);
      return NextResponse.json({ error: clubError.message }, { status: 500 });
    }

    return NextResponse.json({
      subscription_status: clubData?.subscription_status || null,
      trial_end_date: clubData?.trial_end_date || null,
      trial_current_end_date: clubData?.trial_current_end_date || null,
      selected_plan: clubData?.selected_plan || null,
      subscription_started_at: clubData?.subscription_started_at || null,
    });
  } catch (error) {
    console.error('Unexpected error in subscription-status API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


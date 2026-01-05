import { createClient as createAdminClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Building2, Calendar, Users, ArrowRight } from 'lucide-react';
import Image from 'next/image';

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

function getSubscriptionStatus(club: any) {
  const now = new Date();
  const trialEnd = club.trial_end_date ? new Date(club.trial_end_date) : null;
  const subscriptionExpires = club.subscription_expires_at ? new Date(club.subscription_expires_at) : null;
  const isSubscriptionActive = club.subscription_status === 'active';
  const isTrialActive = trialEnd && trialEnd > now;

  if (isSubscriptionActive && subscriptionExpires && subscriptionExpires > now) {
    const daysRemaining = Math.ceil((subscriptionExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      type: 'subscription',
      status: 'Abonnement',
      daysRemaining,
      subscriptionType: club.subscription_type || 'monthly',
    };
  } else if (isTrialActive) {
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      type: 'trial',
      status: 'Essai',
      daysRemaining,
    };
  } else {
    return {
      type: 'expired',
      status: 'Expiré',
      daysRemaining: 0,
    };
  }
}

function formatSubscriptionType(type: string | null) {
  if (!type) return 'Mensuel';
  const types: { [key: string]: string } = {
    monthly: 'Mensuel',
    quarterly: 'Trimestriel',
    annual: 'Annuel',
  };
  return types[type] || 'Mensuel';
}

export default async function AdminClubsPage() {
  const { data: clubs, error } = await supabaseAdmin
    .from('clubs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clubs:', error);
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <p className="text-red-600">Erreur lors du chargement des clubs: {error.message}</p>
      </div>
    );
  }

  // Récupérer le nombre de joueurs pour chaque club
  const clubsWithPlayerCount = await Promise.all(
    (clubs || []).map(async (club) => {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', club.id)
        .not('email', 'is', null);
      
      return {
        ...club,
        playerCount: count || 0,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <p className="text-gray-600 mt-1">Gestion de tous les clubs de la plateforme</p>
      </div>

      {clubsWithPlayerCount.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Aucun club enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date d'inscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type d'abonnement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Jours restants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Joueurs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clubsWithPlayerCount.map((club) => {
                  const subscriptionInfo = getSubscriptionStatus(club);
                  const registrationDate = new Date(club.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr key={club.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {club.logo_url ? (
                            <Image
                              src={club.logo_url}
                              alt={club.name}
                              width={40}
                              height={40}
                              className="rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{club.name}</p>
                            <p className="text-sm text-gray-500">{club.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {registrationDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscriptionInfo.type === 'subscription'
                              ? 'bg-green-100 text-green-800'
                              : subscriptionInfo.type === 'trial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {subscriptionInfo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {subscriptionInfo.type === 'subscription'
                          ? formatSubscriptionType(subscriptionInfo.subscriptionType)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {subscriptionInfo.daysRemaining > 0 ? (
                          <span className="font-medium">{subscriptionInfo.daysRemaining} jours</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          {club.playerCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/clubs/${club.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium"
                        >
                          Voir détails
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

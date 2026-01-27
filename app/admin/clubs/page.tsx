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
      <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-6 backdrop-blur-sm">
        <p className="text-red-400">Erreur lors du chargement des clubs: {error.message}</p>
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Clubs & Complexes</h1>
        <p className="text-slate-400 mt-2">Gestion de tous les clubs partenaires de la plateforme.</p>
      </div>

      {clubsWithPlayerCount.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 p-16 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun club enregistré</h3>
          <p className="text-slate-400 max-w-md mx-auto">Les clubs inscrits apparaîtront ici. Ils pourront gérer leurs terrains et membres.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Club
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Date d'inscription
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Type d'abonnement
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Jours restants
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Joueurs
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clubsWithPlayerCount.map((club) => {
                  const subscriptionInfo = getSubscriptionStatus(club);
                  const registrationDate = new Date(club.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr key={club.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          {club.logo_url ? (
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                              <Image
                                src={club.logo_url}
                                alt={club.name}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-slate-500 group-hover:text-slate-300 transition-colors" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white group-hover:text-blue-300 transition-colors">{club.name}</p>
                            <p className="text-sm text-slate-500">{club.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-600" />
                          {registrationDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${subscriptionInfo.type === 'subscription'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : subscriptionInfo.type === 'trial'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                        >
                          {subscriptionInfo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {subscriptionInfo.type === 'subscription'
                          ? formatSubscriptionType(subscriptionInfo.subscriptionType)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {subscriptionInfo.daysRemaining > 0 ? (
                          <span className="font-medium text-white">{subscriptionInfo.daysRemaining} jours</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Users className="w-4 h-4" />
                          {club.playerCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/clubs/${club.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-sm font-medium border border-white/10 hover:border-white/20"
                        >
                          Détails
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
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

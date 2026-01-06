'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Users, CheckCircle2, Clock, XCircle, Plus, Mail, Calendar, History, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Club {
  id: string;
  name: string;
  email: string;
  logo_url: string | null;
  trial_end_date: string | null;
  subscription_expires_at: string | null;
  subscription_status: string | null;
  subscription_type: string | null;
  created_at: string;
}

interface Player {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export default function AdminClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.id as string;

  const [club, setClub] = useState<Club | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!clubId) {
        return;
      }

      try {
        console.log('Fetching club details for ID:', clubId);
        
        // Fetch club details
        const clubResponse = await fetch(`/api/admin/clubs/${clubId}`);
        
        if (!clubResponse.ok) {
          const errorData = await clubResponse.json().catch(() => ({}));
          console.error('Error fetching club - Response not OK:', {
            status: clubResponse.status,
            statusText: clubResponse.statusText,
            error: errorData,
            clubId,
          });
          // Set club to null to show error message
          setClub(null);
          setIsLoading(false);
          return;
        }

        const responseData = await clubResponse.json();
        const { club: clubData, error: clubError } = responseData;

        if (clubError) {
          console.error('Error in club response:', clubError);
          setClub(null);
          setIsLoading(false);
          return;
        }

        if (!clubData) {
          console.error('Club data is null or undefined:', responseData);
          setClub(null);
          setIsLoading(false);
          return;
        }

        console.log('Club data fetched successfully:', { 
          id: clubData.id, 
          name: clubData.name, 
          email: clubData.email,
          trial_end_date: clubData.trial_end_date,
          subscription_status: clubData.subscription_status,
        });

        setClub(clubData as Club);

        // Fetch players via API route to bypass RLS
        const playersResponse = await fetch(`/api/admin/clubs/${clubId}/players`);
        
        if (!playersResponse.ok) {
          const errorData = await playersResponse.json().catch(() => ({}));
          console.error('Error fetching players:', errorData);
          setPlayers([]);
          return;
        }

        const { players: playersData, error: playersError } = await playersResponse.json();

        if (playersError || !playersData) {
          console.error('Error fetching players:', playersError);
          setPlayers([]);
          return;
        }

        setPlayers(playersData || []);

        // Fetch action history
        console.log('Fetching action history for club:', clubId);
        const historyResponse = await fetch(`/api/admin/clubs/${clubId}/actions?t=${Date.now()}`);
        if (historyResponse.ok) {
          const { actions, error: historyError } = await historyResponse.json();
          if (historyError) {
            console.error('Error in action history response:', historyError);
            setActionHistory([]);
          } else {
            console.log('Action history fetched:', actions?.length || 0, 'actions');
            setActionHistory(actions || []);
          }
        } else {
          console.error('Failed to fetch action history:', historyResponse.status);
          const errorText = await historyResponse.text().catch(() => 'Unknown error');
          console.error('Error details:', errorText);
          setActionHistory([]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [clubId, lastAction]);

  // Recharger l'historique périodiquement pour s'assurer qu'il est à jour
  useEffect(() => {
    if (!clubId) return;

    const interval = setInterval(async () => {
      try {
        const historyResponse = await fetch(`/api/admin/clubs/${clubId}/actions?t=${Date.now()}`);
        if (historyResponse.ok) {
          const { actions } = await historyResponse.json();
          if (actions && Array.isArray(actions)) {
            setActionHistory(actions);
          }
        }
      } catch (error) {
        console.error('Error refreshing action history:', error);
      }
    }, 5000); // Recharger toutes les 5 secondes

    return () => clearInterval(interval);
  }, [clubId]);

  async function updateSubscription(action: string) {
    if (!clubId) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Erreur: ${error.error || 'Erreur inconnue'}`);
        setIsUpdating(false);
        return;
      }

      const result = await response.json();
      console.log('Action result:', result);

      // Fermer le dialogue de confirmation immédiatement
      setShowConfirmDialog(null);

      // Si l'API renvoie l'action loggée, l'ajouter immédiatement en haut de l'historique
      if (result?.action && result.action_logged) {
        setActionHistory((prev) => {
          // Vérifier si l'action existe déjà (éviter les doublons)
          const existingIds = new Set(prev.map((a: any) => a.id));
          if (result.action.id && existingIds.has(result.action.id)) {
            return prev;
          }
          // Ajouter la nouvelle action en haut de la liste
          return [result.action, ...prev];
        });
        console.log('✅ Action ajoutée à l\'historique:', result.action.action_description);
      }
      
      // Recharger les données sans recharger toute la page (évite les problèmes de session)
      // Utiliser router.refresh() au lieu de window.location.reload() pour préserver la session
      router.refresh();
      
      // Recharger les données du club
      try {
        const clubResponse = await fetch(`/api/admin/clubs/${clubId}`);
        if (clubResponse.ok) {
          const { club: clubData } = await clubResponse.json();
          if (clubData) {
            setClub(clubData as Club);
          }
        }
      } catch (error) {
        console.error('Error refreshing club data:', error);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  }

  function getSubscriptionStatus() {
    if (!club) return { type: 'expired', status: 'Expiré', daysRemaining: 0 };
    
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <p className="text-red-600">Club non trouvé</p>
        <Link href="/admin/clubs" className="text-blue-600 hover:underline mt-4 inline-block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const subscriptionInfo = getSubscriptionStatus();
  const registrationDate = new Date(club.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/clubs"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
          <p className="text-gray-600 mt-1">Détails et gestion du club</p>
        </div>
      </div>

      {/* Club Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Informations du club</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {club.logo_url ? (
              <Image
                src={club.logo_url}
                alt={club.name}
                width={80}
                height={80}
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
            )}
              <div>
                <p className="font-semibold text-gray-900 text-lg">{club.name}</p>
                {club.email && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{club.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Inscrit le {registrationDate}</span>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Gestion de l'abonnement</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Statut actuel</p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    subscriptionInfo.type === 'subscription'
                      ? 'bg-green-100 text-green-800'
                      : subscriptionInfo.type === 'trial'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {subscriptionInfo.status}
                </span>
                {subscriptionInfo.type === 'subscription' && (
                  <span className="text-sm text-gray-600">
                    ({formatSubscriptionType(subscriptionInfo.subscriptionType)})
                  </span>
                )}
              </div>
              {subscriptionInfo.daysRemaining > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {subscriptionInfo.daysRemaining} jours restants
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmDialog('extend_trial_14d')}
                disabled={isUpdating || showConfirmDialog !== null}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium text-sm border ${
                  showConfirmDialog === 'extend_trial_14d'
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Plus className="w-4 h-4" />
                Prolonger l'essai gratuit de 14j
              </button>
              <button
                onClick={() => setShowConfirmDialog('add_1_month')}
                disabled={isUpdating || showConfirmDialog !== null}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium text-sm border ${
                  showConfirmDialog === 'add_1_month'
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Plus className="w-4 h-4" />
                Ajouter 1 mois d'abonnement
              </button>
              <button
                onClick={() => setShowConfirmDialog('add_3_months')}
                disabled={isUpdating || showConfirmDialog !== null}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium text-sm border ${
                  showConfirmDialog === 'add_3_months'
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Plus className="w-4 h-4" />
                Ajouter 3 mois d'abonnement
              </button>
              <button
                onClick={() => setShowConfirmDialog('add_1_year')}
                disabled={isUpdating || showConfirmDialog !== null}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium text-sm border ${
                  showConfirmDialog === 'add_1_year'
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Plus className="w-4 h-4" />
                Ajouter 1 an d'abonnement
              </button>
              <button
                onClick={() => setShowConfirmDialog('cancel')}
                disabled={isUpdating || showConfirmDialog !== null}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium text-sm col-span-1 sm:col-span-2 ${
                  showConfirmDialog === 'cancel'
                    ? 'bg-yellow-100 border-2 border-yellow-300 text-yellow-900'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <XCircle className="w-4 h-4" />
                Résilier l'abonnement
              </button>
            </div>
          </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer l'action</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir {showConfirmDialog === 'cancel' ? 'résilier' : 'effectuer'} cette action ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => updateSubscription(showConfirmDialog)}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {isUpdating ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Historique des actions</h2>
        </div>

        {actionHistory.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune action enregistrée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionHistory.map((action: any) => {
              const actionDate = new Date(action.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isValidated = !!action.new_value;

              return (
                <div
                  key={action.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {action.action_description}
                        </p>
                        {isValidated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            <Check className="w-3 h-3" />
                            Validée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                            <AlertCircle className="w-3 h-3" />
                            En attente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {actionDate}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Players List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Joueurs ({players.length})</h2>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun joueur enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Photo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {players.map((player) => {
                  const registrationDate = new Date(player.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {player.avatar_url ? (
                          <Image
                            src={player.avatar_url}
                            alt={player.display_name || 'Joueur'}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {player.display_name || `${player.first_name} ${player.last_name}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{player.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{registrationDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

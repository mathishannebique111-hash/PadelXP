'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Target, Send, ArrowLeft, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface SuggestedPair {
  player1_id: string;
  player1_first_name: string;
  player1_last_name: string;
  player1_avatar: string | null;
  player1_level: number;
  player1_winrate: number;
  player2_id: string;
  player2_first_name: string;
  player2_last_name: string;
  player2_avatar: string | null;
  player2_level: number;
  player2_winrate: number;
  pair_avg_level: number;
  pair_avg_winrate: number;
  compatibility_score: number;
}

interface Partner {
  partner_id: string;
  partner: {
    first_name: string;
    last_name: string;
  };
}

export default function FindMatchPage() {
  const [pairs, setPairs] = useState<SuggestedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLevel, setMyLevel] = useState<number>(5);
  const [myPartner, setMyPartner] = useState<Partner | null>(null);
  const [showProposalModal, setShowProposalModal] = useState<SuggestedPair | null>(null);
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le partenaire habituel
      const { data: partnership } = await supabase
        .from('player_partnerships')
        .select('partner_id')
        .eq('player_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (partnership?.partner_id) {
        // Récupérer les infos du partenaire
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', partnership.partner_id)
          .maybeSingle();

        if (partnerProfile) {
          setMyPartner({
            partner_id: partnership.partner_id,
            partner: {
              first_name: partnerProfile.first_name || '',
              last_name: partnerProfile.last_name || ''
            }
          });
        }
      }

      // Récupérer mon niveau (simplifié - utiliser 5.0 par défaut si pas de calcul disponible)
      // TODO: Intégrer avec le système de calcul de niveau réel
      setMyLevel(5.0);

      // Récupérer mon club_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.club_id) {
        // Charger les paires suggérées depuis la vue
        // Note: La vue suggested_pairs doit exister et fonctionner
        const { data } = await supabase
          .from('suggested_pairs')
          .select('*')
          .eq('club_id', profile.club_id)
          .limit(20);

        if (data) {
          setPairs(data as SuggestedPair[]);
        }
      }
    } catch (error) {
      console.error('[FindMatch] Erreur chargement', error);
    } finally {
      setLoading(false);
    }
  };

  const proposeMatch = async () => {
    if (!showProposalModal || !myPartner) return;

    setSending(true);

    try {
      const response = await fetch('/api/match-proposals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: myPartner.partner_id,
          challenged_player1_id: showProposalModal.player1_id,
          challenged_player2_id: showProposalModal.player2_id,
          message: '',
          club_id: null
        })
      });

      if (response.ok) {
        setShowProposalModal(null);
        alert('Proposition envoyée ! 🎾');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('[FindMatch] Erreur proposition', error);
      alert('Erreur réseau');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!myPartner) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-4 safe-area-top">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={22} className="text-gray-300" />
            </button>
            <h1 className="text-lg font-bold text-white">Trouver un match</h1>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-500" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Choisissez un partenaire</h2>
            <p className="text-sm text-gray-400 mb-6">
              Vous devez d'abord avoir un partenaire habituel pour proposer des matchs
            </p>
            <button
              onClick={() => router.push('/home?tab=padel')}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium min-h-[44px] transition-colors"
            >
              Aller sur mon profil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-4 safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={22} className="text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-white">Trouver un match</h1>
        </div>

        {/* Mon binôme */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
          <Users size={16} className="text-blue-400" />
          <span className="text-xs text-gray-400">Vous + {myPartner.partner.first_name}</span>
          <span className="ml-auto text-xs font-semibold text-white">Niv. {myLevel.toFixed(1)}</span>
        </div>
      </div>

      {/* Liste des paires */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20">
        {pairs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Aucune paire disponible</p>
          </div>
        ) : (
          pairs.map((pair, index) => (
            <motion.div
              key={`${pair.player1_id}-${pair.player2_id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900 rounded-2xl p-4 border border-slate-800"
            >
              {/* Badge position */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">#{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={14} className="text-green-400" />
                    <span className="text-xs text-green-400 font-semibold">
                      {pair.compatibility_score.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowProposalModal(pair)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium min-h-[36px] transition-colors"
                >
                  <Send size={14} />
                  Défier
                </button>
              </div>

              {/* Les deux joueurs */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Joueur 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden mb-2">
                    {pair.player1_avatar ? (
                      <Image
                        src={pair.player1_avatar}
                        alt=""
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                        {pair.player1_first_name?.[0]}{pair.player1_last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 truncate w-full">
                    {pair.player1_first_name}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>Niv. {pair.player1_level.toFixed(1)}</span>
                  </div>
                </div>

                {/* Joueur 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden mb-2">
                    {pair.player2_avatar ? (
                      <Image
                        src={pair.player2_avatar}
                        alt=""
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                        {pair.player2_first_name?.[0]}{pair.player2_last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 truncate w-full">
                    {pair.player2_first_name}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>Niv. {pair.player2_level.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Stats du binôme */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-1">Niveau</p>
                  <p className="text-sm font-bold text-white">{pair.pair_avg_level.toFixed(1)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-1">Winrate</p>
                  <p className="text-sm font-bold text-green-400">{pair.pair_avg_winrate.toFixed(0)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-1">vs Vous</p>
                  <p className="text-sm font-bold text-blue-400">
                    {pair.pair_avg_level > myLevel ? '+' : ''}{(pair.pair_avg_level - myLevel).toFixed(1)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de proposition (Bottom Sheet) */}
      <AnimatePresence>
        {showProposalModal && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProposalModal(null)}
              className="fixed inset-0 bg-black/70 z-40"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl z-50 safe-area-bottom"
            >
              <div className="p-6">
                {/* Handle */}
                <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6"></div>

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Proposer un match</h2>
                  <button
                    onClick={() => setShowProposalModal(null)}
                    className="p-2 rounded-lg active:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X size={22} className="text-gray-400" />
                  </button>
                </div>

                {/* Récap */}
                <div className="bg-slate-800 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Users size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Votre équipe</p>
                        <p className="text-sm font-semibold text-white">
                          Vous + {myPartner.partner.first_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center my-3">
                    <div className="text-2xl">⚔️</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Target size={20} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Équipe adverse</p>
                        <p className="text-sm font-semibold text-white">
                          {showProposalModal.player1_first_name} + {showProposalModal.player2_first_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowProposalModal(null)}
                    disabled={sending}
                    className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white py-4 rounded-xl font-medium min-h-[52px] disabled:opacity-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={proposeMatch}
                    disabled={sending}
                    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white py-4 rounded-xl font-medium min-h-[52px] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Send size={20} />
                        Envoyer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

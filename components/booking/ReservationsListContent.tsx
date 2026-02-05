"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Calendar, MapPin, Users, Clock, AlertCircle, X, UserPlus, Check, CreditCard, ChevronDown } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PlayerAutocomplete from "../PlayerAutocomplete";

// ... (Interface Reservation kept implicitly or reused if in same file - wait, ReplaceFileContent replaces block)

interface Reservation {
    id: string;
    is_organizer: boolean;
    payment_status: string;
    amount: number;
    reservation: {
        id: string;
        start_time: string;
        end_time: string;
        status: string;
        payment_method?: string;
        total_price: number;
        expires_at: string | null;
        reservation_participants: { id: string }[];
        court: {
            id: string;
            name: string;
            club: {
                id: string;
                name: string;
            };
        };
    };
}

export default function ReservationsListContent() {
    const supabase = createClientComponentClient();
    const searchParams = useSearchParams();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

    // -- Invite Players State --
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    // Array of 3 player names/IDs. we store object { name, id } to handle UI
    const [playersToAdd, setPlayersToAdd] = useState<{ name: string, id: string | null }[]>([
        { name: "", id: null },
        { name: "", id: null },
        { name: "", id: null }
    ]);
    const [activePlayerInput, setActivePlayerInput] = useState<number | null>(null);
    const [inviting, setInviting] = useState(false);
    const [isPaying, setIsPaying] = useState<string | null>(null);

    const handlePayment = async (reservationId: string) => {
        setIsPaying(reservationId);
        try {
            const res = await fetch(`/api/reservations/${reservationId}/checkout`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                alert("Erreur: " + (data.error || "Impossible d'initialiser le paiement"));
                setIsPaying(null);
            }
        } catch (error) {
            console.error(error);
            alert("Erreur technique");
            setIsPaying(null);
        }
    };

    useEffect(() => {
        loadReservations();
    }, [searchParams]); // Reload when URL specific params change (like tab)

    async function loadReservations() {
        setLoading(true);
        try {
            const response = await fetch("/api/reservations", { credentials: "include" });
            const data = await response.json();

            if (data.reservations) {
                setReservations(data.reservations);
            }
        } catch (error) {
            console.error("Error loading reservations:", error);
        } finally {
            setLoading(false);
        }
    }

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const now = new Date();

    const isReservationValidated = (r: Reservation) => {
        const participants = r.reservation.reservation_participants || [];
        const confirmedCount = participants.filter((p: any) =>
            p.is_organizer || p.payment_status === 'paid' || p.payment_status === 'confirmed'
        ).length;
        return confirmedCount >= 4;
    };

    const filteredReservations = reservations.filter((r) => {
        const startTime = new Date(r.reservation.start_time);

        if (filter === "upcoming") {
            return startTime >= now;
        } else {
            // Past: only validated
            return startTime < now && isReservationValidated(r);
        }
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "confirmed":
                return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Confirmée</span>;
            case "pending_payment":
                return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">En attente</span>;
            case "cancelled":
                return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Annulée</span>;
            case "expired":
                return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">Expirée</span>;
            default:
                return null;
        }
    };

    const handleOpenInvite = (res: Reservation) => {
        setSelectedReservation(res);
        setPlayersToAdd([
            { name: "", id: null },
            { name: "", id: null },
            { name: "", id: null }
        ]);
        setIsInviteOpen(true);
    };

    const handlePlayerSelect = (index: number, player: any) => {
        const newPlayers = [...playersToAdd];
        if (player) {
            newPlayers[index] = { ...newPlayers[index], name: player.display_name, id: player.id };
        } else {
            newPlayers[index] = { ...newPlayers[index], name: "", id: null };
        }
        setPlayersToAdd(newPlayers);
    };

    const handlePlayerChange = (index: number, val: string) => {
        const newPlayers = [...playersToAdd];
        newPlayers[index].name = val;
        if (!val) newPlayers[index].id = null;
        setPlayersToAdd(newPlayers);
    };



    const handleConfirmInvite = async () => {
        if (!selectedReservation) return;

        // Validate all 3 filled
        const ids = playersToAdd.map(p => p.id);
        if (ids.some(id => !id)) return;

        setInviting(true);
        try {
            const res = await fetch(`/api/reservations/${selectedReservation.reservation.id}/players`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ participant_ids: ids })
            });

            if (res.ok) {
                setIsInviteOpen(false);
                loadReservations(); // Refresh list to update UI (hide button)
                // Optional success toast
            } else {
                const err = await res.json();
                alert("Erreur: " + (err.error || "Problème lors de l'envoi des invitations"));
            }
        } catch (error) {
            console.error(error);
            alert("Erreur technique");
        } finally {
            setInviting(false);
        }
    };

    // Check if the reservation needs players: 
    // It is incomplete if participants count < 4.
    // We assume standard match of 4.
    const needsPlayers = (res: Reservation) => {
        // Safe check for array existence
        const count = res.reservation.reservation_participants?.length || 0;
        return count < 4 && res.is_organizer;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-white/60">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="pb-24">

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 sm:gap-4 mb-6 px-4 sm:px-0 overflow-x-auto scrollbar-hide py-1">
                <button
                    onClick={() => setFilter("upcoming")}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${filter === "upcoming"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                        }`}
                >
                    À venir
                </button>
                <button
                    onClick={() => setFilter("past")}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${filter === "past"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                        }`}
                >
                    Passées
                </button>
            </div>

            <div className="space-y-4">
                {filteredReservations.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">
                            {filter === "upcoming"
                                ? "Aucune réservation à venir"
                                : "Aucune réservation passée"}
                        </p>
                    </div>
                ) : (
                    filteredReservations.map((item) => {
                        const participants = item.reservation.reservation_participants || [];
                        // Compter les participants confirmés (Organisateur ou Payé)
                        const confirmedCount = participants.filter((p: any) =>
                            p.is_organizer || p.payment_status === 'paid' || p.payment_status === 'confirmed'
                        ).length;

                        const isValidated = confirmedCount >= 4;
                        const isPast = filter === "past";
                        const Wrapper = isPast ? 'div' : Link;
                        const wrapperProps = isPast ? { className: "block cursor-default" } : { href: `/reservations/${item.reservation.id}`, className: "block" };

                        return (
                            <div key={item.id} className="block bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                                <Wrapper {...(wrapperProps as any)}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-white font-semibold text-base">
                                                {item.reservation.court.club.name}
                                            </h3>
                                            <p className="text-sm text-white/60">{item.reservation.court.name}</p>
                                        </div>
                                        {filter === "upcoming" && (
                                            isValidated
                                                ? <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Validée</span>
                                                : getStatusBadge(item.reservation.status)
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-white/70">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{formatDate(item.reservation.start_time)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>
                                                {formatTime(item.reservation.start_time)} - {formatTime(item.reservation.end_time)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Liste des joueurs et compteur */}
                                    <div className="mt-4 pt-3 border-t border-white/5">
                                        <div className="flex items-center justify-between text-xs mb-3">
                                            <span className="text-white/50">Joueurs</span>
                                            <span className={isValidated ? "text-green-400 font-medium" : "text-blue-400"}>
                                                {confirmedCount}/4 confirmés
                                            </span>
                                        </div>

                                        {/* Grille des joueurs (affichage distinct pour voir les noms) */}
                                        <div className="grid grid-cols-4 gap-1 sm:gap-2">
                                            {participants.map((p: any) => {
                                                const profileData = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                                                const firstName = profileData?.first_name || "Joueur";
                                                const isConfirmed = p.is_organizer || p.payment_status === 'paid' || p.payment_status === 'confirmed';

                                                return (
                                                    <div key={p.id} className="flex flex-col items-center gap-1">
                                                        <div className={`w-8 h-8 rounded-full border border-[#1a1c29] flex items-center justify-center text-xs font-bold text-white relative ${isConfirmed ? 'bg-green-600' : 'bg-gray-600'}`}>
                                                            {profileData?.avatar_url ? (
                                                                <img src={profileData.avatar_url} alt={firstName} className="w-full h-full rounded-full object-cover" />
                                                            ) : (
                                                                <span>{firstName.charAt(0).toUpperCase()}</span>
                                                            )}
                                                            {p.is_organizer && (
                                                                <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5 border border-[#1a1c29]" title="Organisateur">
                                                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                                </div>
                                                            )}
                                                            {isConfirmed && !p.is_organizer && (
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-[#1a1c29] rounded-full"></div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-white/80 truncate w-full text-center">
                                                            {firstName}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {Array.from({ length: Math.max(0, 4 - participants.length) }).map((_, i) => (
                                                <div key={`empty-${i}`} className="flex flex-col items-center gap-1 opacity-50">
                                                    <div className="w-8 h-8 rounded-full border border-dashed border-white/20 bg-white/5 flex items-center justify-center">
                                                        <span className="text-white/20 text-xs">-</span>
                                                    </div>
                                                    <span className="text-[10px] text-white/30">Libre</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {filter === "upcoming" && !isValidated && item.reservation.status === "pending_payment" && item.reservation.expires_at && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1.5 rounded-lg">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>
                                                Expire le {formatDate(item.reservation.expires_at)} à {formatTime(item.reservation.expires_at)}
                                            </span>
                                        </div>
                                    )}
                                </Wrapper>

                                {/* Bouton pour payer sa part (Stripe) */}
                                {filter === "upcoming" && item.reservation.payment_method === 'stripe' && item.payment_status === 'pending' && item.reservation.status === 'pending_payment' && (
                                    <div className="mt-4 border-t border-white/10 pt-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePayment(item.reservation.id);
                                            }}
                                            disabled={isPaying === item.reservation.id}
                                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-lg py-2.5 px-4 text-sm font-semibold shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
                                        >
                                            {isPaying === item.reservation.id ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <CreditCard className="w-4 h-4" />
                                                    <span>Payer ma part ({item.amount}€)</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Bouton pour inviter les joueurs si nécessaire */}
                                {needsPlayers(item) && filter === "upcoming" && (
                                    <div className="mt-4 border-t border-white/10 pt-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenInvite(item);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 px-4 text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Choisir les joueurs
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Popup Invitation des Joueurs */}
            <AnimatePresence>
                {isInviteOpen && (
                    <div className="fixed inset-0 z-[100000] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                                onClick={() => setIsInviteOpen(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 overflow-visible"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-xl font-bold text-white">Inviter des joueurs</h3>
                                    <button
                                        onClick={() => setIsInviteOpen(false)}
                                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/60 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-400 mb-6">Sélectionnez les 3 autres joueurs pour valider la réservation et envoyer les invitations.</p>

                                <div className="space-y-5 pb-40">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="relative" style={{ zIndex: 40 - i }}>
                                            <label className="text-xs font-semibold text-blue-300 uppercase mb-1.5 block">
                                                Joueur {i + 2}
                                            </label>
                                            <PlayerAutocomplete
                                                value={playersToAdd[i].name}
                                                onChange={(val) => handlePlayerChange(i, val)}
                                                onSelect={(player) => handlePlayerSelect(i, player)}
                                                placeholder={`Rechercher joueur ${i + 2}...`}
                                                searchScope="global"
                                                inputClassName="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 transition-all"
                                                isActive={activePlayerInput === i}
                                                onFocus={() => setActivePlayerInput(i)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleConfirmInvite}
                                    disabled={playersToAdd.some(p => !p.id) || inviting}
                                    className={`w-full mt-8 py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${playersToAdd.some(p => !p.id) || inviting
                                        ? "bg-white/10 text-white/30 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                                        }`}
                                >
                                    {inviting ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Valider les joueurs
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

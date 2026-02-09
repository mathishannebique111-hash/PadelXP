"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Check } from "lucide-react";
import Image from "next/image";

interface Club {
    id: string; // Non utilisé pour l'inscription mais utile pour le debug
    name: string;
    slug: string;
    code_invitation: string; // Sera utilisé automatiquement
    logo_url?: string | null;
    city?: string | null;
}

interface ClubSelectorProps {
    onSelect: (club: Club) => void;
    selectedClub?: Club | null;
    className?: string;
}

export default function ClubSelector({ onSelect, selectedClub, className = "" }: ClubSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Charger les clubs au montage
    useEffect(() => {
        async function fetchClubs() {
            setLoading(true);
            try {
                const res = await fetch("/api/clubs/list");
                const data = await res.json();
                if (data.clubs) {
                    setClubs(data.clubs);
                }
            } catch (error) {
                console.error("Erreur chargement clubs:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchClubs();
    }, []);

    // Fermer le dropdown si on clique ailleurs
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filtrer les clubs
    const filteredClubs = clubs.filter((club) =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <label className="block text-[10px] text-white/70 mb-1.5 font-medium ml-1">
                Votre club <span className="text-red-400">*</span>
            </label>

            {/* Bouton qui ouvre le dropdown */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-white/5 border ${isOpen ? "border-[#0066FF] ring-2 ring-[#0066FF]/20" : "border-white/10 hover:border-white/20"
                    } rounded-xl px-4 py-3 text-left transition-all group`}
            >
                <div className="flex items-center gap-3">
                    {selectedClub ? (
                        <>
                            <div className="w-8 h-8 rounded-full bg-white/10 p-1 flex-shrink-0">
                                {selectedClub.logo_url ? (
                                    <div className="relative w-full h-full rounded-full overflow-hidden">
                                        <Image
                                            src={selectedClub.logo_url}
                                            alt={selectedClub.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <MapPin className="w-full h-full text-white/60 p-1" />
                                )}
                            </div>
                            <span className="text-white font-medium text-sm truncate max-w-[200px]">
                                {selectedClub.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                <Search className="w-4 h-4 text-white/40" />
                            </div>
                            <span className="text-white/40 text-sm">Rechercher votre club...</span>
                        </>
                    )}
                </div>

                {/* Chevron */}
                <svg
                    className={`w-4 h-4 text-white/40 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#0066FF]" : "group-hover:text-white/70"
                        }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Liste déroulante */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Champ de recherche interne */}
                    <div className="p-3 border-b border-white/5 sticky top-0 bg-[#1A1A1A] z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Tapez le nom du club..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0066FF] transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Liste des clubs */}
                    <div className="max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {loading ? (
                            <div className="p-8 text-center text-white/40 text-sm">Chargement...</div>
                        ) : filteredClubs.length > 0 ? (
                            filteredClubs.map((club) => {
                                const isSelected = selectedClub?.slug === club.slug;
                                return (
                                    <button
                                        key={club.slug}
                                        type="button"
                                        onClick={() => {
                                            onSelect(club);
                                            setIsOpen(false);
                                            setSearchTerm("");
                                        }}
                                        className={`w-full flex items-center gap-3 p-3 transition-colors ${isSelected ? "bg-[#0066FF]/10" : "hover:bg-white/5"
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-[#0066FF]/20' : 'bg-white/5'}`}>
                                            {club.logo_url ? (
                                                <div className="relative w-full h-full rounded-full overflow-hidden border border-white/10">
                                                    <Image
                                                        src={club.logo_url}
                                                        alt={club.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-sm font-bold text-white/60">{club.name.substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className={`text-sm font-medium ${isSelected ? 'text-[#0066FF]' : 'text-white'}`}>
                                                {club.name}
                                            </div>
                                            {club.city && (
                                                <div className="text-xs text-white/40">{club.city}</div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-[#0066FF]" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-white/40 text-sm">
                                Aucun club trouvé pour "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

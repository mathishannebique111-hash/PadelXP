import React from "react";
import { Flame, User, Search, MapPin, Map as MapIcon, Globe, Eye, Trophy, X, Share2, Medal, Check, Award, Crown, Sparkles, ChevronRight, Clock, FileText, Star, Plus, Key, Copy, Users } from "lucide-react";

// Custom Replicas matching Native App Components
export const ReplicaPageTitle = ({ title, subtitle, icon }: { title: string, subtitle?: string, icon?: React.ReactNode }) => (
    <div className="mb-2">
        <section className="relative overflow-hidden rounded-[8px] border inline-block text-white shadow-sm" style={{ background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(4px)" }}>
            <div className="relative z-10 flex items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    <span className="w-[2.5px] self-stretch rounded-full flex-shrink-0" style={{ background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2))' }} />
                    <div className="flex items-center gap-1.5">
                        {icon && <span className="text-[10px] drop-shadow-sm">{icon}</span>}
                        <h1 className="text-[10px] font-black tracking-tight text-white leading-tight drop-shadow-sm">{title}</h1>
                    </div>
                </div>
            </div>
        </section>
        {subtitle && <p className="mt-1 ml-1 text-[7px] text-white/60 font-semibold">{subtitle}</p>}
    </div>
);

export const ReplicaChallengeBar = ({ title, current, target, isPremium = false }: { title: string, current: number, target: number, isPremium?: boolean }) => {
    const percentage = Math.min(100, Math.round((current / target) * 100));
    const accentColor = isPremium ? 'rgb(245, 158, 11)' : 'rgb(var(--theme-secondary-accent))';

    return (
        <div className="w-full mb-3 animate-fadeIn group">
            <div className="relative p-2 rounded-xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex flex-shrink-0 items-center justify-center w-5 h-5 rounded-full bg-white/5 border border-white/10" style={{ color: accentColor }}>
                                <Trophy size={10} strokeWidth={2.5} />
                            </div>
                            <span className="text-[9px] font-medium text-white/90 truncate">
                                {title}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[8px] text-white/40 font-bold tabular-nums uppercase tracking-wider">
                                {current} / {target}
                            </span>
                            <ChevronRight size={10} className="text-white/20" />
                        </div>
                    </div>
                    <div className="h-0.5 w-full rounded-full bg-black/40 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out relative"
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: accentColor,
                                boxShadow: `0 0 8px ${accentColor}`
                            }}
                        >
                            <div className="absolute inset-0 bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ReplicaPendingMatchCard = ({
    creator,
    date,
    location,
    score,
    team1,
    team2,
    isConfirmed = false,
    winnerTeam = 1
}: {
    creator: string,
    date: string,
    location?: string,
    score: string,
    team1: { name: string, confirmed: boolean }[],
    team2: { name: string, confirmed: boolean }[],
    isConfirmed?: boolean,
    winnerTeam?: number
}) => (
    <div className={`rounded-xl border-2 p-2.5 transition-all duration-500 scale-[0.98] ${isConfirmed ? 'border-green-500 bg-green-50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-blue-400 bg-blue-50'
        }`}>
        <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <div className="flex-shrink-0 rounded-full p-1 bg-blue-100">
                    {isConfirmed ? <Clock className="h-3 w-3 text-blue-600" /> : <FileText className="h-3 w-3 text-blue-600" />}
                </div>
                <div>
                    <div className="text-[8px] font-bold text-gray-900 uppercase">Par {creator}</div>
                    <div className="text-[7px] text-gray-500 font-semibold">{date}</div>
                    {location && <div className="text-[6px] text-gray-400 font-semibold">{location}</div>}
                </div>
            </div>
            <div className="rounded-md bg-white px-1 py-0.5 text-[8px] font-black text-gray-900 tabular-nums shadow-sm border border-gray-100 flex-shrink-0 min-w-[30px] text-center">
                {score}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            <div className={`rounded-lg border p-1.5 ${winnerTeam === 1 ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white'}`}>
                <div className="mb-1 text-[7px] font-black uppercase tracking-wide text-gray-400 flex items-center gap-1">
                    Équipe 1 {winnerTeam === 1 && <Trophy className="h-2 w-2 text-amber-500" />}
                </div>
                <div className="space-y-1">
                    {team1.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-gray-900 truncate">{p.name}</span>
                            {p.confirmed && (
                                <div className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                                    <Check className="h-2 w-2 text-white" strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={`rounded-lg border p-1.5 ${winnerTeam === 2 ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white'}`}>
                <div className="mb-1 text-[7px] font-black uppercase tracking-wide text-gray-400 flex items-center gap-1">
                    Équipe 2 {winnerTeam === 2 && <Trophy className="h-2 w-2 text-amber-500" />}
                </div>
                <div className="space-y-1">
                    {team2.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-gray-900 truncate">{p.name}</span>
                            {p.confirmed && (
                                <div className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                                    <Check className="h-2 w-2 text-white" strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between">
            <div className="text-[7px] font-bold text-gray-400 bg-white/50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="text-green-600">Éq.1 ✓</span>
                <span className="text-gray-200">|</span>
                <span className="text-gray-400">Éq.2 ✗</span>
            </div>
            {isConfirmed ? (
                <div className="flex items-center gap-1 inline-flex items-center rounded-md bg-[#22c55e] px-2 py-1 text-[8px] font-black text-white shadow-sm shadow-green-500/20">
                    CONFIRMÉ <Check size={8} strokeWidth={4} />
                </div>
            ) : (
                <div className="flex items-center gap-1">
                    <button type="button" className="p-1 text-gray-400 bg-white rounded-md border border-gray-100"><X size={8} /></button>
                    <button type="button" className="bg-blue-600 text-white px-2 py-1 rounded-md text-[8px] font-black shadow-sm">CONFIRMER</button>
                </div>
            )}
        </div>
    </div>
);


export const ReplicaPartnerCard = ({ name, level, compatibility, avatarUrl }: { name: string, level: string, compatibility: number, avatarUrl?: string }) => (
    <div className="bg-slate-800/50 rounded-xl p-2 border border-white/10 flex flex-col h-full animate-fadeIn transition-all active:scale-[0.98] min-h-[100px] justify-between">
        <div className="flex flex-col items-center text-center py-0.5">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white/40 border-2 border-white/20 mb-1 shadow-sm overflow-hidden">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover shadow-inner" />
                ) : (
                    <User size={14} />
                )}
            </div>
            <h4 className="font-black text-white text-[7px] leading-tight mb-0.5 line-clamp-1 w-full px-0.5 italic">
                {name}
            </h4>
            <div className="inline-flex items-center justify-center bg-white/10 rounded-full px-1.5 py-0.5 mb-1 border border-white/10">
                <span className="text-[6px] text-white/90 font-black">Niveau {level}</span>
            </div>
            <div className="w-full max-w-[70px] flex items-center gap-1">
                <div className="h-0.5 flex-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_6px_#22c55e]"
                        style={{ width: `${compatibility}%` }}
                    />
                </div>
                <span className="text-[6px] font-black text-green-400">{compatibility}%</span>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-1 mt-1">
            <button type="button" className="py-1 px-0 border border-white/10 text-white rounded-lg flex items-center justify-center hover:bg-white/5 active:bg-white/10 h-5 transition-colors"><Eye size={9} /></button>
            <button type="button" className="py-1 px-0 rounded-lg flex items-center justify-center transition-all h-5 bg-[rgb(var(--theme-secondary-accent))] text-[#071554] shadow-md hover:brightness-110"><User size={9} className="fill-current" /></button>
        </div>
    </div>
);

export const Tabs = ({ items, activeIdx, onChange }: { items: string[], activeIdx: number, onChange?: (idx: number) => void }) => (
    <div className="flex items-center w-full mb-3 border-b" style={{ borderColor: 'rgb(var(--theme-text) / 0.1)' }}>
        {items.map((item, i) => (
            <button
                key={item}
                type="button"
                onClick={() => onChange?.(i)}
                className={`flex-1 py-1.5 text-[7px] font-black transition-all duration-200 relative text-center uppercase tracking-tighter cursor-pointer`}
                style={{ color: i === activeIdx ? "var(--theme-text)" : "var(--theme-text-muted)" }}
            >
                <span className="flex items-center justify-center gap-1">{item}</span>
                {i === activeIdx && <div className="absolute bottom-0 left-0 right-0 h-[1.5px]" style={{ background: "rgb(var(--theme-secondary-accent))", boxShadow: "0 0 4px rgb(var(--theme-secondary-accent) / 0.4)" }} />}
            </button>
        ))}
    </div>
);

// Screens
export const ProfilePreview = ({ clubName, clubCity, clubData, logoUrl }: { clubName?: string, clubCity?: string, clubData?: { street?: string, postalCode?: string, phone?: string, numberOfCourts?: string, courtType?: string }, logoUrl?: string | null }) => {
    const [activeTab, setActiveTab] = React.useState(0);
    const displayClubName = clubName || 'Padel Club Amiens';
    const displayCity = clubCity || 'Amiens';
    const displayStreet = clubData?.street || '2 Rue de la Vallée';
    const displayPostal = clubData?.postalCode || '80000';
    const displayPhone = clubData?.phone || '03 22 XX XX XX';
    const displayCourts = clubData?.numberOfCourts || '6';
    const displayCourtType = clubData?.courtType || 'Couverts';
    const displayLogoUrl = logoUrl || '/images/Logo sans fond.png';
    return (
        <div className="w-full h-full overflow-y-auto pb-4 animate-fadeIn font-sans pt-2">

            {/* Real PageTitle Replica */}
            <div className="px-1 mb-2">
                <ReplicaPageTitle title="Bienvenue Lilian Richard !" />
            </div>

            <Tabs items={["Profil", "Stats", "Badges", "Club"]} activeIdx={activeTab} onChange={setActiveTab} />

            {activeTab === 0 && (
                <div className="animate-fadeIn px-1 space-y-2">
                    {/* PROFILE CONTENT (Circular Gauge Wrapper) */}
                    <div className="bg-white/5 rounded-[12px] border border-white/20 p-2 sm:p-2.5">
                        <div className="flex flex-col items-center">
                            <div className="relative w-24 h-24 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(185,255,0,0.05)] bg-slate-900/50 backdrop-blur-md">
                                {/* Gauge SVG */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/10" />
                                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgb(var(--theme-secondary-accent))" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={289 - (289 * 0.49)} className="opacity-80 drop-shadow-[0_0_6px_rgba(204,255,0,0.4)]" />
                                </svg>
                                <div className="flex flex-col items-center justify-center z-10 text-center">
                                    <span className="text-[5px] uppercase tracking-[0.3em] font-medium text-[rgb(var(--theme-secondary-accent))]/80 mb-0.5">Niveau</span>
                                    <span className="text-2xl font-black text-white leading-none tracking-tighter drop-shadow-md">6.49</span>
                                </div>
                            </div>

                            <div className="w-full space-y-1.5">
                                {/* Share button replica */}
                                <button type="button" className="w-full py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-black text-[7px] uppercase tracking-wider bg-[rgb(var(--theme-secondary-accent))] text-[#071554] shadow-md shadow-[rgb(var(--theme-secondary-accent))]/20 active:scale-95 transition-all">
                                    <Share2 size={9} className="stroke-[2.5px]" />
                                    PARTAGER MON PROFIL
                                </button>

                                <div className="pt-1.5">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[5px] font-medium text-white/50 uppercase tracking-wide">Vers niveau 7</span>
                                        <span className="text-[6px] font-semibold text-[rgb(var(--theme-secondary-accent))]">49%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500 bg-[rgb(var(--theme-secondary-accent))]" style={{ width: "49%" }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* About details: High Fidelity Replica with rounded-2xl & green icons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="rounded-2xl border border-white/30 bg-white/5 p-3 flex items-center gap-2.5">
                            <Flame className="w-5 h-5 text-[rgb(var(--theme-secondary-accent))] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[5px] text-white/50 uppercase tracking-widest font-black mb-0.5">Niveau</div>
                                <div className="text-[6px] font-black text-white leading-tight">Compétition</div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/30 bg-white/5 p-3 flex items-center gap-2.5">
                            <User className="w-5 h-5 text-[rgb(var(--theme-secondary-accent))] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[5px] text-white/50 uppercase tracking-widest font-black mb-0.5">Main</div>
                                <div className="text-[8px] font-black text-white leading-tight">Droitier</div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/30 bg-white/5 p-3 flex items-center gap-2.5">
                            <MapIcon className="w-5 h-5 text-[rgb(var(--theme-secondary-accent))] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[5px] text-white/50 uppercase tracking-widest font-black mb-0.5">Côté Préféré</div>
                                <div className="text-[8px] font-black text-white leading-tight">Gauche</div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/30 bg-white/5 p-3 flex items-center gap-2.5">
                            <Trophy className="w-5 h-5 text-[rgb(var(--theme-secondary-accent))] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[5px] text-white/50 uppercase tracking-widest font-black mb-0.5">Coup Signature</div>
                                <div className="text-[8px] font-black text-white leading-tight">Smash</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 1 && (
                <div className="animate-fadeIn px-1 space-y-3 pb-4">
                    {/* Stats Header with Tier */}
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[8px] font-black tracking-[0.2em] text-white/40 uppercase">Mes Statistiques</h2>
                        <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white text-[6px] font-black shadow-sm flex items-center gap-1">
                            <Crown size={7} /> CHAMPION
                        </div>
                    </div>

                    {/* Lilian's Streak Card Component Clone */}
                    <div className="relative rounded-lg border px-3 py-2 overflow-hidden shadow-sm bg-gradient-to-br from-padel-green/10 via-black/40 to-black/20" style={{ borderColor: "rgb(var(--theme-secondary-accent))" }}>
                        <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex-1">
                                <div className="text-[6px] font-medium text-[rgb(var(--theme-secondary-accent))] uppercase mb-1 tracking-[0.15em]">Série de victoires en cours</div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-white tabular-nums leading-none">5</span>
                                    <span className="text-[7px] text-white/80 uppercase tracking-[0.1em]">victoires</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 relative">
                                <div className="relative z-10">
                                    <Flame size={20} className="text-white drop-shadow-[0_0_8px_rgba(204,255,0,0.6)]" strokeWidth={1.5} />
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 pointer-events-none">
                                    <Flame size={40} className="text-[rgb(var(--theme-secondary-accent))]/20 blur-[1px] transform scale-125" strokeWidth={3} />
                                </div>
                                <div className="text-[6px] text-white/80 mt-1">
                                    Meilleure : <span className="font-semibold tabular-nums text-[rgb(var(--theme-secondary-accent))]">18</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exact 8-cell Grid Replica */}
                    <div className="grid grid-cols-2 gap-2 text-[7px] sm:text-xs">
                        {/* Points */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Points</div>
                            <div className="text-xl font-black text-[#172554] tabular-nums leading-none">695</div>
                        </div>
                        {/* Matchs */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Matchs</div>
                            <div className="text-xl font-black text-[#172554] tabular-nums leading-none">64</div>
                        </div>
                        {/* Victoires */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Victoires</div>
                            <div className="text-xl font-black text-[#172554] tabular-nums leading-none">55</div>
                        </div>
                        {/* Défaites */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Défaites</div>
                            <div className="text-xl font-black text-[#172554] tabular-nums leading-none">9</div>
                        </div>
                        {/* Sets gagnés */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Sets gagnés</div>
                            <div className="text-xl font-black text-[#172554] tabular-nums leading-none">110</div>
                        </div>
                        {/* Sets perdus */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Sets perdus</div>
                            <div className="text-xl font-black text-[#172554] tabular-nums leading-none">22</div>
                        </div>
                        {/* Winrate */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Winrate</div>
                            <div className="text-xl font-black tabular-nums leading-none flex items-center" style={{ background: "linear-gradient(to right, #10B981, #059669)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                                <span className="inline-block mr-0.5" style={{ WebkitTextFillColor: "initial", color: "#10B981" }}>↗</span>
                                85%
                            </div>
                        </div>
                        {/* Badges */}
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start" style={{ borderLeftWidth: '4px', borderLeftColor: 'rgb(var(--theme-secondary-accent))' }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] text-[#172554]/70 mb-1 font-medium">Badges</div>
                            <div className="text-xl font-black text-[#172554] tabular-nums leading-none">15</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn space-y-3 px-1 pb-6">
                    {/* Badge Summary Header Clone from BadgesView.tsx */}
                    <div className="mb-3 rounded-xl border border-white/20 px-3 py-2 sm:px-4 sm:py-3 shadow-sm bg-white/10 backdrop-blur-sm max-w-[200px] mx-auto">
                        <div className="flex items-center justify-between gap-1">
                            {/* Left: Progression */}
                            <div className="text-center w-14 flex-shrink-0">
                                <div className="text-xl font-bold text-white tabular-nums flex items-baseline justify-center">
                                    15
                                    <span className="text-[10px] text-white/40 ml-0.5">/ 33</span>
                                </div>
                                <div className="text-[7px] font-semibold text-white/80 uppercase">Badges</div>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-white/30 flex-shrink-0"></div>

                            {/* Right: Breakdown - shifted slightly right */}
                            <div className="flex-1 flex justify-around items-center gap-1 min-w-0 pl-1">
                                <div className="text-center">
                                    <div className="text-[12px] font-bold text-white tabular-nums">15</div>
                                    <div className="text-[5px] font-medium text-white/80 uppercase tracking-tighter">Standard</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[12px] font-bold text-white tabular-nums">0</div>
                                    <div className="text-[5px] font-medium text-white/80 uppercase tracking-tighter">Challenge</div>
                                </div>
                                <div className="text-center opacity-50">
                                    <div className="text-[12px] font-bold text-amber-400 tabular-nums">0</div>
                                    <div className="text-[5px] font-medium text-amber-400/90 uppercase tracking-tighter">Premium</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Buttons - Resized and Renamed */}
                    <div className="flex justify-center gap-2 mb-3">
                        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[5.5px] font-black transition-all whitespace-nowrap bg-[#172554] text-blue-200 border border-blue-400/50 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/50">
                            <Award size={9} />
                            GÉNÉRAL
                        </button>
                        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[5.5px] font-black transition-all whitespace-nowrap bg-white/10 text-white/60">
                            <Trophy size={9} />
                            CHALLENGES
                        </button>
                    </div>

                    {/* Exact Badge Cards Replica - Icon based */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { icon: Award, title: "Pionnier", desc: "Soyez parmi les premiers membres de PadelXP", color: "#FBBF24" },
                            { icon: Trophy, title: "Champion Club", desc: "Remportez un tournoi interne", color: "#CCFF00" },
                            { icon: Flame, title: "Série de 5", desc: "Gagnez 5 matchs consécutifs", color: "#F97316" },
                            { icon: Crown, title: "Maître", desc: "Atteignez le niveau 7.00", color: "#A855F7" },
                        ].map((b, i) => (
                            <div key={i} className="group relative rounded-xl border border-blue-500/30 bg-white/95 px-2 pt-3 pb-2 transition-all flex flex-col h-[110px] items-center text-center overflow-hidden shadow-sm">
                                <div className="flex-shrink-0 mb-1.5 h-[32px] flex items-center justify-center">
                                    <b.icon size={28} className="text-gray-900" strokeWidth={2.5} />
                                </div>
                                <div className="flex-shrink-0 flex flex-col items-center justify-center min-h-0 max-h-[50px] mb-1 px-1">
                                    <h3 className="text-[8px] font-black leading-tight mb-0.5 text-gray-900 line-clamp-2">
                                        {b.title}
                                    </h3>
                                    <p className="text-[6px] leading-[1.1] text-gray-400 font-bold line-clamp-2">
                                        {b.desc}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 w-full mt-auto">
                                    <div className="w-full rounded-md px-1 py-1 text-[7px] font-black tabular-nums bg-green-50 text-green-600 flex items-center justify-center gap-0.5 border border-green-100">
                                        ✓ DÉBLOQUÉ
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 3 && (
                <div className="animate-fadeIn space-y-2 px-1 pb-4">
                    {/* Club Header */}
                    <div className="rounded-xl border border-white/10 p-2.5 bg-gradient-to-br from-[rgba(8,30,78,0.88)] to-[rgba(4,16,46,0.92)]">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img src={displayLogoUrl} className="w-6 h-6 object-contain opacity-60" />
                            </div>
                            <h3 className="text-[9px] font-black text-white uppercase tracking-tight leading-tight">{displayClubName}</h3>
                        </div>
                    </div>

                    {/* Coordonnées + Infrastructure */}
                    <div className="rounded-xl border border-blue-400/30 p-2.5 bg-gradient-to-br from-[rgba(8,30,78,0.88)] to-[rgba(4,16,46,0.92)] shadow-lg">
                        <div className="grid grid-cols-2 gap-2">
                            {/* Coordonnées */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-[5px] font-semibold uppercase tracking-[0.2em] text-white/90">Coordonnées</h4>
                                    <span className="text-[5px] font-semibold uppercase text-white/70">Site ↗</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex flex-col items-center gap-0.5 text-center">
                                        <MapPin size={8} className="text-white/60" />
                                        <span className="text-[5px] font-medium text-white/90 leading-tight">{displayStreet}, {displayPostal} {displayCity}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5 text-center">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2 h-2 text-white/60"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        <span className="text-[5px] font-medium text-white/90">{displayPhone}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Infrastructure */}
                            <div>
                                <h4 className="text-[5px] font-semibold uppercase tracking-[0.2em] text-white/90 mb-1.5">Infrastructure</h4>
                                <div className="space-y-1 mt-2">
                                    <div className="flex items-center justify-between rounded-md bg-white px-1.5 py-1 text-[#071554]">
                                        <span className="uppercase tracking-[0.15em] text-[5px] font-bold">Terrains</span>
                                        <span className="font-extrabold text-[6px]">{displayCourts}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-md bg-white px-1.5 py-1 text-[#071554]">
                                        <span className="uppercase tracking-[0.15em] text-[5px] font-bold">Type</span>
                                        <span className="font-extrabold text-[6px]">{displayCourtType}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Horaires d'ouverture */}
                    <div className="rounded-xl border border-blue-400/30 p-2.5 bg-gradient-to-br from-[rgba(8,30,78,0.88)] to-[rgba(4,16,46,0.92)] shadow-lg">
                        <h4 className="text-[5px] font-semibold uppercase tracking-[0.2em] text-white/90 mb-1.5">Horaires d'ouverture</h4>
                        <div className="space-y-0.5">
                            {[
                                { day: 'Lundi', hours: '08:00 \u2013 22:00', open: true },
                                { day: 'Mardi', hours: '08:00 \u2013 22:00', open: true },
                                { day: 'Mercredi', hours: '08:00 \u2013 22:00', open: true },
                                { day: 'Jeudi', hours: '08:00 \u2013 22:00', open: true },
                                { day: 'Vendredi', hours: '08:00 \u2013 23:00', open: true },
                                { day: 'Samedi', hours: '09:00 \u2013 23:00', open: true },
                                { day: 'Dimanche', hours: 'Fermé', open: false },
                            ].map((h) => (
                                <div key={h.day} className={`flex items-center justify-between rounded-md border px-1.5 py-0.5 text-[5px] font-semibold ${h.open ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50' : 'border-rose-400/30 bg-rose-500/10 text-rose-100'}`}>
                                    <span className="uppercase tracking-[0.15em] text-white">{h.day}</span>
                                    <span className="text-white">{h.hours}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Partir du club */}
                    <div className="flex justify-center pt-1">
                        <span className="text-[5px] text-white/30 underline underline-offset-2">Partir de ce club</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MatchesPreview = ({ clubName, clubCity }: { clubName?: string, clubCity?: string }) => {
    const [activeTab, setActiveTab] = React.useState(1);
    const displayName = clubName || 'Padel Club Amiens';
    const displayCity = clubCity || 'AMIENS';
    return (
        <div className="w-full h-full overflow-y-auto pb-4 animate-fadeIn font-sans pt-2">
            <div className="px-1 mb-2">
                <ReplicaPageTitle title="Matchs" subtitle={`Club : ${displayName}`} icon={<Check size={10} className="stroke-[3px]" />} />
            </div>

            <div className="px-1 mb-1">
                <ReplicaChallengeBar title="Partenaires Variés" current={2} target={2} />
            </div>

            <div className="flex w-full mb-3 border-b border-white/10">
                {["Enregistrer", "Mes matchs", "Partenaires", "Oracle"].map((tab, i) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(i)}
                        className={`flex-1 py-1.5 text-[6px] font-semibold transition-all duration-200 relative flex items-center justify-center ${activeTab === i ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                    >
                        <div className="relative flex items-center justify-center px-1">
                            <span className="text-center whitespace-normal leading-tight">{tab}</span>
                            {i === 1 && (
                                <span className="absolute -top-1 -right-2 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-red-500 text-[5px] font-bold text-white shadow-sm border border-[#172554]">
                                    2
                                </span>
                            )}
                        </div>
                        {activeTab === i && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_0_8px_rgba(204,255,0,0.4)]" style={{ background: "rgb(var(--theme-secondary-accent))" }} />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 0 && (
                <div className="animate-fadeIn px-1 space-y-3">
                    <div className="w-full">
                        <label className="mb-0.5 ml-1 block text-[6px] font-black uppercase tracking-widest text-white/50">Lieu du match</label>
                        <div className="w-full h-7 rounded-lg border border-white/20 px-2 text-[8px] font-bold flex items-center shadow-inner bg-white/5 text-white">
                            {displayName}
                        </div>
                        <p className="mt-0.5 text-[6px] font-black ml-1 flex items-center gap-1 uppercase tracking-wider" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>
                            <MapPin size={6} /> {displayCity.toUpperCase()}
                        </p>
                    </div>

                    <div className="py-1">
                        <div className="flex items-center justify-center gap-1.5 w-full">
                            {/* Team 1 */}
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <div className="grid grid-cols-2 gap-1 w-full relative">
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[5px] font-black uppercase tracking-widest text-white/50 bg-[#172554] px-1 z-10 w-max">Équipe 1</div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border border-[rgb(var(--theme-secondary-accent))] bg-[rgb(var(--theme-secondary-accent))]/10 pt-1">
                                        <div className="w-5 h-5 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white">
                                            <User size={10} />
                                        </div>
                                        <span className="text-[5px] font-black uppercase mt-0.5 text-white text-center leading-tight truncate w-full px-0.5">Lilian</span>
                                        <div className="absolute top-0.5 left-0.5 px-0.5 rounded text-[5px] font-black bg-[rgb(var(--theme-secondary-accent))]/20 text-[rgb(var(--theme-secondary-accent))]">6.49</div>
                                    </div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border border-white/10 bg-white/5 group border-dashed pt-1">
                                        <Search size={8} className="text-white/40" />
                                        <span className="text-[4px] font-black uppercase mt-0.5 text-white/40">AJOUTER</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-[5px] font-black uppercase ring-1 px-1 py-0.5 rounded-[4px] shadow-lg mt-2" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: '#071554', boxShadow: "0 0 0 1px #071554" }}>VS</div>

                            {/* Team 2 */}
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <div className="grid grid-cols-2 gap-1 w-full relative">
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[5px] font-black uppercase tracking-widest text-white/50 bg-[#172554] px-1 z-10 w-max">Équipe 2</div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border border-white/10 bg-white/5 border-dashed">
                                        <Search size={8} className="text-white/40" />
                                    </div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border border-white/10 bg-white/5 border-dashed">
                                        <Search size={8} className="text-white/40" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="ml-1 block text-[6px] font-black uppercase tracking-widest text-white/50">Équipe gagnante</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button type="button" className="rounded-lg border-2 py-1.5 text-[6px] font-black flex items-center justify-center gap-1 uppercase transition-all scale-[0.98] bg-white/5 border-white/10 text-white">
                                <Trophy size={8} /> Équipe 1
                            </button>
                            <button type="button" className="rounded-lg border-2 py-1.5 text-[6px] font-black flex items-center justify-center gap-1 uppercase transition-all scale-[0.98] bg-white/5 border-white/10 text-white">
                                <Trophy size={8} /> Équipe 2
                            </button>
                        </div>
                    </div>

                    <button type="button" className="w-full rounded-xl py-2 font-black text-[#071554] text-[7px] uppercase tracking-widest shadow-lg mt-2" style={{ background: "rgb(var(--theme-secondary-accent))" }}>
                        ENREGISTRER LE MATCH
                    </button>
                </div>
            )}

            {activeTab === 1 && (
                <div className="space-y-3 animate-fadeIn px-1 pb-4">
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                        <h3 className="text-[8px] font-black uppercase italic text-white leading-tight">Matchs en attente de confirmation</h3>
                        <span className="rounded-full bg-[#f59e0b] px-1 py-0.5 text-[6px] font-black text-white shadow-sm">2</span>
                    </div>

                    <ReplicaPendingMatchCard
                        creator="Lilian Richard"
                        date="14 février 2026 • 23:13"
                        location={displayName}
                        score="3-0"
                        team1={[{ name: "Lilian Richard", confirmed: true }, { name: "Sarah Mazette", confirmed: true }]}
                        team2={[{ name: "Paul Loret", confirmed: false }, { name: "Thomas Dutronc", confirmed: false }]}
                    />

                    <div className="flex items-center gap-1.5 mb-1 mt-2 px-1">
                        <h3 className="text-[8px] font-black uppercase italic text-white leading-tight">Matchs validés</h3>
                    </div>

                    <ReplicaPendingMatchCard
                        creator="Lilian Richard"
                        date="22 janvier 2026 • 14:30"
                        location={displayName}
                        score="2-0"
                        team1={[{ name: "Lilian Richard", confirmed: true }, { name: "Joueur", confirmed: true }]}
                        team2={[{ name: "Paul Loret", confirmed: false }, { name: "Sarah Mazette", confirmed: true }]}
                        isConfirmed={true}
                    />
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn space-y-4 px-1 pb-4">
                    <h2 className="text-[11px] font-black text-white italic px-1">Trouve ton partenaire</h2>

                    <div className="bg-[#172554] border border-white/10 rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[9px] font-black text-white">Partenaires suggérés</h3>
                            <div className="flex bg-[#071554] p-0.5 rounded-lg border border-white/5 items-center">
                                <div className="px-2 py-1 rounded-md text-[7px] font-black bg-blue-600 text-white shadow-sm flex items-center justify-center h-full">Mon Club</div>
                                <div className="px-2 py-1 rounded-md text-[7px] font-black text-white/40 flex items-center justify-center h-full">Département</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <ReplicaPartnerCard name="Mathis Leclerc" level="6.00" compatibility={98} />
                            <ReplicaPartnerCard name="Théo Caron" level="5.00" compatibility={73} />
                            <ReplicaPartnerCard name="Julien Bernard" level="4.80" compatibility={65} />
                            <ReplicaPartnerCard name="Sarah Mazette" level="5.20" compatibility={89} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 3 && (
                <div className="animate-fadeIn px-1 space-y-3">
                    <div className="rounded-2xl border border-white/10 p-4 bg-[#172554] shadow-xl text-center">
                        <Sparkles className="w-8 h-8 text-[rgb(var(--theme-secondary-accent))] mx-auto mb-2 drop-shadow-[0_0_8px_rgba(204,255,0,0.4)]" />
                        <h3 className="text-[11px] font-black text-white uppercase italic mb-1">Oracle AI</h3>
                        <p className="text-[8px] text-white/60 leading-relaxed italic">
                            Analyse de vos performances en cours...<br />
                            Prédictions basées sur vos 24 derniers matchs.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export const CompetitionPreview = ({ clubName }: { clubName?: string }) => {
    const [activeTab, setActiveTab] = React.useState(0);
    const displayName = clubName || 'Padel Club Amiens';
    return (
        <div className="w-full h-full overflow-y-auto pb-4 animate-fadeIn font-sans pt-2">
            <div className="px-1 mb-2">
                <ReplicaPageTitle title="Espace Compétition" subtitle={`Club : ${displayName}`} />
            </div>

            <div className="flex w-full mb-3 border-b border-white/10">
                {["Classement", "Challenges", "Ligues"].map((tab, i) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(i)}
                        className={`flex-1 py-1.5 text-[6px] font-semibold transition-all duration-200 relative flex items-center justify-center ${activeTab === i ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                    >
                        <div className="relative flex items-center justify-center px-1">
                            <span className="text-center whitespace-normal leading-tight">{tab}</span>
                            {i === 1 && (
                                <span className="absolute -top-1 -right-2 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-red-500 text-[5px] font-bold text-white shadow-sm border border-[#172554]">
                                    4
                                </span>
                            )}
                        </div>
                        {activeTab === i && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_0_8px_rgba(204,255,0,0.4)]" style={{ background: "rgb(var(--theme-secondary-accent))" }} />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 0 && (
                <div className="space-y-4 px-1 pb-4">
                    {/* Rank filter: Super compact */}
                    <div className="flex items-center justify-center gap-1 px-1 mb-1">
                        {[
                            { key: 'club', label: 'Club', icon: Search },
                            { key: 'department', label: 'Département', icon: MapPin },
                            { key: 'region', label: 'Région', icon: MapIcon },
                            { key: 'france', label: 'France', icon: Globe },
                        ].map((f, i) => {
                            const active = i === 1;
                            return (
                                <button
                                    key={f.key}
                                    type="button"
                                    className={`flex items-center gap-1 px-1 py-1 rounded-full text-[5px] font-black transition-all whitespace-nowrap border ${active
                                        ? 'bg-[#1e293b] text-[rgb(var(--theme-secondary-accent))] border-[rgb(var(--theme-secondary-accent))]/40 shadow-[0_0_5px_rgba(var(--theme-secondary-accent),0.2)]'
                                        : 'bg-[#1e293b] text-white/40 border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <f.icon size={6} className={active ? "text-[rgb(var(--theme-secondary-accent))]" : ""} />
                                    <span>{f.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Top joueurs du moment podium */}
                    <div className="space-y-3 px-1">
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-[1px] flex-1 bg-white/10" />
                            <span className="text-[7px] font-black text-white/60 uppercase tracking-widest italic">Top joueurs du moment</span>
                            <div className="h-[1px] flex-1 bg-white/10" />
                        </div>

                        <div className="flex items-center justify-between gap-1 mb-2">
                            {/* #2 - Mathis L. (Left) - Silver */}
                            <div className="flex-1 rounded-2xl p-2 h-20 flex flex-col items-center justify-end relative shadow-lg bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border border-slate-100/50">
                                <div className="w-8 h-8 rounded-full border border-white/80 bg-slate-100 flex items-center justify-center mb-1 shadow-inner overflow-hidden">
                                    <User size={16} className="text-slate-400" />
                                </div>
                                <span className="text-[6px] font-black text-slate-800 uppercase italic">Mathis L.</span>
                            </div>

                            {/* #1 - Lilian R. (Center) - Gold */}
                            <div className="flex-[1.1] rounded-2xl p-2.5 h-24 flex flex-col items-center justify-end relative shadow-2xl z-10 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 border border-yellow-200/50">
                                <div className="w-12 h-12 rounded-full border border-white bg-yellow-50 flex items-center justify-center mb-1 shadow-xl overflow-hidden text-yellow-600">
                                    <User size={24} />
                                </div>
                                <span className="text-[7px] font-black text-yellow-900 uppercase italic">Lilian R.</span>
                            </div>

                            {/* #3 - Sarah M. (Right) - Bronze */}
                            <div className="flex-1 rounded-2xl p-2 h-18 flex flex-col items-center justify-end relative shadow-lg bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 border border-orange-300/50">
                                <div className="w-8 h-8 rounded-full border border-white/80 bg-orange-50 flex items-center justify-center mb-1 shadow-inner overflow-hidden">
                                    <User size={16} className="text-orange-600" />
                                </div>
                                <span className="text-[6px] font-black text-orange-950 uppercase italic">Sarah M.</span>
                            </div>
                        </div>
                    </div>

                    {/* Classement global table */}
                    <div className="space-y-3 px-1">
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-[1px] flex-1 bg-white/10" />
                            <span className="text-[7px] font-black text-white/60 uppercase tracking-widest italic">Classement global</span>
                            <div className="h-[1px] flex-1 bg-white/10" />
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-2 py-2 text-[6px] font-black uppercase text-slate-500 w-10">Rang</th>
                                        <th className="px-1 py-2 text-[6px] font-black uppercase text-slate-500">Joueur</th>
                                        <th className="px-1 py-2 text-center text-[6px] font-black uppercase text-slate-500">Niveau</th>
                                        <th className="px-1 py-2 text-center text-[6px] font-black uppercase text-slate-500">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 italic">
                                    {[
                                        { rank: 1, name: "Lilian R.", level: 6.49, points: 695, isUser: true },
                                        { rank: 2, name: "Mathis L.", level: 6.00, points: 419 },
                                        { rank: 3, name: "Sarah M.", level: 5.81, points: 302 },
                                        { rank: 4, name: "Lucas B.", level: 5.45, points: 215 },
                                        { rank: 5, name: "Mattias V.", level: 5.26, points: 173 },
                                    ].map((p, idx) => (
                                        <tr key={idx} className={`${p.isUser ? "bg-blue-50/80" : "bg-white"} hover:bg-slate-50 transition-colors`}>
                                            <td className="px-2 py-1.5">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black shadow-sm ${p.rank === 1 ? "bg-yellow-100 text-yellow-700 border border-yellow-200" :
                                                    p.rank === 2 ? "bg-slate-100 text-slate-700 border border-slate-200" :
                                                        p.rank === 3 ? "bg-orange-100 text-orange-700 border border-orange-200" :
                                                            "text-slate-400"
                                                    }`}>
                                                    #{p.rank}
                                                </div>
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden">
                                                        <User size={10} className="text-slate-400" />
                                                    </div>
                                                    <span className={`text-[8px] font-black truncate max-w-[45px] ${p.isUser ? "text-blue-700" : "text-slate-900"}`}>
                                                        {p.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-1 py-1.5 text-center">
                                                <span className="text-[8px] font-black text-blue-600">
                                                    {p.level.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-1 py-1.5 text-center">
                                                <span className="text-[8px] font-black text-slate-700 tabular-nums">{p.points}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 1 && (
                <div className="animate-fadeIn space-y-3 px-1 pb-4">
                    {/* Points & Badges Pill */}
                    <div className="flex justify-center mb-2">
                        <div className="px-3 py-1.5 rounded-full border border-white/10 bg-[#1e293b]/50 text-[7px] font-black text-white/90">
                            <span className="text-[rgb(var(--theme-secondary-accent))]">93</span> points et <span className="text-[rgb(var(--theme-secondary-accent))]">3</span> badges débloqués
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <button type="button" className="flex-1 py-2 rounded-xl border-2 border-[rgb(var(--theme-secondary-accent))] bg-[#1e293b] text-white text-[8px] font-black flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(var(--theme-secondary-accent),0.2)]">
                            <Globe size={10} /> Général
                        </button>
                        <button type="button" className="flex-1 py-2 rounded-xl border border-white/5 bg-[#1e293b] text-white/40 text-[8px] font-black flex items-center justify-center gap-2">
                            <MapPin size={10} /> Mon Club
                        </button>
                    </div>

                    {/* Challenge Card High-Fidelity */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                        <div className="p-3">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-[10px] font-black text-white mb-1">Partenaires Variés</h3>
                                    <div className="inline-flex px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[6px] font-bold text-white/60">
                                        Challenge en cours
                                    </div>
                                </div>
                                <div className="bg-[#1e293b] border border-white/10 rounded-lg p-2 flex flex-col items-center">
                                    <span className="text-[5px] font-black text-white/40 uppercase mb-0.5">RÉCOMPENSE</span>
                                    <div className="flex items-center gap-1">
                                        <Star size={8} className="text-yellow-400 fill-current" />
                                        <span className="text-[8px] font-black text-white">8 pts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 mb-3">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <p className="text-[8px] font-black text-white mb-0.5">Objectif</p>
                                        <p className="text-[6px] text-white/40">Jouer avec 2 partenaires différents</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-white">2/2</span>
                                        <p className="text-[6px] text-white/40">100%</p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }} />
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 mb-4 px-1">
                                <Clock size={8} className="text-white/40" />
                                <span className="text-[6px] text-white/40">Période : <span className="text-white">26 févr. 2026 → 26 mars 2026</span></span>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn space-y-4 px-1 pb-4">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mb-2">
                        <button type="button" className="flex-1 py-1.5 rounded-lg bg-[rgb(var(--theme-secondary-accent))] text-black text-[9px] font-black flex items-center justify-center gap-1 shadow-lg transition-all">
                            <Plus size={10} className="stroke-[3px]" /> Créer une ligue
                        </button>
                        <button type="button" className="flex-1 py-1.5 rounded-lg border border-white/10 bg-[#1e293b] text-white text-[9px] font-black flex items-center justify-center gap-1 transition-all">
                            <Key size={10} /> Rejoindre
                        </button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[8px] font-black text-white/60 uppercase tracking-widest pl-1">MES LIGUES</h3>

                        <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-3 shadow-xl">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-[10px] font-black text-white mb-1 uppercase italic tracking-tight">Les champions</h4>
                                    <div className="inline-flex px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-[6px] font-black text-white/60">
                                        <div className="flex items-center gap-1">
                                            <Copy size={8} /> RTE5EM
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <Users size={8} className="text-white/40" />
                                        <span className="text-[6px] text-white/60">5/5</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={8} className="text-white/40" />
                                        <span className="text-[6px] text-white/60">7j restants</span>
                                    </div>
                                </div>
                                <span className="text-[6px] text-white/40 tracking-tight">1/5 matchs</span>
                            </div>

                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[rgb(var(--theme-secondary-accent))] rounded-full" style={{ width: '20%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

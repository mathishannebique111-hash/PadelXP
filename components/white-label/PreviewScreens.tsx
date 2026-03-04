import React from "react";
import { Flame, User, Search, MapPin, Map as MapIcon, Globe, Eye, Trophy, X, Share2, Medal, Check, Award, Crown, Sparkles, ChevronRight, Clock, FileText, Star, Plus, Key, Copy, Users } from "lucide-react";

const isLightColor = (color: string) => {
    const hex = color.replace('#', '');
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
};

// Custom Replicas matching Native App Components
export const ReplicaPageTitle = ({ title, subtitle, icon }: { title: string, subtitle?: string, icon?: React.ReactNode }) => (
    <div className="mb-2">
        <section className="relative overflow-hidden rounded-[8px] border inline-block shadow-sm" style={{ background: "rgba(var(--theme-accent), 0.08)", borderColor: "rgba(var(--theme-accent), 0.4)", backdropFilter: "blur(6px)" }}>
            <div className="relative z-10 flex items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    <span className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: 'rgb(var(--theme-accent))' }} />
                    <div className="flex items-center gap-1.5">
                        {icon && <span className="text-[10px] drop-shadow-sm transition-colors duration-500" style={{ color: "var(--theme-text)" }}>{icon}</span>}
                        <h1 className="text-[10px] font-black tracking-tight leading-tight drop-shadow-sm transition-colors duration-500" style={{ color: "var(--theme-text)" }}>{title}</h1>
                    </div>
                </div>
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(var(--theme-accent),0.1)] to-transparent pointer-none" />
        </section>
        {subtitle && <p className="mt-1 ml-1 text-[7px] font-semibold opacity-60 transition-colors duration-500" style={{ color: "var(--theme-text)" }}>{subtitle}</p>}
    </div>
);

export const ReplicaChallengeBar = ({ title, current, target, isPremium = false }: { title: string, current: number, target: number, isPremium?: boolean }) => {
    const percentage = Math.min(100, Math.round((current / target) * 100));
    const accentColor = isPremium ? 'rgb(245, 158, 11)' : 'rgb(var(--theme-accent))';

    return (
        <div className="w-full mb-3 animate-fadeIn group">
            <div className="relative p-2 rounded-xl border shadow-sm transition-all duration-300" style={{ borderColor: accentColor, backgroundColor: accentColor }}>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="flex flex-shrink-0 items-center justify-center w-5 h-5 rounded-full border" style={{ backgroundColor: 'transparent', color: 'rgb(var(--theme-page))', borderColor: 'rgba(var(--theme-page), 0.3)' }}>
                                <Trophy size={10} strokeWidth={2.5} />
                            </div>
                            <span className="text-[9px] font-bold truncate" style={{ color: "rgb(var(--theme-page))" }}>
                                {title}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[8px] font-bold tabular-nums uppercase tracking-wider" style={{ color: "var(--theme-page)" }}>
                                {current} / {target}
                            </span>
                            <ChevronRight size={10} style={{ color: "var(--theme-page)" }} className="opacity-70" />
                        </div>
                    </div>
                    <div className="h-1 w-full rounded-full border overflow-hidden" style={{ backgroundColor: 'rgba(var(--theme-page), 0.2)', borderColor: 'transparent' }}>
                        <div
                            className="h-full rounded-full transition-all duration-1000 ease-out relative"
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: 'rgb(var(--theme-page))'
                            }}
                        />
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
    <div className={`rounded-xl border-2 p-2.5 transition-all duration-500 scale-[0.98] ${isConfirmed ? 'border-green-500 bg-green-50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-white/5 border-dashed opacity-80'
        }`} style={{ borderColor: !isConfirmed ? 'rgb(var(--theme-accent))' : undefined }}>
        <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <div className="flex-shrink-0 rounded-full p-1 bg-white/10" style={{ color: 'rgb(var(--theme-accent))' }}>
                    {isConfirmed ? <Check className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
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
                    <button type="button" className="text-white px-2 py-1 rounded-md text-[8px] font-black shadow-sm" style={{ backgroundColor: "rgb(var(--theme-accent))" }}>CONFIRMER</button>
                </div>
            )}
        </div>
    </div>
);


export const ReplicaPartnerCard = ({ name, level, compatibility, avatarUrl, isLightPage, accentColor }: { name: string, level: string, compatibility: number, avatarUrl?: string, isLightPage?: boolean, accentColor?: string }) => (
    <div className={`rounded-xl p-2 border flex flex-col h-full animate-fadeIn transition-all active:scale-[0.98] min-h-[100px] justify-between ${isLightPage ? 'bg-transparent' : 'bg-slate-800/50'}`} style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.1)' }}>
        <div className="flex flex-col items-center text-center py-0.5">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white/40 border-2 border-white/20 mb-1 shadow-sm overflow-hidden">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover shadow-inner" />
                ) : (
                    <User size={14} />
                )}
            </div>
            <h4 className="font-black text-[7px] leading-tight mb-0.5 line-clamp-1 w-full px-0.5 italic" style={{ color: "var(--theme-text)" }}>
                {name}
            </h4>
            <div className="inline-flex items-center justify-center bg-white/10 rounded-full px-1.5 py-0.5 mb-1 border border-white/10">
                <span className="text-[6px] font-black" style={{ color: "rgba(var(--theme-text), 0.9)" }}>Niveau {level}</span>
            </div>
            <div className="w-full max-w-[70px] flex items-center gap-1">
                <div className="h-0.5 flex-1 bg-slate-700/30 rounded-full overflow-hidden">
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
            <button type="button" className="py-1 px-0 rounded-lg flex items-center justify-center transition-all h-5 text-white shadow-md hover:brightness-110" style={{ backgroundColor: "rgb(var(--theme-accent))" }}><User size={9} className="fill-current" /></button>
        </div>
    </div>
);

export const Tabs = ({ items, activeIdx, onChange }: { items: string[], activeIdx: number, onChange?: (idx: number) => void }) => (
    <div className="flex items-center w-full mb-3 border-b" style={{ borderColor: 'rgba(var(--theme-text), 0.1)' }}>
        {items.map((item, i) => (
            <button
                key={item}
                type="button"
                onClick={() => onChange?.(i)}
                className={`flex-1 py-1.5 text-[7px] font-black transition-all duration-200 relative text-center capitalize tracking-tighter cursor-pointer`}
                style={{ color: i === activeIdx ? "var(--theme-text)" : "var(--theme-text-muted)" }}
            >
                <span className="flex items-center justify-center gap-1">{item}</span>
                {i === activeIdx && <div className="absolute bottom-0 left-0 right-0 h-[1.5px]" style={{ background: "rgb(var(--theme-accent))", boxShadow: "0 0 4px rgb(var(--theme-accent) / 0.4)" }} />}
            </button>
        ))}
    </div>
);

// Screens
export const ProfilePreview = ({ clubName, clubCity, clubData, logoUrl, accentColor, backgroundColor }: { clubName?: string, clubCity?: string, clubData?: { street?: string, postalCode?: string, phone?: string, numberOfCourts?: string, courtType?: string }, logoUrl?: string | null, accentColor?: string, backgroundColor?: string }) => {
    const [activeTab, setActiveTab] = React.useState(0);
    const displayClubName = clubName || 'Padel Club Amiens';
    const displayCity = clubCity || 'Amiens';
    const displayStreet = clubData?.street || '2 Rue de la Vallée';
    const displayPostal = clubData?.postalCode || '80000';
    const displayPhone = clubData?.phone || '03 22 XX XX XX';
    const displayCourts = clubData?.numberOfCourts || '6';
    const displayCourtType = clubData?.courtType || 'Couverts';
    const displayLogoUrl = logoUrl || '/images/Logo sans fond.png';

    const effectiveBg = backgroundColor || '#172554';
    const isLightPage = isLightColor(effectiveBg);
    const clubBgColor = isLightPage ? '#FFFFFF' : '#000000';
    const clubTextContrast = isLightPage ? '#000000' : '#FFFFFF';
    const clubMutedContrast = isLightPage ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)';
    const clubBorderContrast = accentColor || '#172554';
    const isLightAccent = isLightColor(accentColor || '#172554');
    const statTextColor = isLightAccent ? '#071554' : '#FFFFFF';
    const statTextMuted = isLightAccent ? 'rgba(7, 21, 84, 0.7)' : 'rgba(255, 255, 255, 0.7)';

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
                    <div
                        className="bg-white/5 rounded-[12px] border p-2 sm:p-2.5 transition-all duration-500 shadow-sm"
                        style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', boxShadow: isLightPage ? `0 0 10px ${accentColor}15` : 'none' }}
                    >
                        <div className="flex flex-col items-center">
                            <div className="relative w-24 h-24 rounded-full flex items-center justify-center mb-2 shadow-sm transition-colors" style={{ backgroundColor: isLightPage ? effectiveBg : 'rgba(0,0,0,0.2)' }}>
                                {/* Gauge SVG */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" className={isLightPage ? "" : "text-slate-500/30"} style={isLightPage ? { color: effectiveBg } : {}} />
                                    <circle cx="50" cy="50" r="46" fill="none" stroke={accentColor || "rgb(var(--theme-accent))"} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={289 - (289 * 0.49)} className="opacity-80" style={{ filter: `drop-shadow(0 0 6px ${accentColor || "rgba(var(--theme-accent), 0.4)"})` }} />
                                </svg>
                                <div className="flex flex-col items-center justify-center z-10 text-center">
                                    <span className="text-[5px] uppercase tracking-[0.3em] font-medium mb-0.5" style={{ color: accentColor || "rgb(var(--theme-accent))" }}>Niveau</span>
                                    <span className="text-2xl font-black leading-none tracking-tighter drop-shadow-md" style={{ color: accentColor || "rgb(var(--theme-accent))" }}>6.49</span>
                                </div>
                            </div>

                            <div className="w-full space-y-1.5">
                                {/* Share button replica */}
                                <button type="button" className="w-full py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-black text-[7px] uppercase tracking-wider text-white shadow-md active:scale-95 transition-all" style={{ background: 'rgb(var(--theme-accent))', boxShadow: '0 0 10px rgba(var(--theme-accent), 0.3)' }}>
                                    <Share2 size={9} className="stroke-[2.5px]" />
                                    PARTAGER MON PROFIL
                                </button>

                                <div className="pt-1.5">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[5px] font-medium uppercase tracking-wide" style={{ color: "var(--theme-text-muted)" }}>Vers niveau 7</span>
                                        <span className="text-[6px] font-semibold" style={{ color: 'rgb(var(--theme-accent))' }}>49%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: 'rgb(var(--theme-accent))', width: '49%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* About details: High Fidelity Replica with rounded-2xl & green icons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        {[
                            { icon: Flame, label: "Niveau", value: "Compétition" },
                            { icon: User, label: "Main", value: "Droitier" },
                            { icon: MapIcon, label: "Côté Préféré", value: "Gauche" },
                            { icon: Trophy, label: "Coup Signature", value: "Smash" }
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl border bg-white/5 p-3 flex items-center gap-2.5 transition-all duration-500 shadow-sm"
                                style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.3)', boxShadow: isLightPage ? `0 0 8px ${accentColor}10` : 'none' }}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--theme-accent))' }} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[5px] uppercase tracking-widest font-black mb-0.5" style={{ color: "var(--theme-text-muted)" }}>{item.label}</div>
                                    <div className="text-[6px] font-black leading-tight" style={{ color: "var(--theme-text)" }}>{item.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {activeTab === 1 && (
                <div className="animate-fadeIn px-1 space-y-3 pb-4">
                    {/* Stats Header with Tier */}
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[8px] font-black tracking-[0.2em] uppercase" style={{ color: accentColor }}>Mes Statistiques</h2>
                        <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white text-[6px] font-black shadow-sm flex items-center gap-1">
                            <Crown size={7} /> CHAMPION
                        </div>
                    </div>

                    {/* Lilian's Streak Card Component Clone */}
                    <div className="relative rounded-lg border px-3 py-2 overflow-hidden shadow-sm" style={{ backgroundColor: accentColor, borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)' }}>
                        <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex-1">
                                <div className="text-[6px] font-medium uppercase mb-1 tracking-[0.15em]" style={{ color: statTextMuted }}>Série de victoires en cours</div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black tabular-nums leading-none" style={{ color: statTextColor }}>5</span>
                                    <span className="text-[7px] uppercase tracking-[0.1em]" style={{ color: statTextMuted }}>victoires</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 relative">
                                <div className="relative z-10">
                                    <Flame size={20} style={{ color: statTextColor }} strokeWidth={1.5} />
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 pointer-events-none">
                                    <Flame size={40} className="blur-[1px] transform scale-125" style={{ color: statTextColor, opacity: 0.2 }} strokeWidth={3} />
                                </div>
                                <div className="text-[6px] mt-1" style={{ color: statTextMuted }}>
                                    Meilleure : <span className="font-semibold tabular-nums" style={{ color: statTextColor }}>18</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exact 8-cell Grid Replica */}
                    <div className="grid grid-cols-2 gap-2 text-[7px] sm:text-xs">
                        {/* Points */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Points</div>
                            <div className="text-xl font-black tabular-nums leading-none transition-colors" style={{ color: '#000000' }}>695</div>
                        </div>
                        {/* Matchs */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Matchs</div>
                            <div className="text-xl font-black tabular-nums leading-none transition-colors" style={{ color: '#000000' }}>64</div>
                        </div>
                        {/* Victoires */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Victoires</div>
                            <div className="text-xl font-black tabular-nums leading-none transition-colors" style={{ color: '#000000' }}>55</div>
                        </div>
                        {/* Défaites */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Défaites</div>
                            <div className="text-xl font-black tabular-nums leading-none transition-colors" style={{ color: '#000000' }}>9</div>
                        </div>
                        {/* Sets gagnés */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Sets gagnés</div>
                            <div className="text-xl font-black tabular-nums leading-none transition-colors" style={{ color: '#000000' }}>110</div>
                        </div>
                        {/* Sets perdus */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Sets perdus</div>
                            <div className="text-xl font-black tabular-nums leading-none transition-colors" style={{ color: '#000000' }}>22</div>
                        </div>
                        {/* Winrate */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Winrate</div>
                            <div className="text-xl font-black tabular-nums leading-none flex items-center transition-colors" style={{ color: '#000000' }}>
                                <span className="inline-block mr-0.5 transition-colors" style={{ color: '#000000', opacity: 0.8 }}>↗</span>
                                85%
                            </div>
                        </div>
                        {/* Badges */}
                        <div className="rounded-md border px-2.5 py-2 shadow-sm relative overflow-hidden flex flex-col items-start transition-colors" style={{ backgroundColor: '#FFFFFF', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)', borderLeftWidth: '4px', borderLeftColor: effectiveBg }}>
                            <div className="text-[5px] uppercase tracking-[0.2em] mb-1 font-medium transition-colors" style={{ color: 'rgba(0,0,0,0.6)' }}>Badges</div>
                            <div className="text-xl font-black tabular-nums leading-none transition-colors" style={{ color: '#000000' }}>15</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn space-y-3 px-1 pb-6">
                    {/* Badge Summary Header Clone from BadgesView.tsx */}
                    <div className="mb-3 rounded-xl border px-3 py-2 sm:px-4 sm:py-3 shadow-sm bg-white/5 max-w-[200px] mx-auto" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)' }}>
                        <div className="flex items-center justify-between gap-1">
                            {/* Left: Progression */}
                            <div className="text-center w-14 flex-shrink-0">
                                <div className="text-xl font-bold tabular-nums flex items-baseline justify-center" style={{ color: "var(--theme-text)" }}>
                                    15
                                    <span className="text-[10px] ml-0.5" style={{ color: "var(--theme-text-muted)" }}>/ 33</span>
                                </div>
                                <div className="text-[7px] font-semibold uppercase" style={{ color: "rgba(var(--theme-text), 0.8)" }}>Badges</div>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-black/10 dark:bg-white/30 flex-shrink-0" style={{ backgroundColor: clubBorderContrast }}></div>

                            {/* Right: Breakdown - shifted slightly right */}
                            <div className="flex-1 flex justify-around items-center gap-1 min-w-0 pl-1">
                                <div className="text-center">
                                    <div className="text-[12px] font-bold tabular-nums" style={{ color: "var(--theme-text)" }}>15</div>
                                    <div className="text-[5px] font-medium uppercase tracking-tighter" style={{ color: "var(--theme-text-muted)" }}>Standard</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[12px] font-bold tabular-nums" style={{ color: "var(--theme-text)" }}>0</div>
                                    <div className="text-[5px] font-medium uppercase tracking-tighter" style={{ color: "var(--theme-text-muted)" }}>Challenge</div>
                                </div>
                                <div className="text-center opacity-50">
                                    <div className="text-[12px] font-bold text-amber-500 tabular-nums">0</div>
                                    <div className="text-[5px] font-medium text-amber-500 uppercase tracking-tighter">Premium</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Buttons - Resized and Renamed */}
                    <div className="flex justify-center gap-2 mb-3">
                        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[5.5px] font-black transition-all whitespace-nowrap border shadow-sm" style={{ backgroundColor: effectiveBg, borderColor: accentColor, borderWidth: '2px', color: accentColor }}>
                            <Award size={9} />
                            GÉNÉRAL
                        </button>
                        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[5.5px] font-black transition-all whitespace-nowrap border shadow-sm" style={{ backgroundColor: effectiveBg, borderColor: accentColor, borderWidth: '1px', color: accentColor }}>
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
                            <div key={i} className="group relative rounded-xl border bg-white/5 px-2 pt-3 pb-2 transition-all flex flex-col h-[110px] items-center text-center overflow-hidden shadow-sm" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.15)' }}>
                                <div className="flex-shrink-0 mb-1.5 h-[32px] flex items-center justify-center">
                                    <b.icon size={28} style={{ color: "var(--theme-text)" }} strokeWidth={2.5} />
                                </div>
                                <div className="flex-shrink-0 flex flex-col items-center justify-center min-h-0 max-h-[50px] mb-1 px-1">
                                    <h3 className="text-[8px] font-black leading-tight mb-0.5 line-clamp-2" style={{ color: "var(--theme-text)" }}>
                                        {b.title}
                                    </h3>
                                    <p className="text-[6px] leading-[1.1] font-bold line-clamp-2" style={{ color: "var(--theme-text-muted)" }}>
                                        {b.desc}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 w-full mt-auto">
                                    <div className="w-full rounded-md px-1 py-1 text-[7px] font-black tabular-nums flex items-center justify-center gap-0.5 border" style={{ color: isLightPage ? '#16a34a' : '#4ade80', backgroundColor: isLightPage ? 'rgba(22, 163, 74, 0.1)' : 'rgba(74, 222, 128, 0.1)', borderColor: isLightPage ? 'rgba(22, 163, 74, 0.2)' : 'rgba(74, 222, 128, 0.2)' }}>
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
                    <div className="rounded-xl border p-2.5 shadow-sm transition-colors" style={{ backgroundColor: clubBgColor, borderColor: clubBorderContrast }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img src={displayLogoUrl} className="w-6 h-6 object-contain opacity-60" />
                            </div>
                            <h3 className="text-[9px] font-black uppercase tracking-tight leading-tight" style={{ color: clubTextContrast }}>{displayClubName}</h3>
                        </div>
                    </div>

                    {/* Coordonnées + Infrastructure */}
                    <div className="rounded-xl border p-2.5 shadow-lg transition-colors" style={{ backgroundColor: clubBgColor, borderColor: clubBorderContrast }}>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Coordonnées */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-[5px] font-semibold uppercase tracking-[0.2em]" style={{ color: clubMutedContrast }}>Coordonnées</h4>
                                    <span className="text-[5px] font-semibold uppercase opacity-70" style={{ color: clubTextContrast }}>Site ↗</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex flex-col items-center gap-0.5 text-center">
                                        <MapPin size={8} style={{ color: clubMutedContrast }} />
                                        <span className="text-[5px] font-medium leading-tight" style={{ color: clubTextContrast }}>{displayStreet}, {displayPostal} {displayCity}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5 text-center">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2 h-2" style={{ color: clubMutedContrast }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        <span className="text-[5px] font-medium" style={{ color: clubTextContrast }}>{displayPhone}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Infrastructure */}
                            <div>
                                <h4 className="text-[5px] font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: clubMutedContrast }}>Infrastructure</h4>
                                <div className="space-y-1 mt-2">
                                    <div className="flex items-center justify-between rounded-md px-1.5 py-1 transition-colors" style={{ backgroundColor: isLightPage ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }}>
                                        <span className="uppercase tracking-[0.15em] text-[5px] font-bold" style={{ color: clubMutedContrast }}>Terrains</span>
                                        <span className="font-extrabold text-[6px]" style={{ color: clubTextContrast }}>{displayCourts}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-md px-1.5 py-1 transition-colors" style={{ backgroundColor: isLightPage ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }}>
                                        <span className="uppercase tracking-[0.15em] text-[5px] font-bold" style={{ color: clubMutedContrast }}>Type</span>
                                        <span className="font-extrabold text-[6px]" style={{ color: clubTextContrast }}>{displayCourtType}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Horaires d'ouverture */}
                    <div className="rounded-xl border p-2.5 shadow-lg transition-colors" style={{ backgroundColor: clubBgColor, borderColor: clubBorderContrast }}>
                        <h4 className="text-[5px] font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: clubMutedContrast }}>Horaires d'ouverture</h4>
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
                                <div key={h.day} className={`flex items-center justify-between rounded-md border px-1.5 py-0.5 text-[5px] font-semibold transition-colors ${h.open ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-rose-400/30 bg-rose-500/10'}`}>
                                    <span className="uppercase tracking-[0.15em]" style={{ color: clubTextContrast }}>{h.day}</span>
                                    <span style={{ color: clubTextContrast }}>{h.hours}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Partir du club */}
                    <div className="flex justify-center pt-1">
                        <span className="text-[5px] underline underline-offset-2" style={{ color: "var(--theme-text-muted)" }}>Partir de ce club</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MatchesPreview = ({ clubName, clubCity, accentColor, backgroundColor }: { clubName?: string, clubCity?: string, accentColor?: string, backgroundColor?: string }) => {
    const [activeTab, setActiveTab] = React.useState(1);
    const displayName = clubName || 'Padel Club Amiens';
    const displayCity = clubCity || 'AMIENS';

    const clubBgColor = accentColor || '#172554';
    const effectiveBg = backgroundColor || '#172554';
    const clubTextContrast = isLightColor(clubBgColor) ? '#071554' : '#FFFFFF';
    const clubMutedContrast = isLightColor(clubBgColor) ? 'rgba(7, 21, 84, 0.6)' : 'rgba(255, 255, 255, 0.6)';
    const clubBorderContrast = isLightColor(clubBgColor) ? 'rgba(7, 21, 84, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    const isLightPage = isLightColor(effectiveBg);
    return (
        <div className="w-full h-full overflow-y-auto pb-4 animate-fadeIn font-sans pt-2">
            <div className="px-1 mb-2">
                <ReplicaPageTitle title="Matchs" subtitle={`Club : ${displayName}`} icon={<Check size={10} className="stroke-[3px]" />} />
            </div>

            <div className="px-1 mb-1">
                <ReplicaChallengeBar title="Partenaires Variés" current={2} target={2} />
            </div>

            <div className="flex w-full mb-3 border-b" style={{ borderColor: 'rgba(var(--theme-text), 0.1)' }}>
                {["Enregistrer", "Mes matchs", "Partenaires", "Oracle"].map((tab, i) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(i)}
                        className={`flex-1 py-1.5 text-[6px] font-black transition-all duration-200 relative flex items-center justify-center`}
                        style={{ color: activeTab === i ? "var(--theme-text)" : "var(--theme-text-muted)" }}
                    >
                        <div className="relative flex items-center justify-center px-1">
                            <span className={`text-center whitespace-normal leading-tight ${tab === 'Partenaires' ? 'ml-2' : ''}`}>{tab}</span>
                            {i === 1 && (
                                <span className="absolute -top-1 -right-2 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-red-500 text-[5px] font-bold text-white shadow-sm border border-[#172554]">
                                    2
                                </span>
                            )}
                        </div>
                        {activeTab === i && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_0_8px_rgba(var(--theme-accent),0.4)]" style={{ background: "rgb(var(--theme-accent))" }} />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 0 && (
                <div className="animate-fadeIn px-1 space-y-3">
                    <div className="w-full">
                        <label className="mb-0.5 ml-1 block text-[6px] font-black uppercase tracking-widest opacity-50" style={{ color: "var(--theme-text)" }}>Lieu du match</label>
                        <div className="w-full h-7 rounded-lg border px-2 text-[8px] font-bold flex items-center shadow-inner bg-white/5" style={{ color: "var(--theme-text)", borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.2)' }}>
                            {displayName}
                        </div>
                        <p className="mt-0.5 text-[6px] font-black ml-1 flex items-center gap-1 uppercase tracking-wider" style={{ color: 'rgb(var(--theme-accent))' }}>
                            <MapPin size={6} /> {displayCity.toUpperCase()}
                        </p>
                    </div>

                    <div className="py-1">
                        <div className="flex items-center justify-center gap-1.5 w-full">
                            {/* Team 1 */}
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <div className="grid grid-cols-2 gap-1 w-full relative">
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[5px] font-black uppercase tracking-widest bg-white/5 px-1 z-10 w-max opacity-50" style={{ color: "var(--theme-text)" }}>Équipe 1</div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border pt-1" style={{ borderColor: 'rgb(var(--theme-accent))', backgroundColor: 'rgba(var(--theme-accent), 0.1)' }}>
                                        <div className="w-5 h-5 rounded-full border border-white/20 bg-white/10 flex items-center justify-center" style={{ color: "var(--theme-text)" }}>
                                            <User size={10} />
                                        </div>
                                        <span className="text-[5px] font-black uppercase mt-0.5 text-center leading-tight truncate w-full px-0.5" style={{ color: "var(--theme-text)" }}>Lilian</span>
                                        <div className="absolute top-0.5 left-0.5 px-0.5 rounded text-[5px] font-black" style={{ backgroundColor: 'rgba(var(--theme-accent), 0.2)', color: 'rgb(var(--theme-accent))' }}>6.49</div>
                                    </div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border bg-white/5 group border-dashed pt-1" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.15)' }}>
                                        <Search size={8} style={{ color: "var(--theme-text-muted)" }} />
                                        <span className="text-[4px] font-black uppercase mt-0.5" style={{ color: "var(--theme-text-muted)" }}>AJOUTER</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-[5px] font-black uppercase ring-1 px-1 py-0.5 rounded-[4px] shadow-lg mt-2 text-white" style={{ backgroundColor: 'rgb(var(--theme-accent))', boxShadow: "0 0 0 1px rgba(var(--theme-accent), 0.5)" }}>VS</div>

                            {/* Team 2 */}
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <div className="grid grid-cols-2 gap-1 w-full relative">
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[5px] font-black uppercase tracking-widest bg-white/5 px-1 z-10 w-max" style={{ color: "var(--theme-text-muted)" }}>Équipe 2</div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border bg-white/5 border-dashed" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.15)' }}>
                                        <Search size={8} style={{ color: "var(--theme-text-muted)" }} />
                                    </div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-[10px] border bg-white/5 border-dashed" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.15)' }}>
                                        <Search size={8} style={{ color: "var(--theme-text-muted)" }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="ml-1 block text-[6px] font-black uppercase tracking-widest" style={{ color: "var(--theme-text-muted)" }}>Équipe gagnante</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button type="button" className="rounded-lg border-2 py-1.5 text-[6px] font-black flex items-center justify-center gap-1 uppercase transition-all scale-[0.98] bg-white/5" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.1)', color: "var(--theme-text)" }}>
                                <Trophy size={8} /> Équipe 1
                            </button>
                            <button type="button" className="rounded-lg border-2 py-1.5 text-[6px] font-black flex items-center justify-center gap-1 uppercase transition-all scale-[0.98] bg-white/5" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.1)', color: "var(--theme-text)" }}>
                                <Trophy size={8} /> Équipe 2
                            </button>
                        </div>
                    </div>

                    <button type="button" className="w-full rounded-xl py-2 font-black text-white text-[7px] uppercase tracking-widest shadow-lg mt-2" style={{ background: "rgb(var(--theme-accent))" }}>
                        ENREGISTRER LE MATCH
                    </button>
                </div>
            )}

            {activeTab === 1 && (
                <div className="space-y-3 animate-fadeIn px-1 pb-4">
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                        <h3 className="text-[8px] font-black uppercase italic leading-tight" style={{ color: "var(--theme-text)" }}>Matchs en attente de confirmation</h3>
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
                        <h3 className="text-[8px] font-black uppercase italic leading-tight" style={{ color: "var(--theme-text)" }}>Matchs validés</h3>
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
                    <h2 className="text-[11px] font-black italic px-3" style={{ color: "var(--theme-text)" }}>Trouve ton partenaire</h2>

                    <div className="border rounded-2xl p-4 shadow-xl" style={{ backgroundColor: isLightPage ? 'transparent' : 'rgba(255,255,255,0.05)', borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center justify-between mb-3 px-3">
                            <h3 className="text-[9px] font-black" style={{ color: "var(--theme-text)" }}>Partenaires suggérés</h3>
                            <div className="flex bg-white/5 p-0.5 rounded-lg border items-center" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.05)' }}>
                                <div className="px-2 py-1 rounded-md text-[7px] font-black shadow-sm flex items-center justify-center h-full" style={{ backgroundColor: accentColor, color: isLightColor(accentColor || '#172554') ? '#071554' : '#FFFFFF' }}>Mon Club</div>
                                <div className="px-2 py-1 rounded-md text-[7px] font-black flex items-center justify-center h-full" style={{ color: "var(--theme-text)", opacity: 0.8 }}>Département</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <ReplicaPartnerCard name="Mathis Leclerc" level="6.00" compatibility={98} isLightPage={isLightPage} accentColor={accentColor} />
                            <ReplicaPartnerCard name="Théo Caron" level="5.00" compatibility={73} isLightPage={isLightPage} accentColor={accentColor} />
                            <ReplicaPartnerCard name="Julien Bernard" level="4.80" compatibility={65} isLightPage={isLightPage} accentColor={accentColor} />
                            <ReplicaPartnerCard name="Sarah Mazette" level="5.20" compatibility={89} isLightPage={isLightPage} accentColor={accentColor} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 3 && (
                <div className="animate-fadeIn px-1 space-y-3">
                    <div className="rounded-2xl border p-4 shadow-xl text-center" style={{ backgroundColor: clubBgColor, borderColor: clubBorderContrast }}>
                        <Sparkles className="w-8 h-8 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(204,255,0,0.4)]" style={{ color: clubTextContrast }} />
                        <h3 className="text-[11px] font-black uppercase italic mb-1" style={{ color: clubTextContrast }}>Oracle AI</h3>
                        <p className="text-[8px] leading-relaxed italic" style={{ color: clubMutedContrast }}>
                            Analyse de vos performances en cours...<br />
                            Prédictions basées sur vos 24 derniers matchs.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export const CompetitionPreview = ({ clubName, accentColor, backgroundColor }: { clubName?: string, accentColor?: string, backgroundColor?: string }) => {
    const [activeTab, setActiveTab] = React.useState(0);
    const displayName = clubName || 'Padel Club Amiens';
    const effectiveBg = backgroundColor || '#172554';
    const isLightPage = isLightColor(effectiveBg);
    const isLightAccent = isLightColor(accentColor || '#172554');
    return (
        <div className="w-full h-full overflow-y-auto pb-4 animate-fadeIn font-sans pt-2">
            <div className="px-1 mb-2">
                <ReplicaPageTitle title="Espace Compétition" subtitle={`Club : ${displayName}`} />
            </div>

            <div className="flex w-full mb-3 border-b" style={{ borderColor: 'rgba(var(--theme-text), 0.1)' }}>
                {["Classement", "Challenges", "Ligues"].map((tab, i) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(i)}
                        className={`flex-1 py-1.5 text-[6px] font-black transition-all duration-200 relative flex items-center justify-center`}
                        style={{ color: activeTab === i ? "var(--theme-text)" : "var(--theme-text-muted)" }}
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
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_0_8px_rgba(var(--theme-accent),0.4)]" style={{ background: "rgb(var(--theme-accent))" }} />
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
                                    className={`flex items-center gap-1 px-1 py-1 rounded-full text-[5px] font-black transition-all duration-500 whitespace-nowrap border ${active ? 'bg-white/10 shadow-sm' : 'bg-white/5 hover:bg-white/10'}`}
                                    style={{
                                        borderColor: accentColor,
                                        borderWidth: active ? '2px' : '1px',
                                        color: active ? accentColor : (isLightPage ? 'rgba(0,0,0,0.6)' : 'white')
                                    }}
                                >
                                    <f.icon size={6} style={{ color: active ? accentColor : "inherit" }} />
                                    <span>{f.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Top joueurs du moment podium */}
                    <div className="space-y-3 px-1">
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-[1px] flex-1 bg-white/10" />
                            <span className="text-[7px] font-black uppercase tracking-widest italic opacity-60" style={{ color: "var(--theme-text)" }}>Top joueurs du moment</span>
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
                            <span className="text-[7px] font-black uppercase tracking-widest italic opacity-60" style={{ color: "var(--theme-text)" }}>Classement global</span>
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
                                        <tr key={idx} className={`${p.isUser ? "bg-[rgb(var(--theme-accent))]/5" : "bg-white"} hover:bg-slate-50 transition-colors`}>
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
                                                    <span className={`text-[8px] font-black truncate max-w-[45px]`} style={{ color: p.isUser ? "rgb(var(--theme-accent))" : "rgb(15, 23, 42)" }}>
                                                        {p.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-1 py-1.5 text-center">
                                                <span className="text-[8px] font-black" style={{ color: 'rgb(var(--theme-accent))' }}>
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
                        <div className="px-3 py-1.5 rounded-full border text-[7px] font-black shadow-sm transition-colors" style={{ backgroundColor: effectiveBg, borderColor: accentColor, color: "var(--theme-text)" }}>
                            <span style={{ color: accentColor }}>93</span> points et <span style={{ color: accentColor }}>3</span> badges débloqués
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <button type="button" className="flex-1 py-2 rounded-xl border bg-white/5 text-[8px] font-black flex items-center justify-center gap-2 shadow-sm" style={{ borderColor: accentColor, borderWidth: '2px', color: accentColor }}>
                            <Globe size={10} /> Général
                        </button>
                        <button type="button" className="flex-1 py-2 rounded-xl border bg-white/5 text-[8px] font-black flex items-center justify-center gap-2" style={{ borderColor: accentColor, borderWidth: '1px', color: isLightPage ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                            <MapPin size={10} /> Mon Club
                        </button>
                    </div>

                    {/* Challenge Card High-Fidelity - Filled Accent Style */}
                    <div className="rounded-2xl border overflow-hidden shadow-xl" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                        <div className="p-3">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-[10px] font-black mb-1" style={{ color: "var(--theme-page)" }}>Partenaires Variés</h3>
                                    <div className="inline-flex px-2 py-0.5 rounded-full border text-[6px] font-bold" style={{ backgroundColor: 'rgba(var(--theme-page-rgb, 7, 21, 84), 0.2)', borderColor: 'rgba(var(--theme-page-rgb, 7, 21, 84), 0.3)', color: "var(--theme-page)" }}>
                                        Challenge en cours
                                    </div>
                                </div>
                                <div className="rounded-lg p-2 flex flex-col items-center shadow-sm" style={{ backgroundColor: 'rgb(var(--theme-page))', borderColor: 'transparent' }}>
                                    <span className="text-[5px] font-black uppercase mb-0.5" style={{ color: "rgb(var(--theme-accent))", opacity: 0.8 }}>RÉCOMPENSE</span>
                                    <div className="flex items-center gap-1">
                                        <Star size={8} className="text-[rgb(var(--theme-accent))] fill-current" style={{ color: "rgb(var(--theme-accent))" }} />
                                        <span className="text-[8px] font-black" style={{ color: "rgb(var(--theme-accent))" }}>8 pts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl p-3 mb-3 border" style={{ backgroundColor: 'rgb(var(--theme-page))', borderColor: 'transparent' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <p className="text-[8px] font-black mb-0.5" style={{ color: "rgb(var(--theme-accent))" }}>Objectif</p>
                                        <p className="text-[6px]" style={{ color: "rgb(var(--theme-accent))", opacity: 0.8 }}>Jouer avec 2 partenaires différents</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black" style={{ color: "rgb(var(--theme-accent))" }}>2/2</span>
                                        <p className="text-[6px]" style={{ color: "rgb(var(--theme-accent))", opacity: 0.8 }}>100%</p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full border rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(var(--theme-accent), 0.2)', borderColor: 'transparent' }}>
                                    <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: "rgb(var(--theme-accent))" }} />
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 mb-2 px-1">
                                <Clock size={8} style={{ color: "var(--theme-page)", opacity: 0.6 }} />
                                <span className="text-[6px]" style={{ color: "var(--theme-page)", opacity: 0.6 }}>Période : <span style={{ color: "var(--theme-page)" }}>26 févr. 2026 → 26 mars 2026</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn space-y-4 px-1 pb-4">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mb-2">
                        <button type="button" className="flex-1 py-1.5 rounded-lg text-white text-[9px] font-black flex items-center justify-center gap-1 shadow-lg transition-all" style={{ backgroundColor: "rgb(var(--theme-accent))" }}>
                            <Plus size={10} className="stroke-[3px]" /> Créer une ligue
                        </button>
                        <button type="button" className="flex-1 py-1.5 rounded-lg border bg-white/5 text-[9px] font-black flex items-center justify-center gap-1 transition-all shadow-sm" style={{ borderColor: isLightPage ? accentColor : 'rgba(255,255,255,0.1)', color: "var(--theme-text)" }}>
                            <Key size={10} /> Rejoindre
                        </button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[8px] font-black uppercase tracking-widest pl-1" style={{ color: "var(--theme-text-muted)" }}>MES LIGUES</h3>

                        {/* League Card - Filled Accent Style */}
                        <div className="rounded-2xl border p-3 shadow-xl" style={{ borderColor: accentColor, backgroundColor: accentColor }}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-[10px] font-black mb-1 uppercase italic tracking-tight" style={{ color: "var(--theme-page)" }}>Les champions</h4>
                                    <div className="inline-flex px-1.5 py-0.5 rounded bg-[var(--theme-page)]/10 border text-[6px] font-black" style={{ borderColor: 'rgba(var(--theme-page-rgb, 7, 21, 84), 0.2)', color: "var(--theme-page)" }}>
                                        <div className="flex items-center gap-1">
                                            <Copy size={8} /> RTE5EM
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <Users size={8} style={{ color: "var(--theme-page)", opacity: 0.6 }} />
                                        <span className="text-[6px]" style={{ color: "var(--theme-page)" }}>5/5</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={8} style={{ color: "var(--theme-page)", opacity: 0.6 }} />
                                        <span className="text-[6px]" style={{ color: "var(--theme-page)" }}>7j restants</span>
                                    </div>
                                </div>
                                <span className="text-[6px] tracking-tight font-black" style={{ color: "var(--theme-page)", opacity: 0.6 }}>1/5 matchs</span>
                            </div>

                            <div className="h-1 w-full bg-[var(--theme-page)]/20 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ backgroundColor: "var(--theme-page)", width: '20%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

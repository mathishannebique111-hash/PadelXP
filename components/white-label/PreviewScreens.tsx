import React from "react";
import { Flame, User, Search, MapPin, Map as MapIcon, Globe, Eye, Trophy, X } from "lucide-react";

// Components
export const TopPill = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="mb-2">
        <section className="relative overflow-hidden rounded-lg border inline-block" style={{ background: "rgba(128, 128, 128, 0.05)", borderColor: "var(--theme-text-muted)", backdropFilter: "blur(4px)" }}>
            <div className="relative z-10 flex items-center">
                <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: 'var(--theme-text-muted)' }} />
                    <div className="flex items-center gap-1.5">
                        <h1 className="text-[7px] font-black tracking-tight leading-tight uppercase" style={{ color: 'var(--theme-text)' }}>
                            {title}
                        </h1>
                    </div>
                </div>
            </div>
        </section>
        {subtitle && <p className="mt-1 ml-1 text-[7px] font-bold leading-tight uppercase" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>}
    </div>
);

export const Tabs = ({ items, activeIdx }: { items: string[], activeIdx: number }) => (
    <div className="flex items-center w-full mb-3 border-b" style={{ borderColor: 'var(--theme-text-muted)' }}>
        {items.map((item, i) => (
            <div key={item} className={`flex-1 py-1.5 text-[7px] font-black transition-all duration-200 relative text-center uppercase tracking-tighter`} style={{ color: i === activeIdx ? "var(--theme-text)" : "var(--theme-text-muted)" }}>
                <span className="flex items-center justify-center gap-1">{item}</span>
                {i === activeIdx && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[var(--theme-secondary-accent)] shadow-[0_0_4px_rgba(204,255,0,0.4)]" />}
            </div>
        ))}
    </div>
);

// Screens
export const ProfilePreview = () => (
    <div className="w-full h-full overflow-y-auto w-full pb-2 animate-fadeIn font-sans pt-1">
        <TopPill title="Bienvenue Lilian !" subtitle="Club : Padel Club • @lilian.richard" />
        <Tabs items={["Profil", "Stats", "Badges", "Club"]} activeIdx={1} />

        {/* PLAYER SUMMARY */}
        <div className="w-full rounded-xl border p-3 shadow-xl relative overflow-hidden" style={{ background: "rgba(128,128,128,0.1)", borderColor: "var(--theme-text-muted)" }}>
            <div className="mb-2 flex items-center justify-between gap-1">
                <h3 className="text-[6px] font-black uppercase tracking-widest truncate" style={{ color: "var(--theme-text-muted)" }}>Mes statistiques</h3>
                <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border border-yellow-200/30 px-1.5 py-0.5 font-black text-[6px] uppercase tracking-wider rounded-md">
                    Or
                </div>
            </div>

            <div className="mb-2">
                <div className="rounded-md border bg-[var(--theme-secondary-accent)]/10 px-2 py-1.5 relative overflow-hidden" style={{ borderColor: "var(--theme-secondary-accent)" }}>
                    <div className="relative z-10 flex items-center justify-between gap-2">
                        <div className="flex-1">
                            <div className="text-[6px] uppercase tracking-widest text-[var(--theme-secondary-accent)] font-black mb-0.5">
                                Série de victoires
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black tabular-nums" style={{ color: "var(--theme-text)" }}>5</span>
                                <span className="text-[6px] uppercase font-bold" style={{ color: "var(--theme-text-muted)" }}>victoires</span>
                            </div>
                        </div>
                        <div className="relative">
                            <Flame size={18} className="text-[var(--theme-secondary-accent)]" strokeWidth={2} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[8px]">
                {[
                    { label: "Points", value: "245" },
                    { label: "Matchs", value: "47" },
                    { label: "Victoires", value: "31" },
                    { label: "Défaites", value: "16" },
                    { label: "Sets G", value: "68" },
                    { label: "Winrate", value: "66%", trend: true }
                ].map((stat, i) => (
                    <div key={i} className="rounded-md border p-1.5" style={{ background: "rgba(128,128,128,0.05)", borderColor: "var(--theme-text-muted)", borderLeft: '2px solid var(--theme-secondary-accent)' }}>
                        <div className="text-[6px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: "var(--theme-text-muted)" }}>{stat.label}</div>
                        <div className="text-xs font-black tabular-nums" style={{ color: stat.trend ? "#10b981" : "var(--theme-text)" }}>
                            {stat.trend && "↗"}{stat.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const MatchesPreview = () => (
    <div className="w-full h-full overflow-y-auto w-full pb-4 animate-fadeIn font-sans pt-1">
        <TopPill title="Matchs" subtitle="Club : Padel Club" />
        <Tabs items={["Enregistrer", "Historique", "Partenaires"]} activeIdx={0} />

        <div className="space-y-3 px-1">
            <div className="w-full">
                <label className="mb-0.5 ml-1 block text-[7px] font-black uppercase tracking-widest" style={{ color: "var(--theme-text-muted)" }}>Lieu du match</label>
                <div className="w-full h-8 rounded-lg border px-2 text-[10px] font-bold flex items-center shadow-inner" style={{ background: "rgba(128,128,128,0.1)", borderColor: "var(--theme-text-muted)", color: "var(--theme-text)" }}>
                    Padel Club
                </div>
                <p className="mt-0.5 text-[7px] text-emerald-500 font-black ml-1 flex items-center gap-1 uppercase tracking-wider">
                    <MapPin size={8} /> AMIENS
                </p>
            </div>

            <div className="py-1">
                <div className="flex items-center justify-center gap-2 w-full">
                    {/* Team 1 */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                        <div className="grid grid-cols-2 gap-1 w-full">
                            <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border bg-[var(--theme-secondary-accent)]/10" style={{ borderColor: 'var(--theme-secondary-accent)' }}>
                                <div className="w-6 h-6 rounded-full border bg-white/10 flex items-center justify-center" style={{ borderColor: 'var(--theme-text-muted)' }}>
                                    <User size={12} style={{ color: "var(--theme-text)" }} />
                                </div>
                                <span className="text-[6px] font-black uppercase mt-0.5" style={{ color: "var(--theme-text)" }}>Lilian</span>
                                <div className="absolute top-0.5 left-0.5 px-0.5 rounded bg-[var(--theme-accent)]/30 text-[6px] font-black text-blue-400">6.4</div>
                            </div>
                            <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border group" style={{ background: "rgba(128,128,128,0.05)", borderColor: "var(--theme-text-muted)" }}>
                                <Search size={10} style={{ color: "var(--theme-text-muted)" }} />
                                <span className="text-[5px] font-black uppercase mt-0.5" style={{ color: "var(--theme-text-muted)" }}>AJOUTER</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--theme-secondary-accent)] text-[#071554] px-1 py-0.5 rounded-[4px] text-[6px] font-black uppercase ring-1 ring-[#071554]">VS</div>

                    {/* Team 2 */}
                    <div className="flex-1 flex flex-col items-center gap-1">
                        <div className="grid grid-cols-2 gap-1 w-full">
                            <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border" style={{ background: "rgba(128,128,128,0.05)", borderColor: "var(--theme-text-muted)" }}>
                                <Search size={10} style={{ color: "var(--theme-text-muted)" }} />
                            </div>
                            <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border" style={{ background: "rgba(128,128,128,0.05)", borderColor: "var(--theme-text-muted)" }}>
                                <Search size={10} style={{ color: "var(--theme-text-muted)" }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="ml-1 block text-[7px] font-black uppercase tracking-widest" style={{ color: "var(--theme-text-muted)" }}>Équipe gagnante</label>
                <div className="grid grid-cols-2 gap-1.5">
                    <button className="rounded-lg border border-[var(--theme-secondary-accent)] bg-[var(--theme-secondary-accent)] py-1.5 text-[8px] font-black text-[#071554] flex items-center justify-center gap-1 uppercase">
                        <Trophy size={10} /> Équipe 1
                    </button>
                    <button className="rounded-lg border py-1.5 text-[8px] font-black flex items-center justify-center gap-1 uppercase" style={{ background: "rgba(128,128,128,0.1)", borderColor: "var(--theme-text-muted)", color: "var(--theme-text-muted)" }}>
                        Équipe 2
                    </button>
                </div>
            </div>

            <div className="py-1 text-center border-t pt-2" style={{ borderColor: 'var(--theme-text-muted)' }}>
                <label className="mb-2 block text-[7px] font-black uppercase tracking-widest" style={{ color: "var(--theme-text-muted)" }}>Scores des sets</label>
                <div className="flex justify-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[6px] font-black uppercase" style={{ color: "var(--theme-text-muted)" }}>Set 1</span>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(128,128,128,0.1)", color: "var(--theme-text)" }}>6</div>
                            <span style={{ color: "var(--theme-text-muted)" }} className="text-[8px]">:</span>
                            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(128,128,128,0.1)", color: "var(--theme-text)" }}>3</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[6px] font-black uppercase" style={{ color: "var(--theme-text-muted)" }}>Set 2</span>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(128,128,128,0.1)", color: "var(--theme-text)" }}>6</div>
                            <span style={{ color: "var(--theme-text-muted)" }} className="text-[8px]">:</span>
                            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(128,128,128,0.1)", color: "var(--theme-text)" }}>4</div>
                        </div>
                    </div>
                </div>
            </div>

            <button className="w-full rounded-lg bg-[var(--theme-secondary-accent)] py-2.5 font-black text-[#071554] text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
                ENREGISTRER LE MATCH
            </button>
        </div>
    </div>
);

export const CompetitionPreview = () => (
    <div className="w-full h-full overflow-y-auto w-full pb-4 animate-fadeIn font-sans pt-1">
        <TopPill title="Compétition" subtitle="" />
        <Tabs items={["Classement", "Challenges", "Ligues"]} activeIdx={0} />

        <div className="space-y-4">
            <div className="flex items-center justify-center gap-1 px-1 overflow-x-auto scrollbar-hide">
                {[
                    { label: 'Club', icon: Search, active: false },
                    { label: 'Département', icon: MapPin, active: true },
                    { label: 'Région', icon: MapIcon, active: false },
                    { label: 'France', icon: Globe, active: false },
                ].map(({ label, icon: Icon, active }) => (
                    <button key={label} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[7px] font-bold transition-all whitespace-nowrap border ${active ? 'bg-[var(--theme-accent)]/20 text-blue-400 border-[var(--theme-accent)]/40' : 'bg-white/5 text-white/40 border-white/10'}`}>
                        <Icon size={10} />
                        <span style={{ color: active ? 'inherit' : 'var(--theme-text-muted)' }}>{label}</span>
                    </button>
                ))}
            </div>

            <div className="relative pt-2">
                <div className="flex items-end justify-center gap-1 px-1">
                    {/* #2 */}
                    <div className="flex-1 max-w-[65px] h-20 rounded-t-lg bg-slate-400 relative flex flex-col items-center justify-end pb-2">
                        <div className="absolute -top-4 w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"><User size={14} className="text-slate-400" /></div>
                        <span className="text-[7px] font-black text-white uppercase mb-1 drop-shadow-sm">Mathis</span>
                        <div className="bg-black/20 px-1 rounded text-[6px] font-black text-white">2ème</div>
                    </div>

                    {/* #1 */}
                    <div className="flex-1 max-w-[75px] h-24 rounded-t-lg bg-amber-400 relative flex flex-col items-center justify-end pb-3 shadow-lg">
                        <div className="absolute -top-5 w-9 h-9 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"><User size={18} className="text-slate-400" /></div>
                        <span className="text-[8px] font-black text-white uppercase mb-1 drop-shadow-md">Lilian</span>
                        <div className="bg-black/20 px-1.5 rounded text-[7px] font-black text-white">CHAMPION</div>
                    </div>

                    {/* #3 */}
                    <div className="flex-1 max-w-[65px] h-16 rounded-t-lg bg-orange-400 relative flex flex-col items-center justify-end pb-2">
                        <div className="absolute -top-4 w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"><User size={14} className="text-slate-400" /></div>
                        <span className="text-[7px] font-black text-white uppercase mb-1 drop-shadow-sm">Sarah</span>
                        <div className="bg-black/20 px-1 rounded text-[6px] font-black text-white">3ème</div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border overflow-hidden mx-1 shadow-2xl" style={{ borderColor: 'var(--theme-text-muted)', background: 'rgba(128,128,128,0.05)' }}>
                <table className="w-full text-left text-[7px]">
                    <thead className="bg-black/10 uppercase font-black tracking-tighter" style={{ color: 'var(--theme-text-muted)' }}>
                        <tr>
                            <th className="px-2 py-1.5">Rang</th>
                            <th className="px-2 py-1.5">Joueur</th>
                            <th className="px-2 py-1.5 text-center">Niv.</th>
                            <th className="px-2 py-1.5 text-right">Pts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-bold" style={{ color: 'var(--theme-text)' }}>
                        <tr>
                            <td className="px-2 py-2 text-amber-500 font-black">1</td>
                            <td className="px-2 py-2">Lilian R.</td>
                            <td className="px-2 py-2 text-center text-blue-400">6.49</td>
                            <td className="px-2 py-2 text-right">695</td>
                        </tr>
                        <tr className="bg-[var(--theme-accent)]/10">
                            <td className="px-2 py-2" style={{ color: 'var(--theme-text-muted)' }}>2</td>
                            <td className="px-2 py-2">Mathis H.</td>
                            <td className="px-2 py-2 text-center text-blue-400">6.00</td>
                            <td className="px-2 py-2 text-right">419</td>
                        </tr>
                        <tr>
                            <td className="px-2 py-2" style={{ color: 'var(--theme-text-muted)' }}>3</td>
                            <td className="px-2 py-2">Sarah M.</td>
                            <td className="px-2 py-2 text-center text-blue-400">5.82</td>
                            <td className="px-2 py-2 text-right">382</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

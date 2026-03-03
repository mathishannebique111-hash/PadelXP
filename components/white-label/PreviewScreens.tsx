import React from "react";
import { Flame, User, Search, MapPin, Map as MapIcon, Globe, Eye, Trophy, X, Share2 } from "lucide-react";

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

export const Tabs = ({ items, activeIdx, onChange }: { items: string[], activeIdx: number, onChange?: (idx: number) => void }) => (
    <div className="flex items-center w-full mb-3 border-b" style={{ borderColor: 'rgb(var(--theme-text) / 0.1)' }}>
        {items.map((item, i) => (
            <div
                key={item}
                onClick={() => onChange?.(i)}
                className={`flex-1 py-1.5 text-[7px] font-black transition-all duration-200 relative text-center uppercase tracking-tighter cursor-pointer`}
                style={{ color: i === activeIdx ? "var(--theme-text)" : "var(--theme-text-muted)" }}
            >
                <span className="flex items-center justify-center gap-1">{item}</span>
                {i === activeIdx && <div className="absolute bottom-0 left-0 right-0 h-[1.5px]" style={{ background: "rgb(var(--theme-secondary-accent))", boxShadow: "0 0 4px rgb(var(--theme-secondary-accent) / 0.4)" }} />}
            </div>
        ))}
    </div>
);

// Screens
// Screens
export const ProfilePreview = () => {
    const [activeTab, setActiveTab] = React.useState(0);
    return (
        <div className="w-full h-full overflow-y-auto pb-2 animate-fadeIn font-sans pt-1">
            <TopPill title="Bienvenue Lilian !" subtitle="Club : Padel Club • @lilian.richard" />
            <Tabs items={["Profil", "Stats", "Badges", "Club"]} activeIdx={activeTab} onChange={setActiveTab} />

            {activeTab === 0 && (
                <div className="animate-fadeIn">
                    {/* PROFILE CONTENT (Circular Gauge) */}
                    <div className="flex flex-col items-center mb-4">
                        <div className="relative w-28 h-28 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(128, 128, 128, 0.05)" }}>
                            {/* Gauge SVG */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
                                <circle cx="50" cy="50" r="46" fill="none" stroke="rgb(var(--theme-secondary-accent))" strokeWidth="4" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={289 - (289 * 0.49)} className="opacity-80" />
                            </svg>
                            <div className="flex flex-col items-center justify-center z-10 text-center">
                                <span className="text-[6px] uppercase tracking-[0.2em] font-black" style={{ color: "rgb(var(--theme-secondary-accent))" }}>Niveau</span>
                                <span className="text-2xl font-black" style={{ color: "var(--theme-text)" }}>6.49</span>
                            </div>
                        </div>

                        <div className="w-full max-w-[160px] space-y-2">
                            <div className="w-full h-8 rounded-lg flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-transform active:scale-95" style={{ background: "rgb(var(--theme-secondary-accent))", color: "#071554" }}>
                                <Share2 size={12} className="stroke-[3px]" />
                                PARTAGER
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[6px] font-bold" style={{ color: "var(--theme-text-muted)" }}>Vers niveau 7</span>
                                    <span className="text-[6px] font-black" style={{ color: "rgb(var(--theme-secondary-accent))" }}>49%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: "49%", background: "rgb(var(--theme-secondary-accent))" }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PARTNER CARD MOCKUP */}
                    <div className="rounded-xl border p-2 flex items-center gap-2" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[7px] font-black uppercase text-white truncate">Mathis Hannebique</div>
                            <div className="text-[6px] font-bold text-white/50 uppercase">Partenaire habituel</div>
                        </div>
                        <div className="bg-[var(--theme-secondary-accent)]/10 px-1.5 py-0.5 rounded text-[7px] font-black" style={{ color: 'rgb(var(--theme-secondary-accent))', backgroundColor: 'rgb(var(--theme-secondary-accent) / 0.1)' }}>6.00</div>
                    </div>
                </div>
            )}

            {activeTab === 1 && (
                <div className="animate-fadeIn space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border p-2" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                            <div className="text-[6px] font-black text-white/40 uppercase mb-1">Victoires</div>
                            <div className="text-xl font-black text-white">24</div>
                        </div>
                        <div className="rounded-xl border p-2" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                            <div className="text-[6px] font-black text-white/40 uppercase mb-1">Défaites</div>
                            <div className="text-xl font-black text-white">12</div>
                        </div>
                    </div>
                    {/* Simple Bar Chart Mockup */}
                    <div className="rounded-xl border p-3 flex flex-col justify-end gap-1 h-32" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                        <div className="flex items-end justify-between h-full px-2">
                            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                <div key={i} className="w-2 rounded-t-sm" style={{ height: `${h}%`, background: i === 3 ? "rgb(var(--theme-secondary-accent))" : "var(--theme-text-muted)" }} />
                            ))}
                        </div>
                        <div className="border-t pt-1 flex justify-between px-1" style={{ borderColor: "rgba(var(--theme-text), 0.1)" }}>
                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-[5px] font-black text-white/30">{d}</span>)}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn grid grid-cols-3 gap-2">
                    {[
                        { icon: Trophy, title: "Premium", color: "rgb(255, 191, 0)" },
                        { icon: Flame, title: "Série 5", color: "rgb(255, 69, 0)" },
                        { icon: User, title: "Ancien", color: "rgb(var(--theme-secondary-accent))" },
                        { icon: MapIcon, title: "Voyageur", color: "rgba(255,255,255,0.2)" },
                        { icon: Globe, title: "Social", color: "rgba(255,255,255,0.2)" },
                    ].map((b, i) => (
                        <div key={i} className="aspect-square rounded-xl border flex flex-col items-center justify-center p-1" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                            <b.icon size={16} style={{ color: b.color }} />
                            <span className="text-[5px] font-black uppercase mt-1 text-white/50">{b.title}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 3 && (
                <div className="animate-fadeIn space-y-3">
                    <div className="rounded-xl border p-3" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                        <div className="w-10 h-10 rounded-lg bg-white/10 mb-2 flex items-center justify-center">
                            <img src="/images/Logo sans fond.png" className="w-8 h-8 object-contain opacity-50" />
                        </div>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-tight">Padel Club Amiens</h3>
                        <p className="text-[7px] text-white/50 mb-3 flex items-center gap-1">
                            <MapPin size={8} /> 2 Rue de la Vallée, 80000 Amiens
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white/5 rounded-lg p-1.5 border border-white/5">
                                <div className="text-[5px] text-white/30 uppercase font-bold">Terrains</div>
                                <div className="text-[9px] font-black text-white">6 Courts</div>
                            </div>
                            <div className="flex-1 bg-white/5 rounded-lg p-1.5 border border-white/5">
                                <div className="text-[5px] text-white/30 uppercase font-bold">Type</div>
                                <div className="text-[9px] font-black text-white">Couverts</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MatchesPreview = () => {
    const [activeTab, setActiveTab] = React.useState(0);
    return (
        <div className="w-full h-full overflow-y-auto w-full pb-4 animate-fadeIn font-sans pt-1">
            <TopPill title="Matchs" subtitle="Club : Padel Club" />
            <Tabs items={["Enregistrer", "Historique", "Partenaires"]} activeIdx={activeTab} onChange={setActiveTab} />

            {activeTab === 0 && (
                <div className="space-y-3 px-1 animate-fadeIn">
                    <div className="w-full">
                        <label className="mb-0.5 ml-1 block text-[7px] font-black uppercase tracking-widest" style={{ color: "var(--theme-text-muted)" }}>Lieu du match</label>
                        <div className="w-full h-8 rounded-lg border px-2 text-[10px] font-bold flex items-center shadow-inner" style={{ background: "rgba(128,128,128,0.1)", borderColor: "rgba(var(--theme-text), 0.1)", color: "var(--theme-text)" }}>
                            Padel Club
                        </div>
                        <p className="mt-0.5 text-[7px] font-black ml-1 flex items-center gap-1 uppercase tracking-wider" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>
                            <MapPin size={8} /> AMIENS
                        </p>
                    </div>

                    <div className="py-1">
                        <div className="flex items-center justify-center gap-2 w-full">
                            {/* Team 1 */}
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <div className="grid grid-cols-2 gap-1 w-full">
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent) / 0.1)', borderColor: 'rgb(var(--theme-secondary-accent))' }}>
                                        <div className="w-6 h-6 rounded-full border bg-white/10 flex items-center justify-center" style={{ borderColor: 'rgba(var(--theme-text), 0.1)' }}>
                                            <User size={12} style={{ color: "var(--theme-text)" }} />
                                        </div>
                                        <span className="text-[6px] font-black uppercase mt-0.5" style={{ color: "var(--theme-text)" }}>Lilian</span>
                                        <div className="absolute top-0.5 left-0.5 px-0.5 rounded text-[6px] font-black" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent) / 0.3)', color: 'rgb(var(--theme-secondary-accent))' }}>6.4</div>
                                    </div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border group" style={{ background: "rgba(128,128,128,0.05)", borderColor: "rgba(var(--theme-text), 0.1)" }}>
                                        <Search size={10} style={{ color: "var(--theme-text-muted)" }} />
                                        <span className="text-[5px] font-black uppercase mt-0.5" style={{ color: "var(--theme-text-muted)" }}>AJOUTER</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-[6px] font-black uppercase ring-1 px-1 py-0.5 rounded-[4px]" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: '#071554', boxShadow: "0 0 0 1px #071554" }}>VS</div>

                            {/* Team 2 */}
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <div className="grid grid-cols-2 gap-1 w-full">
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border" style={{ background: "rgba(128,128,128,0.05)", borderColor: "rgba(var(--theme-text), 0.1)" }}>
                                        <Search size={10} style={{ color: "var(--theme-text-muted)" }} />
                                    </div>
                                    <div className="aspect-square relative flex flex-col items-center justify-center rounded-lg border" style={{ background: "rgba(128,128,128,0.05)", borderColor: "rgba(var(--theme-text), 0.1)" }}>
                                        <Search size={10} style={{ color: "var(--theme-text-muted)" }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="ml-1 block text-[7px] font-black uppercase tracking-widest" style={{ color: "var(--theme-text-muted)" }}>Équipe gagnante</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button className="rounded-lg border py-1.5 text-[8px] font-black flex items-center justify-center gap-1 uppercase" style={{ background: "rgb(var(--theme-secondary-accent))", borderColor: "rgb(var(--theme-secondary-accent))", color: "#071554" }}>
                                <Trophy size={10} /> Équipe 1
                            </button>
                            <button className="rounded-lg border py-1.5 text-[8px] font-black flex items-center justify-center gap-1 uppercase" style={{ background: "rgba(128,128,128,0.1)", borderColor: "rgba(var(--theme-text), 0.1)", color: "var(--theme-text-muted)" }}>
                                Équipe 2
                            </button>
                        </div>
                    </div>

                    <button className="w-full rounded-lg py-2.5 font-black text-[#071554] text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform" style={{ background: "rgb(var(--theme-secondary-accent))" }}>
                        ENREGISTRER LE MATCH
                    </button>
                </div>
            )}

            {activeTab === 1 && (
                <div className="space-y-3 animate-fadeIn">
                    {[
                        { won: true, score: "6-2 6-4", date: "Aujourd'hui" },
                        { won: false, score: "4-6 5-7", date: "Hier" },
                    ].map((m, i) => (
                        <div key={i} className="rounded-xl border-2 p-3" style={{ background: m.won ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)", borderColor: m.won ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)" }}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${m.won ? "bg-green-500" : "bg-red-500"}`}>
                                        <Trophy size={8} className="text-white" />
                                    </div>
                                    <span className="text-[8px] font-black uppercase" style={{ color: m.won ? "rgb(22, 101, 52)" : "rgb(153, 27, 27)" }}>{m.won ? "Victoire" : "Défaite"}</span>
                                </div>
                                <span className="text-[7px] font-bold text-gray-500">{m.date}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex -space-x-1">
                                    <div className="w-4 h-4 rounded-full bg-slate-100 border border-white" />
                                    <div className="w-4 h-4 rounded-full bg-slate-200 border border-white" />
                                </div>
                                <div className="px-2 py-0.5 rounded bg-white border border-gray-100 font-black text-[9px] text-gray-900">{m.score}</div>
                                <div className="flex -space-x-1">
                                    <div className="w-4 h-4 rounded-full bg-slate-100 border border-white" />
                                    <div className="w-4 h-4 rounded-full bg-slate-200 border border-white" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn space-y-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" size={12} />
                        <div className="w-full h-8 rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 flex items-center text-[8px] text-white/40">
                            Rechercher un partenaire...
                        </div>
                    </div>
                    <div className="space-y-2">
                        {[
                            { name: "Mathis H.", level: "6.00" },
                            { name: "Sarah M.", level: "5.82" },
                            { name: "Julien B.", level: "6.15" },
                        ].map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-xl border" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                        <User size={12} className="text-slate-400" />
                                    </div>
                                    <span className="text-[8px] font-black text-white uppercase">{p.name}</span>
                                </div>
                                <div className="px-1.5 py-0.5 rounded text-[7px] font-black" style={{ color: 'rgb(var(--theme-secondary-accent))', backgroundColor: 'rgb(var(--theme-secondary-accent) / 0.1)' }}>{p.level}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const CompetitionPreview = () => {
    const [activeTab, setActiveTab] = React.useState(0);
    return (
        <div className="w-full h-full overflow-y-auto w-full pb-4 animate-fadeIn font-sans pt-1">
            <TopPill title="Compétition" subtitle="" />
            <Tabs items={["Classement", "Challenges", "Ligues"]} activeIdx={activeTab} onChange={setActiveTab} />

            {activeTab === 0 && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-center gap-1 px-1 overflow-x-auto scrollbar-hide">
                        {[
                            { label: 'Club', icon: Search, active: false },
                            { label: 'Département', icon: MapPin, active: true },
                            { label: 'Région', icon: MapIcon, active: false },
                            { label: 'France', icon: Globe, active: false },
                        ].map(({ label, icon: Icon, active }) => (
                            <button key={label} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[7px] font-bold transition-all whitespace-nowrap border ${active
                                ? 'bg-[var(--theme-secondary-accent)]/10 border-[var(--theme-secondary-accent)]/30 shadow-sm'
                                : 'bg-white/5 text-white/40 border-white/10'}`}>
                                <Icon size={10} style={{ color: active ? 'rgb(var(--theme-secondary-accent))' : 'inherit' }} />
                                <span style={{ color: active ? 'rgb(var(--theme-secondary-accent))' : 'var(--theme-text-muted)' }}>{label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative pt-6 px-1">
                        <div className="flex items-end justify-center gap-2">
                            {/* #2 - Silver (Left) */}
                            <div className="flex-1 rounded-xl border border-slate-400/80 p-2 shadow-lg relative overflow-hidden h-20 flex flex-col items-center justify-end pb-2 group"
                                style={{ background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <div className="absolute top-1 right-1 text-[8px] z-20">🥈</div>
                                <div className="absolute -top-3 w-8 h-8 rounded-full border border-white/80 bg-slate-100 flex items-center justify-center shadow-md">
                                    <User size={16} className="text-slate-400" />
                                </div>
                                <span className="text-[6px] font-black text-gray-900 uppercase text-center leading-tight">Mathis H.</span>
                            </div>

                            {/* #1 - Gold (Center) */}
                            <div className="flex-[1.2] rounded-xl border border-yellow-500/80 p-2 shadow-xl relative overflow-hidden h-24 flex flex-col items-center justify-end pb-3 z-10"
                                style={{ background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)', boxShadow: '0 4px 15px rgba(0,0,0,0.12)' }}>
                                <div className="absolute top-1 right-1 text-[10px] z-20">🥇</div>
                                <div className="absolute -top-4 w-10 h-10 rounded-full border border-white/80 bg-slate-100 flex items-center justify-center shadow-lg">
                                    <User size={20} className="text-slate-400" />
                                </div>
                                <span className="text-[8px] font-black text-gray-900 uppercase text-center leading-tight">Lilian R.</span>
                            </div>

                            {/* #3 - Bronze (Right) */}
                            <div className="flex-1 rounded-xl border border-orange-600/80 p-2 shadow-lg relative overflow-hidden h-18 flex flex-col items-center justify-end pb-2"
                                style={{ background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <div className="absolute top-1 right-1 text-[8px] z-20">🥉</div>
                                <div className="absolute -top-3 w-8 h-8 rounded-full border border-white/80 bg-slate-100 flex items-center justify-center shadow-md">
                                    <User size={16} className="text-slate-400" />
                                </div>
                                <span className="text-[6px] font-black text-gray-900 uppercase text-center leading-tight">Sarah M.</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border-2 border-white overflow-hidden mx-1.5 shadow-xl bg-white/5 backdrop-blur-sm">
                        <table className="w-full text-left text-[7px] border-collapse">
                            <thead className="bg-gray-200 uppercase font-black text-gray-900">
                                <tr>
                                    <th className="px-2 py-2 border-r border-gray-100 w-8">Rang</th>
                                    <th className="px-2 py-2 border-r border-gray-100">Joueur</th>
                                    <th className="px-2 py-2 border-r border-gray-100 text-center">Niv.</th>
                                    <th className="px-2 py-2 text-right">Pts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white font-bold text-gray-900">
                                <tr>
                                    <td className="px-2 py-2 border-r border-gray-100 text-center">
                                        <span className="bg-yellow-100 text-yellow-700 w-4 h-4 rounded-full inline-flex items-center justify-center text-[6px]">1</span>
                                    </td>
                                    <td className="px-2 py-2 border-r border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex-shrink-0" />
                                            <span>Lilian R.</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 border-r border-gray-100 text-center font-black" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>6.49</td>
                                    <td className="px-2 py-2 text-right tabular-nums">695</td>
                                </tr>
                                <tr className="bg-blue-50">
                                    <td className="px-2 py-2 border-r border-gray-100 text-center">
                                        <span className="bg-slate-100 text-slate-700 w-4 h-4 rounded-full inline-flex items-center justify-center text-[6px]">2</span>
                                    </td>
                                    <td className="px-2 py-2 border-r border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex-shrink-0" />
                                            <span>Mathis H.</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 border-r border-gray-100 text-center font-black" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>6.00</td>
                                    <td className="px-2 py-2 text-right tabular-nums">419</td>
                                </tr>
                                <tr>
                                    <td className="px-2 py-2 border-r border-gray-100 text-center">
                                        <span className="bg-orange-100 text-orange-700 w-4 h-4 rounded-full inline-flex items-center justify-center text-[6px]">3</span>
                                    </td>
                                    <td className="px-2 py-2 border-r border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex-shrink-0" />
                                            <span>Sarah M.</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 border-r border-gray-100 text-center font-black" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>5.82</td>
                                    <td className="px-2 py-2 text-right tabular-nums">382</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 1 && (
                <div className="animate-fadeIn space-y-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-amber-500" />
                            <span className="text-[8px] font-black text-white uppercase">Défis actifs</span>
                        </div>
                        <span className="text-[10px] font-black text-amber-500">125 pts</span>
                    </div>
                    {[
                        { title: "Série de victoires", progress: 60, desc: "Gagnez 3 matchs de suite" },
                        { title: "L'infatigable", progress: 30, desc: "Jouez 5 matchs cette semaine" },
                    ].map((c, i) => (
                        <div key={i} className="rounded-xl border p-3" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[8px] font-black text-white uppercase">{c.title}</span>
                                <span className="text-[8px] font-black" style={{ color: "rgb(var(--theme-secondary-accent))" }}>{c.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mb-1">
                                <div className="h-full rounded-full" style={{ width: `${c.progress}%`, background: "rgb(var(--theme-secondary-accent))" }} />
                            </div>
                            <p className="text-[6px] text-white/40">{c.desc}</p>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 2 && (
                <div className="animate-fadeIn space-y-3">
                    {[
                        { title: "Tournoi d'Hiver", date: "15 Mars - 20 Mars", players: "32/64" },
                        { title: "Ligue Amiénoise", date: "Permanent", players: "128 Joueurs" },
                    ].map((l, i) => (
                        <div key={i} className="rounded-xl border p-3" style={{ borderColor: "rgba(var(--theme-text), 0.1)", background: "rgba(128, 128, 128, 0.05)" }}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-[9px] font-black text-white uppercase">{l.title}</h3>
                                    <p className="text-[7px] text-white/50">{l.date}</p>
                                </div>
                                <div className="px-1.5 py-0.5 rounded bg-white/10 text-[6px] font-black text-white">{l.players}</div>
                            </div>
                            <button className="w-full py-1.5 rounded-lg border text-[7px] font-black uppercase tracking-widest" style={{ borderColor: "rgb(var(--theme-secondary-accent))", color: "rgb(var(--theme-secondary-accent))" }}>
                                S'INSCRIRE
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

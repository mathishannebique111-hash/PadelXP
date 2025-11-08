export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3B82F6] font-bold text-white">P</div>
            <span className="text-lg font-semibold tracking-tight">PadelLeague</span>
          </a>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="/" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Accueil</a>
            <a href="/home" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Accueil protégé</a>
            <a href="/match/submit" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Soumettre Match</a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <section className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Organisez vos ligues de padel</h1>
            <p className="mt-3 text-lg font-medium text-slate-700">PadelLeague — la plateforme simple et moderne pour vos clubs</p>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-600">Créez des ligues en quelques minutes, suivez un classement en temps réel et gamifiez l’expérience avec rangs et badges. Soumission de match en moins de 30 secondes.</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/home" className="inline-flex items-center justify-center rounded-md bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-transparent transition-colors hover:bg-[#2F6BD1] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40">Aller à l'espace protégé</a>
              <a href="/match/submit" className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30">Soumettre un Match</a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Classements en temps réel</div>
              <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" />PWA mobile-friendly</div>
              <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" />Rangs & badges</div>
            </div>
          </div>

          <div className="relative hidden h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-xl sm:flex">
            <div className="absolute -inset-px rounded-2xl ring-1 ring-slate-200" />
            <div className="mx-auto w-full max-w-md text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#3B82F6] text-white shadow-lg"><span className="text-2xl font-extrabold">PL</span></div>
              <p className="text-lg font-semibold text-slate-800">Lancez votre ligue aujourd’hui</p>
              <p className="mt-2 text-slate-600">Classements live, soumission rapide, et progression visible pour vos joueurs.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">© {new Date().getFullYear()} PadelLeague — Tous droits réservés</footer>
    </div>
  );
}

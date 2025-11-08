"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 font-bold text-white">
              P
            </div>
            <span className="text-lg font-semibold">PadelLeague</span>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16">
        <h1 className="text-5xl font-bold">Organisez vos ligues de padel</h1>
        <p className="mt-4 text-xl text-slate-600">
          Créez des ligues, suivez les classements, et gamifiez l'expérience.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/home"
            className="rounded-md bg-blue-500 px-6 py-3 text-white font-semibold hover:bg-blue-600"
          >
            Accueil protégé
          </Link>
          <Link
            href="/match/submit"
            className="rounded-md border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50"
          >
            Soumettre un Match
          </Link>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-slate-500">
        © 2025 PadelLeague
      </footer>
    </div>
  );
}

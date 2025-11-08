export default function ChallengesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Challenges</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Liste</h2>
        <div className="text-sm text-white/60">Aucun challenge actif</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Créer un challenge</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input placeholder="Titre" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
          <input placeholder="Début" type="date" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
          <input placeholder="Fin" type="date" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
        </div>
        <button className="mt-3 px-3 py-2 rounded bg-white/10 border border-white/10">Créer</button>
      </div>
    </div>
  );
}




export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Paramètres du club</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="font-semibold">Identité</h2>
        <input placeholder="Nom du club" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
        <input placeholder="Adresse" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
        <input placeholder="Contact (email)" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" /> Activer le classement</label>
          <label className="flex items-center gap-2"><input type="checkbox" /> Activer le feed</label>
        </div>
        <button className="px-3 py-2 rounded bg-white/10 border b or der-white/10">Enregistrer</button>
      </div>
    </div>
  );
}



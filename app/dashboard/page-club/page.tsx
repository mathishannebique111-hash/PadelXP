export default function PageClubPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Page publique du club</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Aperçu</h2>
        <div className="h-40 bg-white/10 rounded" />
        <div className="mt-3 flex gap-2 text-sm">
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Publier</button>
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Retirer</button>
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Copier l’URL</button>
        </div>
      </div>
    </div>
  );
}




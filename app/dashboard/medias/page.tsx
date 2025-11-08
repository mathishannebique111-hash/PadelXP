export default function MediasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Médias</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Bibliothèque</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="aspect-square bg-white/10 rounded" />
          <div className="aspect-square bg-white/10 rounded" />
          <div className="aspect-square bg-white/10 rounded" />
        </div>
        <button className="mt-3 px-3 py-2 rounded bg-white/10 border border-white/10">Uploader</button>
      </div>
    </div>
  );
}




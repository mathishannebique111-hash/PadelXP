export default function FeedPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Feed du club</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Posts</h2>
        <div className="text-sm text-white/60">Automatiques et publiés par le club</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Nouveau post</h2>
        <textarea className="w-full px-3 py-2 rounded bg-white/10 border border-white/10" rows={4} placeholder="Écrire une annonce..." />
        <button className="mt-2 px-3 py-2 rounded bg-white/10 border border-white/10">Publier</button>
      </div>
    </div>
  );
}





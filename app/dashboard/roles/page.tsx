export default function RolesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Rôles et accès</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Administrateurs</h2>
        <div className="text-sm text-white/60">Propriétaire, Admins</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Inviter un admin</h2>
        <div className="flex gap-2">
          <input placeholder="Email" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Inviter</button>
        </div>
      </div>
    </div>
  );
}



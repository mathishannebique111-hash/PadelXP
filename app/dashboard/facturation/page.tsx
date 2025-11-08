export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Facturation & essai</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm">Statut de l’abonnement : <strong className="text-white">Essai — J‑30</strong></div>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Activer l’abonnement</button>
          <button className="px-3 py-2 rounded bg-white/10 border border-white/10">Mettre en pause</button>
        </div>
      </div>
    </div>
  );
}





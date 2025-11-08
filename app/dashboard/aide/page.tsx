export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Aide & Support</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Mini‑FAQ</h2>
        <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
          <li>Comment démarrer en 10 minutes ?</li>
          <li>Activer le classement</li>
          <li>Inviter ses membres au club</li>
        </ul>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Contact</h2>
        <div className="text-sm text-white/60">support@padelxp.fr</div>
      </div>
    </div>
  );
}



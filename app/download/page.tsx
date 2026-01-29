export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold">📱 Espace Joueurs</h1>
        <p className="text-gray-400 text-lg">
          L'expérience joueur est disponible uniquement sur notre application mobile.
        </p>
        <div className="flex flex-col gap-4 pt-4">
          <a
            href="https://apps.apple.com/app/id6757870307"
            className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            📱 Télécharger sur l'App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=eu.padelxp.player"
            className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            🤖 Télécharger sur Google Play
          </a>
        </div>
      </div>
    </div>
  );
}

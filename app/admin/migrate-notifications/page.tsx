'use client'

import { useState } from 'react'

export default function MigrateNotificationsPage() {
  const [secret, setSecret] = useState('')
  const [clearExisting, setClearExisting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMigrate = async () => {
    if (!secret.trim()) {
      setError('Veuillez entrer le secret d\'administration')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/migrate-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secret.trim(),
          clearExisting,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur inconnue')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-black to-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🔄 Migration des Notifications Historiques
          </h1>
          <p className="text-white/70 mb-8">
            Ce script va générer les notifications historiques pour tous les joueurs
            (niveau, badges, classement Top 3)
          </p>

          <div className="space-y-6">
            {/* Secret d'administration */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Secret d'administration
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Entrez le secret (ADMIN_MIGRATION_SECRET)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-white/50 mt-1">
                Défini dans .env.local : ADMIN_MIGRATION_SECRET
              </p>
            </div>

            {/* Option de suppression */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="clearExisting"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/10"
              />
              <label htmlFor="clearExisting" className="text-white text-sm">
                Supprimer les notifications existantes (level_up, badge_unlocked, top3_ranking)
              </label>
            </div>

            {/* Bouton de migration */}
            <button
              onClick={handleMigrate}
              disabled={loading}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                loading
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:scale-105'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Migration en cours...
                </span>
              ) : (
                '🚀 Lancer la migration'
              )}
            </button>

            {/* Affichage des erreurs */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200 font-semibold">❌ Erreur</p>
                <p className="text-red-100 text-sm mt-1">{error}</p>
              </div>
            )}

            {/* Affichage des résultats */}
            {result && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6">
                <p className="text-green-200 font-bold text-xl mb-4">
                  ✅ Migration réussie !
                </p>
                
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <p className="text-white font-semibold mb-2">📊 Statistiques</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/70">Joueurs traités:</span>
                      <span className="text-white font-bold ml-2">
                        {result.stats?.players || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/70">Notifications créées:</span>
                      <span className="text-green-400 font-bold ml-2">
                        {result.stats?.notifications || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logs détaillés */}
                {result.logs && result.logs.length > 0 && (
                  <div>
                    <p className="text-white/70 font-semibold mb-2 text-sm">
                      📝 Logs détaillés
                    </p>
                    <div className="bg-black/50 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs">
                      {result.logs.map((log: string, index: number) => (
                        <div
                          key={index}
                          className={`${
                            log.includes('✅')
                              ? 'text-green-300'
                              : log.includes('❌')
                              ? 'text-red-300'
                              : log.includes('⚠️')
                              ? 'text-yellow-300'
                              : log.includes('🏢')
                              ? 'text-blue-300 font-bold mt-2'
                              : 'text-white/70'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
            <p className="text-blue-200 font-semibold mb-2">ℹ️ Instructions</p>
            <ol className="text-blue-100 text-sm space-y-2 list-decimal list-inside">
              <li>
                Assurez-vous d'avoir défini <code className="bg-black/30 px-2 py-1 rounded">ADMIN_MIGRATION_SECRET</code> dans <code className="bg-black/30 px-2 py-1 rounded">.env.local</code>
              </li>
              <li>
                Entrez le secret dans le champ ci-dessus
              </li>
              <li>
                Cochez "Supprimer les notifications existantes" si vous voulez régénérer toutes les notifications
              </li>
              <li>
                Cliquez sur "Lancer la migration"
              </li>
              <li>
                Attendez que la migration se termine (peut prendre quelques minutes)
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}


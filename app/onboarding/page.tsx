"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Forcer le rendu dynamique pour éviter les erreurs de prerender avec useSearchParams
export const dynamic = 'force-dynamic';

type Step = 0|1|2|3|4|5|6|7|8|9;

function OnboardingForm() {
  const search = useSearchParams();
  const initialStep = useMemo<Step>(() => {
    const s = Number(search.get("step"));
    if (!Number.isNaN(s) && s >= 0 && s <= 9) return s as Step;
    return 0;
  }, [search]);
  const [step, setStep] = useState<Step>(initialStep);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-white/80 hover:text-white">← Retour</Link>
          <div className="text-sm text-white/60">Onboarding • Étape {step} / 9</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {step === 0 && (
          <section className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-extrabold">Créez votre espace club en 5 minutes.</h1>
            <div className="grid gap-3">
              <button className="px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-left">Continuer avec email</button>
              <button className="px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-left">Continuer avec Google</button>
            </div>
            <p className="text-white/60 text-sm">Aucune carte bancaire requise pendant l'essai de 14 jours.</p>
            <div className="flex items-center gap-4">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(1)}>Commencer</button>
              <Link href="/signup" className="text-white/70 underline">Déjà partenaire ? Se connecter</Link>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Création du compte administrateur</h2>
            <div className="grid gap-4">
              <input placeholder="Prénom" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <input placeholder="Nom" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <input placeholder="Email pro" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <input placeholder="Mot de passe" type="password" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <label className="flex items-start gap-3 text-sm text-white/80">
                <input type="checkbox" className="mt-1" />
                <span>
                  J'accepte les{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Conditions d'utilisation
                  </a>{" "}
                  et la{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Politique de confidentialité
                  </a>
                </span>
              </label>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(2)}>Créer mon compte</button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/10" onClick={() => setStep(0)}>Retour</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Présentez votre club</h2>
            <div className="grid gap-4">
              <input placeholder="Nom du club" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Ville" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
                <input placeholder="Téléphone" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              </div>
              <input placeholder="Adresse" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <input placeholder="Site web (optionnel)" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Nombre de terrains" className="px-4 py-3 rounded-lg bg-white/5 border border-white/10" />
                <select className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                  <option>Type de terrains</option>
                  <option>Couverts</option>
                  <option>Extérieurs</option>
                  <option>Mixte</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">Upload Logo</div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">Upload 3 à 6 photos</div>
              </div>
              <p className="text-white/60 text-sm">Ces informations alimentent votre page publique et l’inscription des joueurs.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(3)}>Continuer</button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/10" onClick={() => setStep(1)}>Retour</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Vos couleurs, votre identité</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                <label className="text-sm text-white/70">Couleur primaire</label>
                <input type="color" className="h-10 w-full rounded" />
                <label className="text-sm text-white/70">Couleur secondaire</label>
                <input type="color" className="h-10 w-full rounded" />
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10">Importer un kit de marque (facultatif)</button>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/70 mb-2">Aperçu live</div>
                <div className="grid gap-2">
                  <div className="h-10 rounded bg-white/10" />
                  <div className="h-24 rounded bg-white/10" />
                  <div className="h-16 rounded bg-white/10" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(4)}>Appliquer et continuer</button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/10" onClick={() => setStep(2)}>Retour</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Invitez vos joueurs</h2>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded bg-white/10 p-3">Code d’invitation: <strong>TOULOUSE2025</strong></div>
                <div className="rounded bg-white/10 p-3">Lien: padelapp.fr/join/TOULOUSE2025</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10">Copier le code</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10">Copier le lien</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10">Générer un QR code</button>
              </div>
              <p className="text-white/60 text-sm">Partagez ce code/lien (WhatsApp, affiches au club, email). Aucun envoi automatique pour l’instant.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(5)}>Continuer</button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/10" onClick={() => setStep(3)}>Retour</button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Ajoutez vos membres (facultatif)</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="font-semibold">Import CSV/XLS</div>
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10">Télécharger le modèle</button>
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10">Importer</button>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="font-semibold">Ajout unitaire ultra‑rapide</div>
                <input placeholder="Nom" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
                <input placeholder="Prénom" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
                <input placeholder="Email" className="px-3 py-2 rounded bg-white/10 border border-white/10" />
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10">Ajouter</button>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(6)}>Importer maintenant</button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/10" onClick={() => setStep(6)}>Passer cette étape</button>
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Activer le classement automatique</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
                <label className="flex items-center justify-between">
                  <span>Classement actif</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded bg-white/10 p-3">
                    <div className="text-sm text-white/70">Type de points</div>
                    <div className="mt-1 font-semibold">Standard</div>
                  </div>
                  <label className="rounded bg-white/10 p-3 flex items-center justify-between">
                    <span>Afficher le Top 3 publiquement</span>
                    <input type="checkbox" defaultChecked />
                  </label>
                </div>
                <p className="text-white/60 text-sm">Le classement se mettra à jour automatiquement à chaque match enregistré par vos membres.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/70 mb-2">Aperçu live</div>
                <div className="grid gap-2">
                  <div className="h-10 rounded bg-white/10" />
                  <div className="h-24 rounded bg-white/10" />
                  <div className="h-16 rounded bg-white/10" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(8)}>Activer</button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/10" onClick={() => setStep(5)}>Retour</button>
            </div>
          </section>
        )}

        {step === 8 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Votre page club est prête</h2>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="text-white/80">URL: <span className="underline">padelapp.fr/club/slug-du-club</span></div>
              <div className="rounded bg-white/10 h-40" />
              <label className="flex items-center justify-between">
                <span>Rendre la page publique</span>
                <input type="checkbox" defaultChecked />
              </label>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold" onClick={() => setStep(9)}>Publier la page</button>
              <button className="px-6 py-3 rounded-lg bg-white/10 border border-white/10" onClick={() => setStep(6)}>Voir l’aperçu</button>
            </div>
          </section>
        )}

        {step === 9 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Prêt à démarrer</h2>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70">Essai gratuit — J-14 restants</div>
            </div>
            <div>
              <div className="font-semibold mb-2">Check‑list d’onboarding</div>
              <ul className="space-y-2 text-sm text-white/80">
                <li>✔︎ Ajouter logo et photos</li>
                <li>☐ Partager le code/lien</li>
                <li>✔︎ Activer le classement</li>
                <li>☐ Publier la page club</li>
              </ul>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <button className="rounded-lg border border-white/10 bg-white/5 p-4">Inviter des membres</button>
              <button className="rounded-lg border border-white/10 bg-white/5 p-4">Télécharger l’affiche QR code</button>
              <button className="rounded-lg border border-white/10 bg-white/5 p-4">Voir mon classement</button>
              <button className="rounded-lg border border-white/10 bg-white/5 p-4">Planifier un challenge</button>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="font-semibold mb-1">Conseils</div>
              <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                <li>Placez l’affiche QR code à l’accueil</li>
                <li>Envoyez le lien d’invitation dans votre groupe WhatsApp</li>
                <li>Fixez un “Challenge du mois” pour lancer l’émulation</li>
              </ul>
            </div>
            <div className="text-sm text-white/60">Support: support@padelxp.fr • Centre d’aide</div>
          </section>
        )}

        {/* Section: Facturation & mode gel (récap + microtextes) */}
        <section className="mt-12 space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="font-semibold mb-2">Fin d’essai & mode gel</div>
            <ul className="text-sm text-white/80 space-y-1">
              <li>Actif: toutes fonctionnalités ouvertes.</li>
              <li>Grâce 7 jours: lecture seule, réactivation en 1 clic.</li>
              <li>Suspendu: modules masqués; profils consultables ("archivé par club").</li>
              <li>Archivé 90 jours: portabilité/exports joueurs; anonymisation club.</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Rejoindre un club partenaire</button>
              <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Exporter mon historique</button>
              <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Prévenir mon club</button>
            </div>
            <p className="mt-3 text-xs text-white/60">Ce club est en pause. Votre historique est en sécurité, mais les fonctionnalités sont désactivées. Réactivez votre club ou rejoignez un club partenaire pour continuer à jouer.</p>
          </div>
        </section>
        {step !== 2 && (
          // Section supplémentaire affichée uniquement hors étape 2
          <section className="mt-12 space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="font-semibold mb-2">Fin d’essai & mode gel</div>
              <ul className="text-sm text-white/80 space-y-1">
                <li>Actif: toutes fonctionnalités ouvertes.</li>
                <li>Grâce 7 jours: lecture seule, réactivation en 1 clic.</li>
                <li>Suspendu: modules masqués; profils consultables ("archivé par club").</li>
                <li>Archivé 90 jours: portabilité/exports joueurs; anonymisation club.</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Rejoindre un club partenaire</button>
                <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Exporter mon historique</button>
                <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm">Prévenir mon club</button>
              </div>
              <p className="mt-3 text-xs text-white/60">Ce club est en pause. Votre historique est en sécurité, mais les fonctionnalités sont désactivées. Réactivez votre club ou rejoignez un club partenaire pour continuer à jouer.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  );
}



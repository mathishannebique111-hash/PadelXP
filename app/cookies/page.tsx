import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/legal/BackButton";

export const metadata: Metadata = {
  title: "Politique des Cookies - PadelXP",
  description: "Information sur l'utilisation des cookies sur PadelXP",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <BackButton />
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Politique des Cookies</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <p className="text-sm text-white/60 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette,
                smartphone) lors de la visite d'un site web. Il permet au site de reconnaître votre
                navigateur et de conserver certaines informations vous concernant.
              </p>
              <p>
                Les cookies peuvent être de plusieurs types :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Cookies techniques :</strong> Strictement nécessaires au fonctionnement du site (authentification, sécurité)</li>
                <li><strong>Cookies analytiques :</strong> Permettent d'analyser l'utilisation du site pour l'améliorer</li>
                <li><strong>Cookies marketing :</strong> Utilisés pour la publicité et le ciblage (non utilisés actuellement sur PadelXP)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Cookies utilisés sur notre site</h2>
            <div className="space-y-4 text-white/80">
              <p>Le tableau ci-dessous détaille les cookies que nous utilisons :</p>

              <div className="overflow-x-auto mt-6">
                <table className="w-full border-collapse border border-white/20">
                  <thead>
                    <tr className="bg-white/10">
                      <th className="border border-white/20 p-3 text-left">Nom du cookie</th>
                      <th className="border border-white/20 p-3 text-left">Type</th>
                      <th className="border border-white/20 p-3 text-left">Durée</th>
                      <th className="border border-white/20 p-3 text-left">Finalité</th>
                      <th className="border border-white/20 p-3 text-left">Consentement</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-white/20 p-3">session_id</td>
                      <td className="border border-white/20 p-3">Technique</td>
                      <td className="border border-white/20 p-3">Session</td>
                      <td className="border border-white/20 p-3">Authentification et maintien de la session utilisateur</td>
                      <td className="border border-white/20 p-3"><strong>Obligatoire</strong></td>
                    </tr>
                    <tr>
                      <td className="border border-white/20 p-3">csrf_token</td>
                      <td className="border border-white/20 p-3">Technique</td>
                      <td className="border border-white/20 p-3">Session</td>
                      <td className="border border-white/20 p-3">Protection contre les attaques CSRF</td>
                      <td className="border border-white/20 p-3"><strong>Obligatoire</strong></td>
                    </tr>
                    <tr>
                      <td className="border border-white/20 p-3">cookie_consent</td>
                      <td className="border border-white/20 p-3">Technique</td>
                      <td className="border border-white/20 p-3">13 mois</td>
                      <td className="border border-white/20 p-3">Mémoriser vos préférences de consentement aux cookies</td>
                      <td className="border border-white/20 p-3"><strong>Obligatoire</strong></td>
                    </tr>
                    <tr>
                      <td className="border border-white/20 p-3">_stripe_mid</td>
                      <td className="border border-white/20 p-3">Technique</td>
                      <td className="border border-white/20 p-3">1 an</td>
                      <td className="border border-white/20 p-3">Stripe - Identification sécurisée pour les paiements</td>
                      <td className="border border-white/20 p-3"><strong>Obligatoire</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-sm text-white/60">
                <strong>Note :</strong> Actuellement, nous n'utilisons pas de cookies analytiques
                (tels que Google Analytics) ni de cookies marketing. Si cela venait à changer, nous
                vous en informerions et mettrions à jour cette page.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Gestion de vos préférences</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Lors de votre première visite, un bandeau vous permet de gérer vos préférences de
                cookies. Vous pouvez :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Accepter tous les cookies</li>
                <li>Refuser tous les cookies non essentiels</li>
                <li>Personnaliser vos préférences par catégorie</li>
              </ul>
              <p>
                Vous pouvez modifier vos préférences à tout moment en cliquant sur le lien
                "Gérer les cookies" disponible en bas de chaque page, ou en supprimant les cookies
                de votre navigateur.
              </p>
              <p className="mt-4">
                <Link
                  href="/cookies/gestion"
                  className="inline-block rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-white transition-colors"
                >
                  Gérer mes préférences de cookies
                </Link>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Cookies tiers</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Stripe :</strong> Notre partenaire de paiement utilise des cookies techniques
                nécessaires au traitement sécurisé des paiements. Ces cookies sont strictement
                nécessaires et ne peuvent pas être désactivés sans affecter le fonctionnement du
                service de paiement.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Désactivation des cookies via votre navigateur</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Vous pouvez configurer votre navigateur pour refuser les cookies. Cependant,
                <strong> la désactivation des cookies strictement nécessaires peut affecter le
                  fonctionnement du site</strong>, notamment :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>L'impossibilité de vous connecter à votre compte</li>
                <li>La perte de vos préférences</li>
                <li>Des dysfonctionnements dans le processus de paiement</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-2">Comment désactiver les cookies :</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies et autres données de sites</li>
                <li><strong>Firefox :</strong> Options → Vie privée et sécurité → Cookies et données de sites</li>
                <li><strong>Safari :</strong> Préférences → Confidentialité → Cookies et données de sites web</li>
                <li><strong>Edge :</strong> Paramètres → Cookies et autorisations de site → Cookies et données de site</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Cookies strictement nécessaires</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Conformément à la réglementation (Directive ePrivacy et CNIL), les cookies
                strictement nécessaires au fonctionnement du site ne nécessitent pas votre
                consentement. Il s'agit notamment de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Cookies d'authentification (session_id)</li>
                <li>Cookies de sécurité (csrf_token)</li>
                <li>Cookies de préférences de consentement (cookie_consent)</li>
                <li>Cookies de paiement sécurisé (Stripe)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Plus d'informations</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Pour plus d'informations sur les cookies et leur gestion, vous pouvez consulter :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Le site de la CNIL : <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-white/80">cnil.fr</a></li>
                <li>Notre{" "}
                  <Link href="/privacy" className="text-white underline hover:text-white/80">
                    Politique de Confidentialité
                  </Link>
                  {" "}pour plus d'informations sur le traitement de vos données
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Contact</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Pour toute question relative aux cookies, vous pouvez nous contacter à :
              </p>
              <p>
                <strong>Email :</strong> contactpadelxp@gmail.com
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


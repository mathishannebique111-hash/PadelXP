import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de Confidentialité - Joueurs - PadelXP",
  description: "Politique de confidentialité et protection des données personnelles de PadelXP pour les joueurs",
};

export default function PlayerPrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            ← Retour aux réglages
          </Link>
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Politique de Confidentialité - Joueurs</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <p className="text-sm text-white/60 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Identité du responsable du traitement</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Le responsable du traitement des données personnelles collectées sur ce site est :
              </p>
              <p>
                <strong>PadelXP</strong><br />
                Adresse : 6 rue Pino, 20200 Bastia, France<br />
                Email : contactpadelxp@gmail.com<br />
              </p>
              <p>
                Pour toute question relative à la protection de vos données personnelles en tant que
                joueur, vous pouvez nous contacter à l'adresse email ci-dessus.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Données collectées pour les joueurs</h2>
            <div className="space-y-2 text-white/80">
              <p>En tant que joueur utilisant gratuitement PadelXP, nous collectons les données personnelles suivantes :</p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.1. Données d'identification</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Nom et prénom :</strong> Pour vous identifier dans les classements et matchs</li>
                <li><strong>Email :</strong> Pour créer votre compte et vous contacter si nécessaire</li>
                <li><strong>Photo de profil :</strong> Si vous choisissez d'en ajouter une (optionnel)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.2. Données de connexion</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Adresse IP</li>
                <li>Logs de connexion et d'utilisation</li>
                <li>Données de navigation (via cookies - voir notre{" "}
                  <Link href="/cookies" className="text-white underline hover:text-white/80">
                    Politique des Cookies
                  </Link>
                  )
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.3. Données d'utilisation (matchs et statistiques)</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Historique des matchs :</strong> Les matchs que vous enregistrez (adversaires, scores, dates)</li>
                <li><strong>Statistiques de jeu :</strong> Nombre de victoires, défaites, points, classement</li>
                <li><strong>Badges obtenus :</strong> Les badges que vous avez débloqués</li>
                <li><strong>Participation aux défis :</strong> Votre participation aux défis organisés par votre club</li>
                <li><strong>Avis laissés :</strong> Les avis que vous avez publiés sur votre club</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.4. Données de club</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Club auquel vous êtes affilié</li>
                <li>Code d'invitation utilisé pour rejoindre le club</li>
              </ul>

              <p className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mt-4">
                <strong className="text-blue-300">ℹ️ Important :</strong> Les données de matchs et statistiques
                que vous enregistrez sont visibles par les autres membres de votre club et les administrateurs
                du club, conformément aux règles de votre club. Elles sont utilisées pour générer les classements
                et leaderboards.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Fins du traitement</h2>
            <div className="space-y-2 text-white/80">
              <p>Vos données personnelles sont traitées pour les finalités suivantes :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Exécution du service gratuit :</strong> Gestion de votre compte joueur, accès à la plateforme, enregistrement de matchs</li>
                <li><strong>Gestion des classements :</strong> Calcul et affichage des classements et leaderboards de votre club</li>
                <li><strong>Suivi des statistiques :</strong> Calcul et affichage de vos statistiques personnelles</li>
                <li><strong>Support client :</strong> Réponse à vos demandes et assistance (en cas de besoin)</li>
                <li><strong>Amélioration du service :</strong> Analyse statistique anonymisée pour améliorer nos fonctionnalités</li>
                <li><strong>Obligations légales :</strong> Conservation des données conformément aux obligations légales</li>
              </ul>
              <p>
                <strong>Marketing :</strong> Nous n'utilisons vos données à des fins de marketing que si vous y avez
                consenti explicitement.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Base légale du traitement</h2>
            <div className="space-y-2 text-white/80">
              <p>Le traitement de vos données personnelles est basé sur :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Votre consentement :</strong> Lors de la création de votre compte, vous acceptez le traitement de vos données</li>
                <li><strong>L'exécution du contrat :</strong> Nécessaire pour vous fournir l'accès gratuit à la plateforme</li>
                <li><strong>L'intérêt légitime :</strong> Amélioration du service, sécurité, prévention de la fraude</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Destinataires des données</h2>
            <div className="space-y-2 text-white/80">
              <p>Vos données personnelles peuvent être partagées avec :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Les membres de votre club :</strong> Vos matchs, statistiques et classement sont visibles par les autres membres de votre club</li>
                <li><strong>Les administrateurs de votre club :</strong> Pour la gestion et la modération du club</li>
                <li><strong>Les prestataires techniques :</strong> Hébergeurs (Vercel, Supabase) dans le cadre strict de l'hébergement</li>
                <li><strong>Les autorités compétentes :</strong> En cas d'obligation légale ou de réquisition judiciaire</li>
              </ul>
              <p className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4 mt-4">
                <strong className="text-orange-300">⚠️ Information importante :</strong> Vos données de matchs
                et statistiques sont publiques au sein de votre club. Tous les membres de votre club peuvent
                les consulter dans les classements et leaderboards.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Conservation des données</h2>
            <div className="space-y-2 text-white/80">
              <p>Vos données personnelles sont conservées :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Pendant la durée d'utilisation de votre compte :</strong> Tant que vous utilisez la plateforme</li>
                <li><strong>Après suppression de compte :</strong> Vos données sont supprimées dans un délai de 30 jours, sauf obligation légale de conservation</li>
                <li><strong>Données de matchs :</strong> Conservées tant que vous êtes membre du club (peuvent être conservées par le club après votre départ)</li>
                <li><strong>Données à caractère personnel :</strong> Supprimées à votre demande ou après 3 ans d'inactivité</li>
              </ul>
            </div>
          </section>

          <section id="delete-account">
            <h2 className="text-2xl font-bold text-white mb-4">7. Vos droits et suppression de compte</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Droit d'accès :</strong> Vous pouvez consulter vos données personnelles via votre espace personnel</li>
                <li><strong>Droit de rectification :</strong> Vous pouvez modifier vos données personnelles via votre espace personnel</li>
                <li><strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de votre compte et de vos données</li>
                <li><strong>Droit à la portabilité :</strong> Vous pouvez demander une copie de vos données au format JSON</li>
                <li><strong>Droit d'opposition :</strong> Vous pouvez vous opposer au traitement de vos données (sous réserve de motifs légitimes)</li>
                <li><strong>Droit à la limitation :</strong> Vous pouvez demander la limitation du traitement de vos données</li>
              </ul>
              <p>
                Pour exercer ces droits, vous pouvez :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Accéder à votre espace personnel pour consulter ou modifier vos données</li>
                <li>Demander l'export de vos données via l'API : <code className="bg-white/10 px-2 py-1 rounded">/api/rgpd/export-data</code></li>
                <li>Demander la suppression de votre compte via l'API : <code className="bg-white/10 px-2 py-1 rounded">/api/rgpd/delete-account</code></li>
                <li>Nous contacter par email à contactpadelxp@gmail.com</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Sécurité des données</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger
                vos données personnelles contre tout accès non autorisé, perte, destruction ou altération :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Chiffrement des connexions (HTTPS)</li>
                <li>Authentification sécurisée</li>
                <li>Stockage sécurisé des données</li>
                <li>Accès limité aux données aux seules personnes autorisées</li>
                <li>Sauvegarde régulière des données</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Transfert de données hors UE</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Vos données sont hébergées par des prestataires techniques (Vercel, Supabase) qui peuvent
                stocker vos données en dehors de l'Union Européenne. Ces transferts sont encadrés par des
                garanties appropriées (clauses contractuelles types, Privacy Shield, etc.) conformément
                au RGPD.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Cookies</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Nous utilisons des cookies pour le fonctionnement du service. Pour plus d'informations,
                consultez notre{" "}
                <Link href="/cookies" className="text-white underline hover:text-white/80">
                  Politique des Cookies
                </Link>
                {" "}et{" "}
                <Link href="/cookies/gestion" className="text-white underline hover:text-white/80">
                  gérez vos préférences de cookies
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Réclamations</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Si vous estimez que le traitement de vos données personnelles constitue une violation du RGPD,
                vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de
                l'Informatique et des Libertés (CNIL) :
              </p>
              <p>
                <strong>CNIL</strong><br />
                3 Place de Fontenoy - TSA 80715<br />
                75334 Paris Cedex 07<br />
                Téléphone : 01 53 73 22 22<br />
                Site web : www.cnil.fr
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Modifications</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment.
                Les modifications seront publiées sur cette page avec mention de la date de mise à jour.
              </p>
              <p>
                En cas de modification substantielle, nous vous informerons par email ou via une notification
                sur la plateforme.
              </p>
            </div>
          </section>

          <section>
            <p className="text-sm text-white/60 mt-12">
              Pour toute question relative à cette politique de confidentialité ou pour demander la suppression de vos données, vous pouvez nous contacter
              à contactpadelxp@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}



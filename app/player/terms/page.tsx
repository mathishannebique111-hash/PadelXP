import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - Joueurs - PadelXP",
  description: "Conditions générales d'utilisation de PadelXP pour les joueurs",
};

export default function PlayerTermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            ← Retour aux réglages
          </Link>
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Conditions Générales d'Utilisation - Joueurs</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <p className="text-sm text-white/60 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 1 - Objet et champ d'application</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation gratuite
                de la plateforme PadelXP en tant que joueur. PadelXP est une solution destinée aux
                complexes de padel pour gérer les leaderboards, classements et ligues.
              </p>
              <p>
                En accédant et en utilisant PadelXP comme joueur, vous acceptez sans réserve les
                présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le service.
              </p>
              <p>
                <strong>Important :</strong> L'utilisation de PadelXP en tant que joueur est entièrement
                <strong className="text-emerald-300"> gratuite</strong>. Aucun paiement ne vous sera demandé.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 2 - Description du service gratuit</h2>
            <div className="space-y-2 text-white/80">
              <p>
                En tant que joueur, PadelXP vous offre gratuitement l'accès aux fonctionnalités suivantes :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Consultation des classements et leaderboards de votre club</li>
                <li>Enregistrement de vos matchs de padel</li>
                <li>Suivi de vos statistiques de jeu (victoires, défaites, points, classement)</li>
                <li>Consultation et déblocage de badges</li>
                <li>Participation aux défis et compétitions organisés par votre club</li>
                <li>Consultation de l'historique de vos matchs</li>
                <li>Possibilité de laisser un avis sur votre club</li>
              </ul>
              <p>
                Le service est accessible via un navigateur web. Une connexion internet est nécessaire
                pour utiliser la plateforme.
              </p>
              <p className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4 mt-4">
                <strong className="text-emerald-300">✓ Service gratuit :</strong> Aucun abonnement,
                aucun paiement requis. Votre accès à la plateforme en tant que joueur est entièrement gratuit.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 3 - Inscription et compte</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Inscription gratuite :</strong> Pour utiliser PadelXP en tant que joueur, vous
                devez créer un compte gratuit en fournissant des informations exactes et à jour.
                L'inscription est entièrement gratuite et ne nécessite aucun paiement.
              </p>
              <p>
                <strong>Identifiants :</strong> Vous êtes responsable de la confidentialité de vos
                identifiants de connexion (email et mot de passe). Toute utilisation de votre compte
                est présumée effectuée par vous-même.
              </p>
              <p>
                <strong>Affiliation à un club :</strong> Pour utiliser la plateforme, vous devez être
                affilié à un club de padel utilisant PadelXP. Cette affiliation peut se faire via un
                code d'invitation fourni par votre club ou par l'administration du club.
              </p>
              <p>
                <strong>Suppression de compte :</strong> Vous pouvez supprimer votre compte à tout moment
                via votre espace personnel ou en nous contactant à contact@padelxp.com. La suppression
                de votre compte est irréversible et entraînera la suppression de vos données personnelles,
                conformément à notre{" "}
                <Link href="/player/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 4 - Obligations des joueurs</h2>
            <div className="space-y-2 text-white/80">
              <p>En utilisant PadelXP, vous vous engagez à :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Fournir des informations exactes, complètes et à jour lors de votre inscription</li>
                <li>Maintenir la confidentialité de vos identifiants</li>
                <li>Enregistrer uniquement des matchs réels et authentiques</li>
                <li>Respecter les autres joueurs et les règles du fair-play</li>
                <li>Ne pas perturber le fonctionnement du service</li>
                <li>Ne pas tenter de contourner les mesures de sécurité</li>
                <li>Ne pas utiliser le service à des fins illégales ou frauduleuses</li>
                <li>Ne pas diffuser de contenu illicite, diffamatoire, injurieux ou discriminatoire</li>
                <li>Ne pas usurper l'identité d'autrui</li>
                <li>Respecter la propriété intellectuelle</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 5 - Utilisation licite</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Vous vous engagez à utiliser PadelXP uniquement à des fins légales et conformes aux
                présentes CGU. Il est strictement interdit de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Enregistrer des matchs fictifs ou frauduleux</li>
                <li>Manipuler les scores ou les résultats pour fausser les classements</li>
                <li>Utiliser le service pour des activités illégales ou frauduleuses</li>
                <li>Tenter d'accéder de manière non autorisée aux systèmes ou données</li>
                <li>Transmettre des virus, codes malveillants ou tout autre élément nuisible</li>
                <li>Effectuer des actions visant à surcharger ou perturber le service</li>
                <li>Utiliser des robots, scripts automatisés ou outils de scraping</li>
                <li>Copier, modifier, reproduire ou distribuer le service sans autorisation</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 6 - Données et contenu</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Vos données :</strong> Vous conservez tous les droits sur les données que vous
                saisissez sur la plateforme (matchs, statistiques). Ces données sont visibles dans votre
                espace personnel et peuvent être consultées par les membres de votre club conformément
                aux règles de votre club.
              </p>
              <p>
                <strong>Licence d'utilisation :</strong> En saisissant des données sur PadelXP, vous
                accordez à PadelXP et à votre club une licence non exclusive, mondiale, gratuite et
                transférable pour utiliser, stocker, traiter et afficher ces données uniquement dans
                le cadre de la fourniture du service (gestion des classements, statistiques, etc.).
              </p>
              <p>
                <strong>Responsabilité du contenu :</strong> Vous êtes seul responsable du contenu que
                vous publiez sur la plateforme (matchs enregistrés, avis, etc.). PadelXP ne peut être
                tenu responsable du contenu publié par les joueurs.
              </p>
              <p>
                <strong>Modération :</strong> PadelXP et les administrateurs de votre club se réservent
                le droit de modérer, modifier ou supprimer tout contenu qui contreviendrait aux présentes
                CGU, sans préavis.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 7 - Propriété intellectuelle</h2>
            <div className="space-y-2 text-white/80">
              <p>
                La plateforme PadelXP, son design, son code source, ses logos, ses marques et tous les
                éléments qui la composent sont la propriété exclusive de PadelXP ou de ses partenaires.
              </p>
              <p>
                Vous disposez d'un droit d'utilisation personnelle, non exclusif et non transférable
                pour la durée de votre utilisation du service, uniquement dans le cadre de l'utilisation
                du service gratuit.
              </p>
              <p>
                Toute reproduction, modification, distribution ou exploitation commerciale du service,
                en tout ou partie, sans autorisation préalable écrite de PadelXP, est strictement interdite.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 8 - Disponibilité du service</h2>
            <div className="space-y-2 text-white/80">
              <p>
                PadelXP s'efforce d'assurer une disponibilité maximale du service. Toutefois, des
                interruptions peuvent survenir pour :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Maintenance programmée ou d'urgence</li>
                <li>Mises à jour du service</li>
                <li>Cas de force majeure</li>
                <li>Panne technique ou problème réseau</li>
              </ul>
              <p>
                PadelXP ne peut garantir une disponibilité à 100% et ne saurait être tenu responsable
                des dommages résultant d'une indisponibilité temporaire du service.
              </p>
              <p className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4 mt-4">
                <strong className="text-emerald-300">✓ Service gratuit :</strong> En raison de la
                gratuité du service pour les joueurs, notre responsabilité est limitée aux dommages directs
                et prévisibles résultant d'un manquement grave à nos obligations.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 9 - Protection des données personnelles</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Le traitement de vos données personnelles est conforme au Règlement Général sur la
                Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>
              <p>
                Pour plus d'informations sur le traitement de vos données en tant que joueur, consultez notre{" "}
                <Link href="/player/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité pour joueurs
                </Link>
                .
              </p>
              <p>
                Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et
                d'opposition sur vos données personnelles. Vous pouvez exercer ces droits via votre
                espace personnel ou en nous contactant à contact@padelxp.com.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 10 - Responsabilité</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Responsabilité de PadelXP :</strong> PadelXP s'efforce de fournir un service
                fiable et sécurisé. En raison de la gratuité du service pour les joueurs, notre
                responsabilité est limitée aux dommages directs et prévisibles résultant d'un manquement
                grave à nos obligations.
              </p>
              <p>
                PadelXP ne saurait être tenu responsable :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Des dommages indirects (perte de données, perte de temps, etc.)</li>
                <li>Des interruptions de service dues à des cas de force majeure</li>
                <li>Du contenu publié par les joueurs</li>
                <li>De l'utilisation non conforme du service par les joueurs</li>
                <li>Des problèmes liés à votre connexion internet ou votre équipement</li>
                <li>Des disputes entre joueurs concernant les résultats de matchs</li>
              </ul>
              <p>
                <strong>Responsabilité des joueurs :</strong> Vous êtes seul responsable de l'utilisation
                que vous faites du service et du contenu que vous publiez. Vous vous engagez à indemniser
                PadelXP contre toute réclamation résultant de votre utilisation non conforme du service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 11 - Résiliation</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Résiliation par le joueur :</strong> Vous pouvez supprimer votre compte à tout
                moment via votre espace personnel ou en nous contactant à contact@padelxp.com. La
                suppression de votre compte entraîne la suppression de vos données personnelles,
                conformément à notre Politique de Confidentialité.
              </p>
              <p>
                <strong>Résiliation par PadelXP :</strong> PadelXP se réserve le droit de suspendre
                ou résilier votre compte, sans préavis, en cas de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Violation des présentes CGU</li>
                <li>Utilisation frauduleuse ou illicite du service</li>
                <li>Enregistrement de matchs fictifs ou frauduleux</li>
                <li>Inactivité prolongée du compte</li>
                <li>Comportement contraire au fair-play</li>
              </ul>
              <p>
                En cas de résiliation, vos données seront conservées conformément aux obligations légales
                et à notre Politique de Confidentialité.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 12 - Modifications des CGU</h2>
            <div className="space-y-2 text-white/80">
              <p>
                PadelXP se réserve le droit de modifier les présentes CGU à tout moment. Les modifications
                seront publiées sur cette page avec mention de la date de mise à jour.
              </p>
              <p>
                En cas de modification substantielle, nous vous informerons par email ou via une
                notification sur la plateforme au moins 30 jours avant leur entrée en vigueur. Si vous
                n'acceptez pas les nouvelles conditions, vous pouvez supprimer votre compte avant
                l'entrée en vigueur des modifications.
              </p>
              <p>
                Votre utilisation continue du service après l'entrée en vigueur des modifications
                constitue une acceptation tacite des nouvelles conditions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 13 - Droit applicable et juridiction</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Les présentes CGU sont régies par le droit français.
              </p>
              <p>
                En cas de litige, et après tentative de résolution amiable, tout litige relatif à
                l'interprétation ou à l'exécution des présentes CGU sera soumis aux tribunaux français
                compétents.
              </p>
              <p>
                Conformément à l'article L.612-1 du Code de la consommation, vous avez la possibilité
                de saisir un médiateur de la consommation en cas de litige, dont les coordonnées vous
                seront communiquées sur demande.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 14 - Dispositions diverses</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Intégralité de l'accord :</strong> Les présentes CGU, ainsi que notre{" "}
                <Link href="/player/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité
                </Link>
                , constituent l'intégralité de l'accord entre vous et PadelXP concernant l'utilisation
                gratuite du service en tant que joueur.
              </p>
              <p>
                <strong>Nullité partielle :</strong> Si une clause des présentes CGU est déclarée nulle
                ou inapplicable par une juridiction compétente, les autres clauses restent en vigueur.
                La clause nulle sera remplacée par une clause valide se rapprochant le plus possible
                de l'intention initiale.
              </p>
              <p>
                <strong>Non-renonciation :</strong> Le fait pour PadelXP de ne pas se prévaloir à un
                moment donné d'une clause des présentes CGU ne constitue pas une renonciation à s'en
                prévaloir ultérieurement.
              </p>
              <p>
                <strong>Contact :</strong> Pour toute question relative aux présentes CGU, vous pouvez
                nous contacter à contact@padelxp.com.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}



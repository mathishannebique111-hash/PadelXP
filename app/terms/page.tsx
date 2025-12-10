import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/legal/BackButton";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - PadelXP",
  description: "Conditions générales d'utilisation de PadelXP",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <BackButton />
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Conditions Générales d'Utilisation</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <p className="text-sm text-white/60 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 1 - Objet et champ d'application</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la 
                plateforme PadelXP, une solution SaaS destinée à la gestion de leaderboards, classements 
                et ligues pour complexes de padel.
              </p>
              <p>
                En accédant et en utilisant PadelXP, vous acceptez sans réserve les présentes CGU. 
                Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le service.
              </p>
              <p>
                Les présentes CGU s'appliquent à tous les utilisateurs de la plateforme, qu'ils soient 
                administrateurs de club, membres ou joueurs.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 2 - Description du service</h2>
            <div className="space-y-2 text-white/80">
              <p>
                PadelXP est une plateforme web permettant aux complexes de padel de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Gérer les membres et joueurs de leur club</li>
                <li>Organiser des matchs et compétitions</li>
                <li>Établir des classements et leaderboards</li>
                <li>Créer et gérer des défis et récompenses</li>
                <li>Suivre les statistiques et performances</li>
                <li>Communiquer avec les membres</li>
              </ul>
              <p>
                Le service est accessible via un navigateur web. Une connexion internet est nécessaire 
                pour utiliser la plateforme.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 3 - Accès au service</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Inscription :</strong> Pour utiliser PadelXP, vous devez créer un compte en 
                fournissant des informations exactes et à jour. L'inscription est gratuite pour les 
                joueurs. Les clubs peuvent bénéficier d'une période d'essai gratuite de 30 jours.
              </p>
              <p>
                <strong>Identifiants :</strong> Vous êtes responsable de la confidentialité de vos 
                identifiants de connexion (email et mot de passe). Toute utilisation de votre compte 
                est présumée effectuée par vous-même.
              </p>
              <p>
                <strong>Accès administrateur :</strong> Les administrateurs de club ont accès à des 
                fonctionnalités supplémentaires et sont responsables de la gestion des membres et des 
                données de leur club.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 4 - Obligations des utilisateurs</h2>
            <div className="space-y-2 text-white/80">
              <p>En utilisant PadelXP, vous vous engagez à :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Fournir des informations exactes, complètes et à jour</li>
                <li>Maintenir la confidentialité de vos identifiants</li>
                <li>Utiliser le service conformément à sa destination</li>
                <li>Respecter les droits des autres utilisateurs</li>
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
                <li>Utiliser le service pour des activités illégales ou frauduleuses</li>
                <li>Tenter d'accéder de manière non autorisée aux systèmes ou données</li>
                <li>Transmettre des virus, codes malveillants ou tout autre élément nuisible</li>
                <li>Effectuer des actions visant à surcharger ou perturber le service</li>
                <li>Utiliser des robots, scripts automatisés ou outils de scraping</li>
                <li>Copier, modifier, reproduire ou distribuer le service sans autorisation</li>
                <li>Reverse engineer, décompiler ou désassembler le service</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 6 - Données et contenu</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Vos données :</strong> Vous conservez tous les droits sur les données que vous 
                saisissez sur la plateforme (matchs, membres, scores, etc.). Vous pouvez les exporter 
                à tout moment via votre espace client.
              </p>
              <p>
                <strong>Licence d'utilisation :</strong> En saisissant des données sur PadelXP, vous 
                accordez à PadelXP une licence non exclusive, mondiale, gratuite et transférable pour 
                utiliser, stocker, traiter et afficher ces données uniquement dans le cadre de la 
                fourniture du service.
              </p>
              <p>
                <strong>Responsabilité du contenu :</strong> Vous êtes seul responsable du contenu que 
                vous publiez sur la plateforme. PadelXP ne peut être tenu responsable du contenu 
                publié par les utilisateurs.
              </p>
              <p>
                <strong>Modération :</strong> PadelXP se réserve le droit de modérer, modifier ou 
                supprimer tout contenu qui contreviendrait aux présentes CGU, sans préavis.
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
                pour la durée de votre abonnement, uniquement dans le cadre de l'utilisation du service.
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
              <p>
                En cas d'interruption prolongée, PadelXP s'efforcera d'informer les utilisateurs dans 
                les meilleurs délais.
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
                Pour plus d'informations sur le traitement de vos données, consultez notre{" "}
                <Link href="/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité
                </Link>
                .
              </p>
              <p>
                Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et 
                d'opposition sur vos données personnelles. Vous pouvez exercer ces droits via votre 
                espace client ou en nous contactant à contact@padelxp.com.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 10 - Responsabilité</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Responsabilité de PadelXP :</strong> PadelXP s'efforce de fournir un service 
                fiable et sécurisé. Toutefois, notre responsabilité est limitée aux dommages directs 
                et prévisibles résultant d'un manquement à nos obligations.
              </p>
              <p>
                PadelXP ne saurait être tenu responsable :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Des dommages indirects (perte de données, perte de chiffre d'affaires, etc.)</li>
                <li>Des interruptions de service dues à des cas de force majeure</li>
                <li>Du contenu publié par les utilisateurs</li>
                <li>De l'utilisation non conforme du service par les utilisateurs</li>
                <li>Des problèmes liés à votre connexion internet ou votre équipement</li>
              </ul>
              <p>
                <strong>Responsabilité des utilisateurs :</strong> Vous êtes seul responsable de 
                l'utilisation que vous faites du service et du contenu que vous publiez. Vous vous 
                engagez à indemniser PadelXP contre toute réclamation résultant de votre utilisation 
                non conforme du service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 11 - Résiliation</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Résiliation par l'utilisateur :</strong> Vous pouvez supprimer votre compte 
                à tout moment via votre espace client ou en nous contactant à contact@padelxp.com. 
                La suppression de votre compte entraîne la suppression de vos données personnelles, 
                conformément à notre Politique de Confidentialité.
              </p>
              <p>
                <strong>Résiliation par PadelXP :</strong> PadelXP se réserve le droit de suspendre 
                ou résilier votre compte, sans préavis, en cas de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Violation des présentes CGU</li>
                <li>Utilisation frauduleuse ou illicite du service</li>
                <li>Non-paiement de votre abonnement (pour les clubs)</li>
                <li>Inactivité prolongée du compte</li>
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
                En cas de modification substantielle, nous vous informerons par email au moins 30 jours 
                avant leur entrée en vigueur. Si vous n'acceptez pas les nouvelles conditions, vous pouvez 
                résilier votre compte avant l'entrée en vigueur des modifications.
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
                <Link href="/cgv" className="text-white underline hover:text-white/80">
                  Conditions Générales de Vente
                </Link>
                {" "}et notre{" "}
                <Link href="/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité
                </Link>
                , constituent l'intégralité de l'accord entre vous et PadelXP concernant l'utilisation du service.
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



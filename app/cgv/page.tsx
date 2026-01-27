import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/legal/BackButton";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente - PadelXP",
  description: "Conditions générales de vente de PadelXP",
};

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <BackButton />
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Conditions Générales de Vente</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <p className="text-sm text-white/60 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 1 - Objet et champ d'application</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Les présentes Conditions Générales de Vente (CGV) régissent la vente d'abonnements
                au service PadelXP, une plateforme SaaS destinée à la gestion de leaderboards,
                classements et ligues pour complexes de padel.
              </p>
              <p>
                L'acceptation des présentes CGV est matérialisée par une case à cocher lors de
                la souscription de l'abonnement. En cas de modification des CGV, vous en serez
                informé par email au moins 1 mois avant leur entrée en vigueur.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 2 - Description du service</h2>
            <div className="space-y-2 text-white/80">
              <p>
                PadelXP propose une plateforme SaaS permettant de transformer l'expérience de vos joueurs
                grâce à des classements, des challenges et une gamification complète.
              </p>
              <p>
                L'abonnement au service est unique et sans engagement :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Abonnement Mensuel :</strong> 49 € TTC / mois</li>
              </ul>
              <p>
                Le nombre de joueurs utilisant la plateforme est illimité.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 3 - Tarifs et modalités de paiement</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Les prix sont indiqués en euros TTC (Toutes Taxes Comprises). La TVA applicable
                est de 20% en France.
              </p>
              <p>
                Le paiement s'effectue par carte bancaire via notre partenaire de paiement Stripe,
                certifié PCI-DSS niveau 1. Les données de carte bancaire ne sont jamais stockées
                sur nos serveurs.
              </p>
              <p>
                Le paiement est effectué au début de chaque période mensuelle.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 4 - Commande et conclusion du contrat</h2>
            <div className="space-y-2 text-white/80">
              <p>
                La commande est passée en ligne via notre site web. Vous devez cocher explicitement
                une case indiquant que vous acceptez les présentes CGV.
              </p>
              <p>
                Une confirmation de commande vous sera envoyée par email immédiatement après votre
                souscription, comprenant le numéro de commande, le récapitulatif de votre abonnement
                et les modalités de rétractation.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 5 - Abonnement et renouvellement</h2>
            <div className="space-y-2 text-white/80">
              <p>
                L'abonnement est conclu pour une durée de 1 mois et se renouvelle automatiquement
                par tacite reconduction pour la même durée, sauf résiliation de votre part ou de la nôtre.
              </p>
              <p>
                Vous serez informé par email avant chaque renouvellement automatique, indiquant la date
                de prélèvement et le montant.
              </p>
              <p>
                Le renouvellement est effectué automatiquement à la date d'échéance de votre abonnement.
                Si vous souhaitez éviter le renouvellement, vous devez résilier votre abonnement avant
                cette date.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 6 - Résiliation par le client</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Vous pouvez résilier votre abonnement à tout moment, sans préavis, gratuitement,</strong>
                via votre compte club dans la section "Abonnement et essai" ou par email à contactpadelxp@gmail.com.
              </p>
              <p>
                La résiliation prend effet à la date de renouvellement prévue. Vous conservez l'accès
                à la plateforme jusqu'à la fin de la période déjà payée. Aucun prélèvement supplémentaire
                ne sera effectué.
              </p>
              <p>
                La résiliation n'entraîne aucun remboursement de la période en cours, sauf dans le cadre
                du droit de rétractation (voir Article 7).
              </p>
              <p>
                Si vous avez résilié votre abonnement mais que la période payée n'est pas encore terminée,
                vous pouvez réactiver votre abonnement à tout moment via votre espace client.
                L'abonnement reprendra automatiquement au prochain cycle de facturation.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 7 - Droit de rétractation</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Conformément à l'article L.221-18 du Code de la consommation, vous disposez d'un
                droit de rétractation de 14 jours calendaires à compter de la conclusion du contrat
                (souscription de l'abonnement).
              </p>
              <p>
                <strong>Exception :</strong> Si vous avez expressément consenti et reconnu perdre
                votre droit de rétractation dès le début de l'exécution du service, et que le service
                a été entièrement exécuté, le droit de rétractation ne s'applique pas.
              </p>
              <p>
                Pour exercer votre droit de rétractation, vous devez nous notifier votre décision
                via le formulaire disponible sur notre site ou par email à contactpadelxp@gmail.com.
              </p>
              <p>
                En cas de rétractation, nous procéderons au remboursement de toutes les sommes reçues
                dans un délai de 14 jours, par le même moyen de paiement que celui utilisé pour la
                transaction initiale.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 8 - Obligations du client</h2>
            <div className="space-y-2 text-white/80">
              <p>Vous vous engagez à :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Fournir des informations exactes et à jour</li>
                <li>Maintenir la confidentialité de vos identifiants de connexion</li>
                <li>Utiliser le service conformément à sa destination</li>
                <li>Ne pas tenter de contourner les mesures de sécurité</li>
                <li>Respecter les droits de propriété intellectuelle</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 9 - Obligations de PadelXP</h2>
            <div className="space-y-2 text-white/80">
              <p>Nous nous engageons à :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Fournir le service avec une disponibilité maximale</li>
                <li>Assurer la sécurité et la confidentialité de vos données</li>
                <li>Vous informer de toute modification substantielle du service</li>
                <li>Assurer un support client réactif</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 10 - Propriété intellectuelle</h2>
            <div className="space-y-2 text-white/80">
              <p>
                La plateforme PadelXP, son design, son code source et tous les éléments qui la composent
                sont la propriété exclusive de PadelXP. Vous disposez d'un droit d'utilisation personnelle
                et non exclusive pour la durée de votre abonnement.
              </p>
              <p>
                Les données que vous saisissez sur la plateforme (matchs, membres, etc.) restent votre
                propriété. Vous pouvez les exporter à tout moment via votre espace client.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 11 - Responsabilité et garanties</h2>
            <div className="space-y-2 text-white/80">
              <p>
                PadelXP s'efforce d'assurer une disponibilité continue du service. Toutefois, des
                interruptions peuvent survenir pour maintenance ou en cas de force majeure.
              </p>
              <p>
                Notre responsabilité est limitée aux dommages directs et prévisibles. Nous ne saurions
                être tenus responsables de dommages indirects (perte de données, perte de chiffre
                d'affaires, etc.).
              </p>
              <p>
                Vous bénéficiez de la garantie légale de conformité (2 ans) et de la garantie des
                vices cachés, conformément au Code de la consommation.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 12 - Protection des données</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Le traitement de vos données personnelles est conforme au Règlement Général sur la
                Protection des Données (RGPD). Pour plus d'informations, consultez notre{" "}
                <Link href="/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 13 - Résolution des litiges</h2>
            <div className="space-y-2 text-white/80">
              <p>
                En cas de litige, nous vous invitons à nous contacter en priorité à contactpadelxp@gmail.com
                pour trouver une solution amiable.
              </p>
              <p>
                Conformément à l'article L.612-1 du Code de la consommation, vous avez la possibilité
                de saisir un médiateur de la consommation, dont les coordonnées vous seront communiquées
                sur demande.
              </p>
              <p>
                À défaut de résolution amiable, tout litige relatif à l'interprétation ou à l'exécution
                des présentes CGV sera soumis aux tribunaux français compétents.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Article 14 - Dispositions diverses</h2>
            <div className="space-y-2 text-white/80">
              <p>
                <strong>Droit applicable :</strong> Les présentes CGV sont régies par le droit français.
              </p>
              <p>
                <strong>Modification des CGV :</strong> Nous nous réservons le droit de modifier les
                présentes CGV à tout moment. Vous en serez informé par email au moins 1 mois avant
                leur entrée en vigueur. Vous disposez de la possibilité de résilier votre abonnement
                sans frais si vous n'acceptez pas les nouvelles conditions.
              </p>
              <p>
                <strong>Nullité partielle :</strong> Si une clause des présentes CGV est déclarée
                nulle ou inapplicable, les autres clauses restent en vigueur.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


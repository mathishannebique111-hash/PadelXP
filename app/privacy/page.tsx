import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/legal/BackButton";

export const metadata: Metadata = {
  title: "Politique de Confidentialité - PadelXP",
  description: "Politique de confidentialité et protection des données personnelles de PadelXP",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <BackButton />
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Politique de Confidentialité</h1>

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
                [Adresse complète]<br />
                Email : contact@padelxp.com<br />
                [Téléphone - À compléter]
              </p>
              <p>
                Pour toute question relative à la protection de vos données personnelles, vous pouvez 
                nous contacter à l'adresse email ci-dessus.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Données collectées</h2>
            <div className="space-y-2 text-white/80">
              <p>Nous collectons les données personnelles suivantes :</p>
              
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.1. Données d'identification</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Pour les clubs : nom du club, email, téléphone, adresse</li>
                <li>Pour les membres : nom, prénom, email (optionnel), photo de profil</li>
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

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.3. Données de paiement</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Les données de paiement sont gérées exclusivement par notre partenaire Stripe</li>
                <li>Nous ne stockons jamais les numéros de carte bancaire, CVV ou dates d'expiration</li>
                <li>Nous conservons uniquement les identifiants Stripe nécessaires à la gestion de votre abonnement</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">2.4. Données d'utilisation</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Historique des matchs</li>
                <li>Statistiques de jeu</li>
                <li>Préférences et paramètres du compte</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Fins du traitement</h2>
            <div className="space-y-2 text-white/80">
              <p>Vos données personnelles sont traitées pour les finalités suivantes :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Exécution du service :</strong> Gestion de votre compte, accès à la plateforme, gestion des abonnements</li>
                <li><strong>Facturation et paiement :</strong> Traitement des paiements, émission de factures</li>
                <li><strong>Support client :</strong> Réponse à vos demandes et assistance</li>
                <li><strong>Amélioration du service :</strong> Analyse statistique anonymisée pour améliorer nos fonctionnalités</li>
                <li><strong>Obligations légales :</strong> Conservation des données de facturation (10 ans), respect des obligations comptables</li>
              </ul>
              <p>
                <strong>Marketing :</strong> Nous n'utilisons vos données à des fins de marketing que si vous y avez consenti explicitement.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Base légale du traitement</h2>
            <div className="space-y-2 text-white/80">
              <p>Conformément au RGPD, le traitement de vos données repose sur les bases légales suivantes :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Exécution du contrat (Article 6.1.b RGPD) :</strong> Pour la gestion de votre compte et l'accès au service</li>
                <li><strong>Consentement (Article 6.1.a RGPD) :</strong> Pour les données des membres et les cookies marketing (si applicable)</li>
                <li><strong>Obligation légale (Article 6.1.c RGPD) :</strong> Pour la conservation des données de facturation</li>
                <li><strong>Intérêt légitime (Article 6.1.f RGPD) :</strong> Pour la sécurité du service et les statistiques anonymisées</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Destinataires des données</h2>
            <div className="space-y-2 text-white/80">
              <p>Vos données personnelles sont accessibles uniquement à :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Notre équipe autorisée (personnel technique et support client)</li>
                <li>Nos sous-traitants, dans le cadre strict de l'exécution du service :</li>
              </ul>
              
              <div className="ml-8 mt-2 space-y-2">
                <p>
                  <strong>Stripe (paiements) :</strong> États-Unis<br />
                  <span className="text-sm text-white/60">
                    Données : informations de paiement, identifiants d'abonnement<br />
                    Garanties : Standard Contractual Clauses (SCC) approuvées par la Commission européenne
                  </span>
                </p>
                <p>
                  <strong>Supabase (hébergement base de données) :</strong> Europe / États-Unis<br />
                  <span className="text-sm text-white/60">
                    Données : toutes les données de l'application<br />
                    Garanties : Vérifier contrat (SCC si transfert US)
                  </span>
                </p>
                <p>
                  <strong>Vercel (hébergement site web) :</strong> États-Unis<br />
                  <span className="text-sm text-white/60">
                    Données : données de navigation, logs<br />
                    Garanties : Standard Contractual Clauses
                  </span>
                </p>
                <p>
                  <strong>Resend (emails) :</strong> États-Unis<br />
                  <span className="text-sm text-white/60">
                    Données : adresses email pour l'envoi d'emails transactionnels<br />
                    Garanties : Standard Contractual Clauses
                  </span>
                </p>
              </div>

              <p className="mt-4">
                Nous ne vendons jamais vos données personnelles à des tiers. Elles ne sont communiquées 
                qu'aux seules personnes et entités mentionnées ci-dessus, dans le cadre strict de 
                l'exécution du service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Transferts hors Union Européenne</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Certains de nos sous-traitants sont situés en dehors de l'Union Européenne (notamment 
                aux États-Unis). Ces transferts sont encadrés par des garanties appropriées :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Standard Contractual Clauses (SCC) approuvées par la Commission européenne</li>
                <li>Certifications de conformité (Privacy Shield invalide depuis 2020, remplacé par SCC)</li>
              </ul>
              <p>
                Vous pouvez obtenir une copie de ces garanties en nous contactant à contact@padelxp.com.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Durée de conservation</h2>
            <div className="space-y-2 text-white/80">
              <p>Vos données sont conservées pendant les durées suivantes :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Données de compte :</strong> Durée de l'abonnement + 3 ans après résiliation (prescription civile)</li>
                <li><strong>Données de facturation :</strong> 10 ans (obligation comptable et fiscale)</li>
                <li><strong>Données de connexion et logs :</strong> 12 mois maximum</li>
                <li><strong>Données de paiement (Stripe) :</strong> 13 mois selon les obligations Stripe / DSP2</li>
              </ul>
              <p>
                À l'expiration de ces durées, vos données sont supprimées définitivement ou anonymisées 
                de manière irréversible (pour les données statistiques).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Vos droits (RGPD)</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez 
                des droits suivants :
              </p>
              
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.1. Droit d'accès (Article 15 RGPD)</h3>
              <p>
                Vous pouvez obtenir une copie de toutes les données personnelles que nous détenons sur vous.
              </p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.2. Droit de rectification (Article 16 RGPD)</h3>
              <p>
                Vous pouvez corriger ou compléter vos données personnelles inexactes ou incomplètes.
              </p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.3. Droit à l'effacement (Article 17 RGPD) - "Droit à l'oubli"</h3>
              <p>
                Vous pouvez demander la suppression de vos données personnelles, sous réserve des 
                obligations légales de conservation (notamment les données de facturation).
              </p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.4. Droit à la limitation du traitement (Article 18 RGPD)</h3>
              <p>
                Vous pouvez demander la limitation du traitement de vos données dans certains cas.
              </p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.5. Droit à la portabilité (Article 20 RGPD)</h3>
              <p>
                Vous pouvez récupérer vos données dans un format structuré et couramment utilisé 
                (JSON ou CSV).
              </p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.6. Droit d'opposition (Article 21 RGPD)</h3>
              <p>
                Vous pouvez vous opposer au traitement de vos données pour des motifs légitimes, 
                notamment pour le marketing.
              </p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.7. Droit de retirer son consentement</h3>
              <p>
                Si le traitement repose sur votre consentement, vous pouvez le retirer à tout moment.
              </p>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">8.8. Comment exercer vos droits</h3>
              <p>
                Pour exercer l'un de ces droits, vous pouvez :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Nous contacter par email à : contact@padelxp.com</li>
                <li>Utiliser les fonctionnalités disponibles dans votre espace client (export de données, modification du profil)</li>
              </ul>
              <p>
                Nous nous engageons à répondre à votre demande dans un délai maximum d'<strong>1 mois</strong> 
                (délai pouvant être porté à 2 mois en cas de demande complexe). Nous pouvons être amenés 
                à vous demander une pièce d'identité pour vérifier votre identité.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Sécurité des données</h2>
            <div className="space-y-2 text-white/80">
              <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Chiffrement :</strong> HTTPS/TLS pour toutes les communications</li>
                <li><strong>Authentification :</strong> Authentification forte pour les comptes administrateurs</li>
                <li><strong>Stockage sécurisé :</strong> Chiffrement au repos des données sensibles</li>
                <li><strong>Accès limité :</strong> Accès aux données réservé au personnel autorisé uniquement</li>
                <li><strong>Sauvegarde :</strong> Sauvegardes régulières pour prévenir la perte de données</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Cookies et traceurs</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Notre site utilise des cookies et traceurs. Pour plus d'informations sur les cookies 
                utilisés et la gestion de vos préférences, consultez notre{" "}
                <Link href="/cookies" className="text-white underline hover:text-white/80">
                  Politique des Cookies
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Réclamation auprès de la CNIL</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Si vous estimez que le traitement de vos données personnelles constitue une violation 
                du RGPD, vous avez le droit d'introduire une réclamation auprès de la CNIL (Commission 
                Nationale de l'Informatique et des Libertés) :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Site web :</strong> cnil.fr</li>
                <li><strong>Adresse postale :</strong> CNIL, 3 Place de Fontenoy - TSA 80715, 75334 Paris Cedex 07</li>
                <li><strong>Téléphone :</strong> 01 53 73 22 22</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Modifications de cette politique</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
                Toute modification substantielle vous sera communiquée par email ou via une notification 
                sur notre site.
              </p>
              <p>
                La date de dernière mise à jour est indiquée en haut de cette page.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Pour toute question relative à cette politique de confidentialité ou au traitement 
                de vos données personnelles, vous pouvez nous contacter à :
              </p>
              <p>
                <strong>Email :</strong> contact@padelxp.com<br />
                <strong>Adresse :</strong> [À compléter]
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


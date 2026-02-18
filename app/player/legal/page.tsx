import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions Légales - PadelXP",
  description: "Mentions légales de PadelXP pour les joueurs",
};

export default function PlayerLegalPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            ← Retour aux réglages
          </Link>
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Mentions Légales</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Identité de l'entreprise</h2>
            <div className="space-y-2 text-white/80">
              <p><strong>Dénomination sociale :</strong> Mathis Hannebique</p>
              <p><strong>Forme juridique :</strong> Entrepreneur individuel</p>
              <p><strong>Numéro SIRET :</strong> 10126623700011</p>
              <p><strong>Numéro SIREN :</strong> 101266237</p>
              <p><strong>Code APE :</strong> 63.12Z</p>
              <p><strong>Date d'immatriculation au RNE :</strong> 16/02/2026</p>
              <p><strong>Ville du greffe :</strong> Bastia (2B)</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Coordonnées</h2>
            <div className="space-y-2 text-white/80">
              <p><strong>Adresse du siège social :</strong> 6 rue Pino, 20200 Bastia, France</p>
              <p><strong>Email :</strong> contactpadelxp@gmail.com</p>
              <p><strong>Directeur de publication :</strong> Mathis Hannebique</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Hébergement</h2>
            <div className="space-y-2 text-white/80">
              <p><strong>Hébergeur du site :</strong></p>
              <p>Vercel Inc.</p>
              <p>340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
              <p>Site web : vercel.com</p>
              <p className="mt-4">Supabase Inc.</p>
              <p>970 Toa Payoh North #07-04, Singapore 318992</p>
              <p>Site web : supabase.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Conditions d'utilisation du service</h2>
            <div className="space-y-2 text-white/80">
              <p>
                L'utilisation de PadelXP en tant que joueur est <strong>gratuite</strong> et régie par nos{" "}
                <Link href="/player/terms" className="text-white underline hover:text-white/80">
                  Conditions Générales d'Utilisation
                </Link>
                {" "}pour joueurs.
              </p>
              <p>
                Le service vous permet de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Consulter les classements et leaderboards de votre club</li>
                <li>Enregistrer vos matchs et suivre vos statistiques</li>
                <li>Consulter et débloquer des badges</li>
                <li>Participer aux défis et compétitions organisés par votre club</li>
                <li>Laisser des avis sur votre club</li>
              </ul>
              <p>
                Le service est fourni "en l'état" et nous nous efforçons d'assurer une disponibilité
                maximale. Toutefois, des interruptions de service peuvent survenir pour maintenance
                ou en cas de force majeure.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Propriété intellectuelle</h2>
            <div className="space-y-2 text-white/80">
              <p>
                L'ensemble du contenu de ce site (textes, images, logos, design) est la propriété
                exclusive de PadelXP, sauf mention contraire. Toute reproduction ou utilisation sans
                autorisation préalable est interdite.
              </p>
              <p>
                Les données que vous saisissez sur la plateforme (matchs, statistiques) restent votre
                propriété. Vous pouvez les consulter à tout moment via votre espace personnel.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Protection des données</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Les données personnelles collectées sur ce site sont traitées conformément au
                Règlement Général sur la Protection des Données (RGPD). Pour plus d'informations,
                consultez notre{" "}
                <Link href="/player/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité pour joueurs
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Réclamations et litiges</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Pour toute réclamation ou litige, vous pouvez nous contacter à l'adresse email
                indiquée ci-dessus ou vous adresser à un médiateur de la consommation.
              </p>
              <p>
                Le droit applicable est le droit français. Les tribunaux français sont compétents
                pour connaître de tout litige relatif à l'utilisation du site.
              </p>
            </div>
          </section>

          <section>
            <p className="text-sm text-white/60 mt-12">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}



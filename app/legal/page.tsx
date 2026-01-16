import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/legal/BackButton";

export const metadata: Metadata = {
  title: "Mentions Légales - PadelXP",
  description: "Mentions légales de PadelXP",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <BackButton />
        </div>

        <h1 className="text-4xl font-extrabold mb-8">Mentions Légales</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Identité de l'éditeur</h2>
            <div className="space-y-2 text-white/80">
              <p><strong>Nom :</strong> Mathis Hannebique</p>
              <p><strong>Statut :</strong> En cours d'immatriculation (micro-entreprise)</p>
              <p><strong>Directeur de publication :</strong> Mathis Hannebique</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Coordonnées</h2>
            <div className="space-y-2 text-white/80">
              <p><strong>Adresse :</strong> 6 rue Pino, 20200 Bastia, France</p>
              <p><strong>Email :</strong> contactpadelxp@gmail.com</p>
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
                L'utilisation du service PadelXP est régie par nos{" "}
                <Link href="/cgv" className="text-white underline hover:text-white/80">
                  Conditions Générales de Vente
                </Link>
                {" "}et nos{" "}
                <Link href="/terms" className="text-white underline hover:text-white/80">
                  Conditions Générales d'Utilisation
                </Link>
                .
              </p>
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
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Protection des données</h2>
            <div className="space-y-2 text-white/80">
              <p>
                Les données personnelles collectées sur ce site sont traitées conformément au
                Règlement Général sur la Protection des Données (RGPD). Pour plus d'informations,
                consultez notre{" "}
                <Link href="/privacy" className="text-white underline hover:text-white/80">
                  Politique de Confidentialité
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


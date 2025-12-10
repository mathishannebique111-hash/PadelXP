import type { Metadata } from "next";
import BackButton from "@/components/legal/BackButton";

export const metadata: Metadata = {
  title: "DPA / RGPD - PadelXP",
  description: "Accord de Traitement des Données et Conformité RGPD de PadelXP",
};

export default function DPAPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-8">
          <BackButton />
        </div>

        <h1 className="text-4xl font-extrabold mb-8">DPA / RGPD — Document de Conformité</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-white/80">
          <p className="text-sm text-white/60 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Responsable de traitement & sous-traitants</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.1. Responsable de traitement</h3>
            <div className="space-y-2 text-white/80">
              <p>Le responsable du traitement des données personnelles est l'éditeur du service SaaS PadelXP.</p>
              <p>
                <strong>Raison sociale :</strong> [Raison sociale à compléter]<br />
                <strong>Siège social :</strong> [Adresse complète à compléter]<br />
                <strong>Email de contact :</strong> contact@padelxp.com<br />
                <strong>Email de contact RGPD/DPO :</strong> [Email du DPO à compléter - si DPO désigné, sinon utiliser contact@padelxp.com]<br />
                <strong>Téléphone :</strong> [Téléphone à compléter]
              </p>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.2. Sous-traitants techniques</h3>
            <div className="space-y-4 text-white/80">
              <p>Les sous-traitants suivants sont utilisés pour l'exécution du service :</p>
              
              <div className="space-y-3">
                <p>
                  <strong>Supabase Inc.</strong> (Europe / États-Unis)<br />
                  <span className="text-sm text-white/60">Rôle :</span> Hébergement de la base de données PostgreSQL, authentification des utilisateurs, stockage de fichiers, gestion des sessions.<br />
                  <span className="text-sm text-white/60">Données traitées :</span> Toutes les données de l'application (profils, clubs, matchs, abonnements, etc.).<br />
                  <span className="text-sm text-white/60">Garanties :</span> DPA disponible sur <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-white/80">https://supabase.com/legal/dpa</a> - Standard Contractual Clauses (SCC) pour les transferts hors UE.
                </p>

                <p>
                  <strong>Vercel Inc.</strong> (États-Unis)<br />
                  <span className="text-sm text-white/60">Rôle :</span> Hébergement de l'application web (frontend et API routes), CDN, logs de navigation.<br />
                  <span className="text-sm text-white/60">Données traitées :</span> Données de navigation, adresses IP, logs d'accès, headers HTTP.<br />
                  <span className="text-sm text-white/60">Garanties :</span> DPA disponible sur <a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-white/80">https://vercel.com/legal/dpa</a> - Standard Contractual Clauses (SCC) pour les transferts hors UE.
                </p>

                <p>
                  <strong>Stripe, Inc.</strong> (États-Unis)<br />
                  <span className="text-sm text-white/60">Rôle :</span> Traitement des paiements par carte bancaire, gestion des abonnements récurrents.<br />
                  <span className="text-sm text-white/60">Données traitées :</span> Informations de paiement (gérées exclusivement par Stripe), identifiants d'abonnement, dates de facturation.<br />
                  <span className="text-sm text-white/60">Garanties :</span> DPA disponible sur <a href="https://stripe.com/fr/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-white/80">https://stripe.com/fr/legal/dpa</a> - Standard Contractual Clauses (SCC) pour les transferts hors UE, certification PCI-DSS niveau 1.
                </p>

                <p>
                  <strong>Resend, Inc.</strong> (États-Unis)<br />
                  <span className="text-sm text-white/60">Rôle :</span> Envoi d'emails transactionnels (confirmations de matchs, notifications, etc.).<br />
                  <span className="text-sm text-white/60">Données traitées :</span> Adresses email des destinataires, contenu des emails transactionnels.<br />
                  <span className="text-sm text-white/60">Garanties :</span> DPA disponible sur <a href="https://resend.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-white/80">https://resend.com/legal/dpa</a> - Standard Contractual Clauses (SCC) pour les transferts hors UE.
                </p>

                <p>
                  <strong>Upstash / Redis</strong> (localisation à vérifier selon la région configurée)<br />
                  <span className="text-sm text-white/60">Rôle :</span> Rate limiting et gestion des quotas de requêtes pour la sécurité de l'API.<br />
                  <span className="text-sm text-white/60">Données traitées :</span> Adresses IP, identifiants utilisateurs (pour le rate limiting par utilisateur), timestamps de requêtes.<br />
                  <span className="text-sm text-white/60">Garanties :</span> DPA disponible sur <a href="https://upstash.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-white/80">https://upstash.com/legal/dpa</a> - Standard Contractual Clauses (SCC) si transfert hors UE.
                </p>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm font-semibold text-white mb-2">Base juridique des transferts hors UE :</p>
                <p className="text-sm text-white/80">
                  Les transferts de données personnelles vers les États-Unis et autres pays hors Union Européenne sont encadrés par les Clauses Contractuelles Types (Standard Contractual Clauses - SCC) approuvées par la Commission européenne, conformément à la décision d'exécution 2021/914/UE du 4 juin 2021. Ces clauses garantissent un niveau de protection adéquat des données personnelles transférées.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Données personnelles et finalités</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.1. Catégories de personnes concernées</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li><strong>Clubs / Responsables de clubs</strong> : Administrateurs de complexes de padel qui souscrivent à un abonnement pour gérer leur club et leurs membres.</li>
              <li><strong>Joueurs / Utilisateurs finaux</strong> : Membres des clubs qui utilisent la plateforme pour enregistrer des matchs, consulter les classements et participer aux tournois.</li>
              <li><strong>Administrateurs internes</strong> : Personnel technique autorisé ayant accès à la production pour la maintenance et le support (accès limité via `SUPABASE_SERVICE_ROLE_KEY`).</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.2. Types de données collectées</h3>
            <div className="space-y-3 text-white/80">
              <p><strong>Données d'identification :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Pour les clubs : nom du club, slug, code d'invitation, email, téléphone (si fourni), adresse (ville, code postal), logo (optionnel).</li>
                <li>Pour les joueurs : nom, prénom, email (optionnel pour les joueurs invités), photo de profil (avatar_url), pseudonyme (display_name).</li>
              </ul>

              <p className="mt-4"><strong>Données de compte :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Identifiants de connexion : email, mot de passe (hashé via Supabase Auth, jamais stocké en clair).</li>
                <li>Identifiants techniques : UUID utilisateur, tokens de session JWT gérés par Supabase.</li>
                <li>Métadonnées de compte : date de création, date de dernière mise à jour, statut du compte.</li>
              </ul>

              <p className="mt-4"><strong>Données sportives :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Historique des matchs : participants (user_id, guest_player_id), scores, dates, statut (pending/confirmed/rejected).</li>
                <li>Statistiques de jeu : points, classement, nombre de matchs joués, victoires, défaites, série de victoires (win_streak).</li>
                <li>Participations aux tournois : inscriptions, résultats, classements finaux.</li>
                <li>Confirmations de matchs : tokens de confirmation, dates de confirmation.</li>
              </ul>

              <p className="mt-4"><strong>Données d'abonnement et facturation :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Plan choisi (mensuel, trimestriel, annuel), statut de l'abonnement, dates de début et de fin d'essai, dates de facturation.</li>
                <li>Identifiants Stripe : `stripe_subscription_id`, `stripe_customer_id` (stockés dans la base de données pour la gestion des abonnements).</li>
                <li>Note : Les données de paiement sensibles (numéros de carte, CVV) sont gérées exclusivement par Stripe et ne sont jamais stockées dans notre base de données.</li>
              </ul>

              <p className="mt-4"><strong>Données de connexion et logs techniques :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Adresses IP (collectées via le middleware Next.js et les logs Vercel).</li>
                <li>User-agents, headers HTTP (pour la sécurité et le rate limiting).</li>
                <li>Logs d'erreur et d'activité (via le système de logging Pino, avec redaction automatique des données sensibles).</li>
                <li>Cookies de session : `session_id`, `csrf_token`, `cookie_consent` (voir politique des cookies).</li>
              </ul>

              <p className="mt-4"><strong>Données de contenu utilisateur :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Avis et notes : commentaires laissés par les joueurs, notes de satisfaction (table `reviews`).</li>
                <li>Challenges et récompenses : participations aux défis, badges obtenus.</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.3. Finalités</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li><strong>Gestion des comptes clubs et joueurs</strong> : Création et authentification des comptes, gestion des profils, attribution des rôles (admin de club, joueur).</li>
              <li><strong>Organisation et gestion des matchs</strong> : Enregistrement des matchs, calcul automatique des classements et statistiques, système de confirmation par email.</li>
              <li><strong>Gestion des tournois</strong> : Création de tournois, inscriptions des joueurs, génération automatique des tableaux, suivi des résultats.</li>
              <li><strong>Facturation et abonnement</strong> : Gestion des périodes d'essai, activation des abonnements, traitement des paiements via Stripe, émission de factures.</li>
              <li><strong>Sécurité du service</strong> : Rate limiting pour prévenir les abus, détection des tentatives d'intrusion, logs d'audit, protection CSRF/XSS.</li>
              <li><strong>Support client</strong> : Réponse aux demandes d'assistance, résolution des problèmes techniques.</li>
              <li><strong>Amélioration du service</strong> : Analyse statistique anonymisée pour améliorer les fonctionnalités (sans identification des utilisateurs).</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.4. Base légale des traitements</h3>
            <div className="space-y-2 text-white/80">
              <p>Conformément au RGPD, le traitement des données personnelles repose sur les bases légales suivantes :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Exécution du contrat (Article 6.1.b RGPD)</strong> : Pour les clubs, le traitement est nécessaire à l'exécution du contrat d'abonnement (gestion du compte, accès au service, facturation). Pour les joueurs, le traitement est nécessaire à l'utilisation de la plateforme (enregistrement de matchs, consultation des classements).</li>
                <li><strong>Intérêt légitime (Article 6.1.f RGPD)</strong> : Pour la sécurité du service (logs, rate limiting, détection d'abus), l'amélioration du service (statistiques anonymisées), et la gestion des données sportives nécessaires au fonctionnement de la plateforme (classements, historique des matchs).</li>
                <li><strong>Obligation légale (Article 6.1.c RGPD)</strong> : Pour la conservation des données de facturation pendant 10 ans (obligation comptable et fiscale française), et le respect des obligations de sécurité et de traçabilité.</li>
                <li><strong>Consentement (Article 6.1.a RGPD)</strong> : Pour les données optionnelles (photo de profil, email pour les joueurs invités) et, le cas échéant, pour les communications marketing (si applicable).</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Mesures techniques de sécurité</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.1. Contrôle d'accès & authentification</h3>
            <div className="space-y-3 text-white/80">
              <p><strong>Authentification :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Système d'authentification géré par Supabase Auth (basé sur PostgreSQL et JWT).</li>
                <li>Mots de passe hashés avec des algorithmes sécurisés (gérés par Supabase, jamais stockés en clair).</li>
                <li>Sessions JWT avec expiration automatique (1 heure par défaut, renouvellement automatique).</li>
                <li>Gestion des cookies de session avec flags `httpOnly`, `secure` (en production), `sameSite: "lax"` pour la protection CSRF.</li>
                <li>Détection d'inactivité : déconnexion automatique après 29 minutes d'inactivité (gérée via cookie `last_activity`).</li>
              </ul>

              <p className="mt-4"><strong>Contrôles d'accès applicatifs :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Vérification systématique de l'authentification dans le middleware Next.js pour toutes les routes protégées.</li>
                <li>Vérification des permissions dans les API routes : chaque route API vérifie que l'utilisateur est authentifié et autorisé avant d'exécuter l'opération.</li>
                <li>Vérification des appartenances : les utilisateurs ne peuvent accéder qu'aux données de leur club (vérification `club_id` dans les requêtes).</li>
                <li>Utilisation d'un client admin uniquement pour les opérations nécessitant un bypass des politiques RLS (création de profils ghost, opérations système).</li>
              </ul>

              <p className="mt-4"><strong>Row Level Security (RLS) :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>RLS activée sur toutes les tables contenant des données personnelles.</li>
                <li>Exemples de politiques RLS : Les utilisateurs peuvent lire leur propre profil et les profils des membres de leur club ; seuls les utilisateurs authentifiés peuvent créer/modifier/supprimer leurs propres avis ; les utilisateurs peuvent voir leurs propres confirmations de matchs.</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.2. Chiffrement & transport</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li><strong>HTTPS/TLS</strong> : Toutes les communications entre le client et le serveur sont chiffrées via HTTPS (géré automatiquement par Vercel en production).</li>
              <li><strong>Chiffrement des mots de passe</strong> : Géré par Supabase Auth avec des algorithmes de hachage sécurisés (bcrypt ou équivalent).</li>
              <li><strong>Chiffrement au repos</strong> : Les données stockées dans Supabase sont chiffrées au repos selon les mécanismes fournis par Supabase (chiffrement des disques, sauvegardes chiffrées).</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.3. Sauvegardes, résilience, disponibilité</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li><strong>Sauvegardes automatiques</strong> : Supabase effectue des sauvegardes automatiques quotidiennes de la base de données, conservées pendant 7 jours. Des sauvegardes ponctuelles (point-in-time recovery) sont également disponibles selon le plan d'abonnement Supabase. Les sauvegardes sont chiffrées et stockées de manière sécurisée.</li>
              <li><strong>Haute disponibilité</strong> : L'hébergement Vercel et Supabase fournissent une haute disponibilité avec réplication des données et basculement automatique en cas de panne.</li>
              <li><strong>Reprise après sinistre</strong> : Les mécanismes de reprise sont gérés par les prestataires (Supabase pour la base de données avec point-in-time recovery, Vercel pour l'application avec déploiements automatiques).</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.4. Journalisation & traçabilité</h3>
            <div className="space-y-3 text-white/80">
              <p><strong>Système de logging :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Utilisation de la bibliothèque Pino pour les logs structurés en production.</li>
                <li>Redaction automatique des données sensibles : Le logger Pino est configuré pour redacter automatiquement les champs suivants : `password`, `token`, `email`, `phone`, `user_id`, `userId`, `req.headers.authorization`, `req.headers.cookie`.</li>
              </ul>

              <p className="mt-4"><strong>Événements loggés :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Erreurs serveur : Toutes les erreurs sont loggées avec un contexte (route, utilisateur anonymisé, message d'erreur).</li>
                <li>Requêtes API sensibles : Les opérations RGPD (export, suppression de compte) sont loggées avec un identifiant utilisateur tronqué (8 premiers caractères + "…").</li>
                <li>Authentification : Les tentatives de connexion échouées sont loggées (via le middleware de rate limiting).</li>
                <li>Opérations critiques : Les mises à jour d'abonnements, extensions d'essai, créations de matchs sont loggées pour la traçabilité.</li>
              </ul>

              <p className="mt-4"><strong>Rate limiting :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Rate limiting général : 1000 requêtes par 15 minutes par IP (via Upstash/Redis).</li>
                <li>Rate limiting pour les connexions : 5 tentatives par 15 minutes par IP.</li>
                <li>Rate limiting pour les soumissions de matchs : 5 matchs par 5 minutes par utilisateur (identifié par `user_id` ou IP).</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.5. Sécurité applicative</h3>
            <div className="space-y-3 text-white/80">
              <p><strong>Validation des entrées :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Utilisation de Zod pour la validation stricte des schémas de données dans les API routes.</li>
                <li>Validation côté serveur : Toutes les données sont validées dans les API routes avant insertion en base de données.</li>
              </ul>

              <p className="mt-4"><strong>Protection contre les injections :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Utilisation de requêtes paramétrées via le client Supabase (protection automatique contre les injections SQL).</li>
                <li>Pas d'utilisation de requêtes SQL brutes avec concaténation de chaînes utilisateur.</li>
              </ul>

              <p className="mt-4"><strong>Protection CSRF/XSS :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Cookies de session avec flag `sameSite: "lax"` pour la protection CSRF.</li>
                <li>Headers de sécurité : Gérés par Next.js et Vercel (CSP, X-Frame-Options, etc.).</li>
                <li>Sanitization : Utilisation de `isomorphic-dompurify` pour la sanitization du contenu HTML si nécessaire.</li>
              </ul>

              <p className="mt-4"><strong>Gestion des secrets :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Tous les secrets sont stockés dans des variables d'environnement (`.env.local` en développement, variables d'environnement Vercel en production).</li>
                <li>Aucune clé API, token ou mot de passe n'est hardcodé dans le code source.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Mesures organisationnelles</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.1. Gestion des accès internes</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li>Accès à la production limité aux personnes autorisées (développeurs et administrateurs techniques).</li>
              <li>Accès à la base de données : Via `SUPABASE_SERVICE_ROLE_KEY` uniquement, stocké de manière sécurisée dans les variables d'environnement.</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.2. Procédure de gestion des incidents</h3>
            <p className="text-white/80">
              Toute violation de données ferait l'objet d'une analyse immédiate et, le cas échéant, d'une notification à la CNIL (dans les 72 heures conformément à l'article 33 RGPD) et aux personnes concernées (conformément à l'article 34 RGPD).
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.3. Encadrement des sous-traitants</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li>Les relations avec les sous-traitants (Supabase, Vercel, Stripe, Resend, Upstash) sont encadrées par des "Data Processing Agreements" (DPA) conformes au RGPD. Les DPA sont disponibles sur les sites web de chaque prestataire (liens fournis dans la section 1.2).</li>
              <li>Les transferts de données hors UE sont encadrés par les Clauses Contractuelles Types (SCC) approuvées par la Commission européenne.</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.4. Audits et revues de sécurité</h3>
            <div className="space-y-2 text-white/80">
              <p>Des audits réguliers et des revues de sécurité sont prévus pour évaluer l'efficacité des mesures techniques et organisationnelles mises en place. Ces audits incluent notamment :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Revues de code pour identifier les vulnérabilités potentielles.</li>
                <li>Tests de sécurité des API et des mécanismes d'authentification.</li>
                <li>Évaluation de la conformité des sous-traitants aux exigences RGPD.</li>
                <li>Vérification de l'efficacité des mesures de logging et de traçabilité.</li>
              </ul>
              <p className="mt-3"><strong>Fréquence des audits</strong> : Au moins une fois par an et après tout incident majeur de sécurité. Des revues ponctuelles peuvent également être effectuées lors de changements majeurs de l'infrastructure ou de l'application.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Conservation des données</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">5.1. Comptes & données métiers</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li><strong>Comptes clubs/joueurs</strong> : Conservés tant que le compte est actif. Après résiliation ou inactivité prolongée, suppression ou anonymisation après 3 ans d'inactivité (conformément à la prescription civile de 3 ans pour les actions en responsabilité contractuelle).</li>
              <li><strong>Données de tournois (résultats, historique sportif)</strong> : Conservation longue à des fins historiques et statistiques, avec possibilité de suppression sur demande de l'utilisateur (sous réserve des obligations légales de conservation des données de facturation).</li>
              <li><strong>Données de matchs</strong> : Conservées pour le calcul des classements et statistiques. Possibilité de suppression/anonymisation sur demande, sauf si nécessaires pour l'intégrité des données historiques du club.</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">5.2. Journaux & logs</h3>
            <ul className="list-disc list-inside ml-4 space-y-1 text-white/80">
              <li><strong>Logs d'erreur et d'activité</strong> : Conservation de 12 mois maximum, avec redaction automatique des données sensibles. Cette durée est conforme aux recommandations CNIL pour les logs de sécurité.</li>
              <li><strong>Logs de connexion</strong> : Conservation de 12 mois maximum, conformément aux recommandations CNIL et à la politique de confidentialité.</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">5.3. Sauvegardes</h3>
            <p className="text-white/80">
              Les sauvegardes quotidiennes de Supabase sont conservées pendant 7 jours. Des sauvegardes ponctuelles (point-in-time recovery) peuvent être conservées plus longtemps selon le plan d'abonnement. Les sauvegardes sont automatiquement supprimées après expiration de leur période de rétention.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Analyse d'impact et conformité</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.1. Analyse d'impact relative à la protection des données (AIPD/DPIA)</h3>
            <div className="space-y-2 text-white/80">
              <p>Une analyse d'impact relative à la protection des données (AIPD/DPIA) a été réalisée pour évaluer les risques liés au traitement des données personnelles, notamment concernant :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Le volume de données traitées (clubs, joueurs, matchs, abonnements).</li>
                <li>Les transferts de données hors UE (vers les États-Unis via les sous-traitants).</li>
                <li>Les traitements automatisés (calcul des classements, gestion des abonnements).</li>
              </ul>
              <p className="mt-3"><strong>Référence de l'AIPD/DPIA</strong> : AIPD en cours de rédaction – à finaliser avant mise en production générale. [Date de finalisation prévue et version à compléter]</p>
              <p>Si le service traite un volume très important de données personnelles ou vise particulièrement des mineurs, une AIPD/DPIA approfondie sera réalisée conformément aux recommandations de la CNIL.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Droits des personnes & contacts</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">7.1. Droits RGPD</h3>
            <div className="space-y-3 text-white/80">
              <p>Conformément au Règlement Général sur la Protection des Données (RGPD), les utilisateurs disposent des droits suivants :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Droit d'accès (Article 15 RGPD)</strong> : Obtenir une copie de toutes les données personnelles détenues.</li>
                <li><strong>Droit de rectification (Article 16 RGPD)</strong> : Corriger ou compléter les données inexactes ou incomplètes.</li>
                <li><strong>Droit à l'effacement (Article 17 RGPD)</strong> : Demander la suppression des données personnelles (sous réserve des obligations légales de conservation).</li>
                <li><strong>Droit à la limitation du traitement (Article 18 RGPD)</strong> : Demander la limitation du traitement dans certains cas.</li>
                <li><strong>Droit à la portabilité (Article 20 RGPD)</strong> : Récupérer les données dans un format structuré (JSON).</li>
                <li><strong>Droit d'opposition (Article 21 RGPD)</strong> : S'opposer au traitement pour des motifs légitimes.</li>
                <li><strong>Droit de retirer son consentement</strong> : Retirer le consentement à tout moment si le traitement repose sur le consentement.</li>
              </ul>

              <p className="mt-4"><strong>Exercice des droits :</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Accès aux données</strong> : Les utilisateurs peuvent accéder à leurs données via leur profil dans l'application (affichage du profil, historique des matchs, statistiques).</li>
                <li><strong>Export des données (Droit à la portabilité - Article 20 RGPD)</strong> : Les utilisateurs authentifiés peuvent exporter toutes leurs données personnelles via l'API <code className="bg-white/10 px-2 py-1 rounded text-sm">/api/rgpd/export-data</code> (méthode GET, authentification requise). Cette route retourne un fichier JSON contenant le profil utilisateur, les données du club (si admin), les informations d'abonnement, l'historique complet des participations aux matchs, les détails des matchs, les confirmations de matchs, les avis, et les participations aux challenges. Cette fonctionnalité est accessible depuis la page "Abonnement & essai" du compte club (lien "Télécharger mes données (RGPD)").</li>
                <li><strong>Rectification</strong> : Les utilisateurs peuvent modifier leurs informations directement dans leur profil (nom, prénom, photo, etc.).</li>
                <li><strong>Suppression de compte (Droit à l'effacement - Article 17 RGPD)</strong> : Les utilisateurs authentifiés peuvent demander la suppression de leur compte via l'API <code className="bg-white/10 px-2 py-1 rounded text-sm">/api/rgpd/delete-account</code> (méthode POST, authentification requise, confirmation explicite requise : <code className="bg-white/10 px-2 py-1 rounded text-sm">{"{ \"confirm\": \"DELETE_MY_ACCOUNT\" }"}</code>). Cette opération anonymise le profil utilisateur, anonymise les participations aux matchs, supprime les confirmations de matchs, avis et participations aux challenges, supprime les droits d'administration du club, supprime le compte d'authentification Supabase, et conserve les données de facturation selon les obligations légales (10 ans).</li>
                <li><strong>Contact support</strong> : Pour toute demande relative aux droits RGPD, les utilisateurs peuvent contacter le support à l'adresse email indiquée ci-dessous.</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">7.2. Contacts</h3>
            <div className="space-y-2 text-white/80">
              <p>Pour toute question relative à la protection des données personnelles ou pour exercer vos droits RGPD, vous pouvez contacter :</p>
              <p>
                <strong>Email de contact général :</strong> contact@padelxp.com<br />
                <strong>Email de contact RGPD/DPO :</strong> [Email du DPO à compléter - si DPO désigné, sinon utiliser contact@padelxp.com]<br />
                <strong>Adresse postale :</strong> [Adresse complète à compléter]<br />
                <strong>Téléphone :</strong> [Téléphone à compléter]
              </p>
              <p className="mt-3">
                Nous nous engageons à répondre à votre demande dans un délai maximum d'<strong>1 mois</strong> (délai pouvant être porté à 2 mois en cas de demande complexe, conformément à l'article 12.3 RGPD). Nous pouvons être amenés à vous demander une pièce d'identité pour vérifier votre identité avant de traiter votre demande.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


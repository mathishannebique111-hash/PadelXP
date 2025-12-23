# 📋 Obligations Légales et Réglementaires - PadelXP

**Document de référence pour la conformité juridique et technique**
**Dernière mise à jour : Janvier 2025**

---

## 📑 Table des matières

1. [Pages légales obligatoires](#1-pages-légales-obligatoires)
2. [Obligations RGPD et protection des données](#2-obligations-rgpd-et-protection-des-données)
3. [Obligations liées aux paiements en ligne](#3-obligations-liées-aux-paiements-en-ligne)
4. [Sécurité technique des paiements](#4-sécurité-technique-des-paiements)
5. [Obligations de facturation](#5-obligations-de-facturation)
6. [Gestion des abonnements et droits des utilisateurs](#6-gestion-des-abonnements-et-droits-des-utilisateurs)
7. [Plan d'implémentation priorisé](#7-plan-dimplémentation-priorisé)
8. [Références légales](#8-références-légales)

---

## 1. Pages légales obligatoires

### 1.1. Mentions légales (`/legal` ou `/mentions-legales`)

**Obligation légale :** Articles 6-III et 19 de la LCEN (Loi pour la Confiance en l'Économie Numérique)

**Contenu obligatoire :**

```
1. Identité de l'entreprise/service
   - Raison sociale ou nom
   - Forme juridique (SARL, SAS, EURL, etc.)
   - Numéro SIRET
   - Si auto-entrepreneur : numéro SIRET et statut
   - Capital social (si société)
   - Numéro d'inscription au RCS (si société)
   - Ville du greffe d'immatriculation
   - Numéro de TVA intracommunautaire (si applicable)

2. Coordonnées
   - Adresse du siège social
   - Adresse email
   - Numéro de téléphone
   - Directeur de publication : nom et prénom
   - Hébergeur du site :
     - Raison sociale
     - Adresse du siège social
     - Numéro de téléphone

3. Activité réglementée
   - Si activité nécessite une autorisation/agrément : mentionner
   - Numéro d'agrément/autorisation

4. Pour PadelXP (exemple) :
   - Nom : PadelXP
   - Forme juridique : [À compléter]
   - SIRET : [À compléter]
   - Capital social : [À compléter]
   - Siège social : [À compléter]
   - Email : contact@padelxp.com
   - Hébergeur : Vercel Inc. / Supabase Inc. (si applicable)
   - Directeur de publication : [Nom du responsable]
```

**Mentions spécifiques pour SaaS :**
- Conditions d'utilisation du service
- Disponibilité du service (9/10, 24/7, etc.)
- Niveau de service garanti

**Référence légale :** LCEN, Articles 6-III et 19

---

### 1.2. Conditions Générales de Vente (CGV) (`/cgv`)

**Obligation légale :** Article L.221-5 du Code de la consommation

**Contenu obligatoire pour un SaaS avec abonnement :**

#### Structure des CGV

```
1. OBJET ET CHAMP D'APPLICATION
   - Définition du service PadelXP
   - Acceptation des CGV lors de l'inscription
   - Modalités de modification des CGV

2. DESCRIPTION DU SERVICE
   - Fonctionnalités principales
   - Période d'essai gratuite (30 jours) : conditions, durée, fin
   - Formules d'abonnement (mensuel, trimestriel, annuel)
   - Limites d'utilisation (si applicable)

3. TARIFS ET MODALITÉS DE PAIEMENT
   - Prix HT et TTC de chaque formule
   - TVA applicable (20% en France)
   - Modalités de paiement (carte bancaire via Stripe)
   - Fréquence de facturation (mensuel/trimestriel/annuel)
   - Date d'échéance des paiements
   - Frais éventuels (frais de traitement, etc.)

4. COMMANDE ET CONCLUSION DU CONTRAT
   - Processus de commande (en ligne)
   - Acceptation explicite (case à cocher)
   - Confirmation de commande (email)
   - Droit de rétractation (voir section spécifique)

5. ABONNEMENT ET RENOUVELLEMENT
   - Abonnement automatique (tacite reconduction)
   - Date de renouvellement
   - Méthode de résiliation (voir ci-dessous)
   - Fin de l'abonnement et accès jusqu'à la fin de la période payée

6. RÉSILIATION PAR LE CLIENT
   - Résiliation à tout moment
   - Modalités de résiliation (via dashboard, email)
   - Effet de la résiliation (fin immédiate ou fin de période)
   - Conservation des données après résiliation

7. DROIT DE RÉTRACTATION
   - 14 jours calendaires à compter de la souscription
   - Formulaire de rétractation
   - Remboursement sous 14 jours
   - Exception : service entièrement exécuté si consentement exprès

8. OBLIGATIONS DU CLIENT
   - Informations exactes
   - Sécurité du compte
   - Utilisation conforme du service
   - Interdiction de contournement technique

9. OBLIGATIONS DE PADELXP
   - Disponibilité du service
   - Sécurité des données
   - Support client
   - Maintenance

10. PROPRIÉTÉ INTELLECTUELLE
    - Propriété de PadelXP sur la plateforme
    - Licence d'utilisation accordée au client
    - Propriété des données du client

11. RESPONSABILITÉ ET GARANTIES
    - Limitation de responsabilité
    - Force majeure
    - Garantie de conformité (2 ans)
    - Garantie des vices cachés

12. PROTECTION DES DONNÉES
    - Renvoi à la politique de confidentialité
    - Respect du RGPD

13. RÉSOLUTION DES LITIGES
    - Médiation (si applicable)
    - Tribunal compétent
    - Médiateur de la consommation (en France)

14. DISPOSITIONS DIVERSES
    - Droit applicable (droit français)
    - Nullité partielle
    - Modification des CGV
```

**Mentions spécifiques abonnement :**

```
Article X - RÉSILIATION DE L'ABONNEMENT

Le Client peut résilier son abonnement à tout moment, sans préavis, 
via son espace client ou par email à contact@padelxp.com.

En cas de résiliation :
- Si résilié avant le renouvellement automatique : l'abonnement prend 
  fin à la date de renouvellement prévue. Le Client conserve l'accès 
  jusqu'à la fin de la période déjà payée.
- Si résilié pendant la période d'engagement : l'accès est maintenu 
  jusqu'à la fin de la période payée, sans prélèvement supplémentaire.

La résiliation n'entraîne aucun remboursement de la période en cours 
sauf dans le cas du droit de rétractation (14 jours).

Le Client peut réactiver son abonnement à tout moment via son espace 
client. L'abonnement reprendra automatiquement au prochain cycle de 
facturation.

Renouvellement automatique :
L'abonnement est automatiquement renouvelé pour une période identique 
sauf résiliation préalable. Le Client est informé par email avant chaque 
renouvellement (au moins 7 jours avant).
```

**Références légales :**
- Code de la consommation, Articles L.221-5, L.221-18, L.224-25 à L.224-29
- Directive 2011/83/UE (droit de rétractation)
- Loi Hamon (résiliation facilitée)

---

### 1.3. Politique de Confidentialité / RGPD (`/privacy` ou `/confidentialite`)

**Obligation légale :** RGPD, Articles 13 et 14

**Contenu obligatoire :**

#### Structure de la politique de confidentialité

```
1. IDENTITÉ DU RESPONSABLE DU TRAITEMENT
   - Nom et coordonnées du responsable
   - DPO (Délégué à la Protection des Données) si applicable
   - Contact pour exercer ses droits : email

2. DONNÉES COLLECTÉES
   - Données personnelles collectées (liste exhaustive) :
     * Données d'identification : nom, prénom, email, téléphone
     * Données de connexion : adresse IP, logs
     * Données de paiement : gérées par Stripe (non stockées localement)
     * Données d'utilisation : statistiques, préférences
     * Cookies et traceurs
   
   - Données sensibles (si applicable) : aucune
   - Collecte automatique ou manuelle

3. FINS DU TRAITEMENT
   - Exécution du service (gestion des abonnements, accès à la plateforme)
   - Facturation et paiement
   - Support client
   - Marketing et prospection (si applicable, avec consentement)
   - Statistiques et amélioration du service
   - Obligations légales et comptables

4. BASE LÉGALE DU TRAITEMENT
   - Exécution du contrat (Article 6.1.b RGPD)
   - Consentement (Article 6.1.a RGPD) pour marketing
   - Obligation légale (Article 6.1.c RGPD) pour facturation
   - Intérêt légitime (Article 6.1.f RGPD) pour sécurité/statistiques

5. DESTINATAIRES DES DONNÉES
   - Services internes autorisés
   - Sous-traitants :
     * Stripe (paiements) - US (certifié Privacy Shield/SCC)
     * Supabase (hébergement) - EU/US
     * Vercel (hébergement) - US
     * Resend (emails) - US
   - Autorités (si obligation légale)

6. TRANSFERTS HORS UE
   - Stripe : États-Unis
   - Garanties : Privacy Shield invalide, utiliser Standard Contractual 
     Clauses (SCC) ou Binding Corporate Rules
   - Mentionner les garanties mises en place

7. DURÉE DE CONSERVATION
   - Données de compte : durée de l'abonnement + 3 ans (prescription)
   - Données de paiement : 10 ans (obligation comptable)
   - Données de connexion : 12 mois maximum
   - Après suppression : anonymisation ou suppression définitive

8. DROITS DES UTILISATEURS (Article 15-22 RGPD)
   - Droit d'accès (Article 15)
   - Droit de rectification (Article 16)
   - Droit à l'effacement (Article 17) - "droit à l'oubli"
   - Droit à la limitation du traitement (Article 18)
   - Droit à la portabilité (Article 20)
   - Droit d'opposition (Article 21)
   - Droit de retirer son consentement à tout moment
   
   Modalités d'exercice :
   - Email : dpo@padelxp.com ou contact@padelxp.com
   - Délai de réponse : 1 mois (peut être porté à 2 mois)
   - Formulaire de demande disponible

9. SÉCURITÉ DES DONNÉES
   - Mesures techniques : chiffrement (HTTPS/TLS), authentification forte
   - Mesures organisationnelles : accès limité, formation du personnel
   - Sauvegarde régulière

10. COOKIES ET TRACEURS
    - Renvoi à la politique des cookies (page dédiée ou section)

11. RÉCLAMATION
    - CNIL (Commission Nationale de l'Informatique et des Libertés)
    - Site : cnil.fr
    - Formulaire en ligne

12. MODIFICATIONS
    - Date de dernière mise à jour
    - Notification des modifications importantes
```

**Informations spécifiques pour PadelXP :**

```
DONNÉES COLLECTÉES POUR LES CLUBS :
- Informations du compte club : nom, email, téléphone, adresse
- Informations de paiement (gérées par Stripe)
- Données d'utilisation : connexions, actions sur la plateforme
- Données de facturation : historique des paiements

DONNÉES COLLECTÉES POUR LES MEMBRES :
- Nom, prénom, email (optionnel), photo de profil
- Historique des matchs
- Statistiques de jeu

BASE LÉGALE :
- Clubs : exécution du contrat d'abonnement (RGPD Art. 6.1.b)
- Membres : consentement (RGPD Art. 6.1.a) + intérêt légitime du club

TRANSFERTS HORS UE :
Stripe Inc. (États-Unis) - garanties via Standard Contractual Clauses 
approuvées par la Commission européenne.
```

**Références légales :**
- RGPD, Articles 13, 14, 15-22
- Loi Informatique et Libertés
- CNIL - Guide RGPD

---

### 1.4. Politique des Cookies (`/cookies`)

**Obligation légale :** Directive ePrivacy (2002/58/CE), transposée en France (Article 82 de la Loi Informatique et Libertés)

**Contenu obligatoire :**

```
1. QU'EST-CE QU'UN COOKIE ?
   - Définition simple
   - Types de cookies (techniques, analytiques, marketing)

2. COOKIES UTILISÉS SUR LE SITE
   Tableau détaillé :

   | Nom du cookie | Type | Durée | Finalité | Obligatoire/Consentement |
   |---------------|------|-------|----------|--------------------------|
   | session_id | Technique | Session | Authentification | Obligatoire |
   | csrf_token | Technique | Session | Sécurité | Obligatoire |
   | cookie_consent | Technique | 13 mois | Mémoriser le consentement | Obligatoire |
   | _ga, _gid | Analytique | 13 mois | Google Analytics | Consentement requis |
   | _stripe_mid | Technique | 1 an | Stripe (sécurité paiement) | Obligatoire |

3. GESTION DES COOKIES
   - Cookies strictement nécessaires : pas de consentement requis
   - Cookies analytiques/marketing : consentement requis
   - Bandeau de consentement avec options granulaire
   - Possibilité de modifier ses préférences à tout moment

4. COOKIES TIERS
   - Stripe (paiement) : cookies techniques nécessaires
   - Google Analytics (si utilisé) : consentement requis
   - Autres services tiers

5. DÉSACTIVATION DES COOKIES
   - Via les paramètres du navigateur
   - Impact sur le fonctionnement du site

6. OUTILS DE GESTION
   - Lien vers le bandeau de consentement
   - Outil de gestion des préférences
```

**Bandeau de consentement requis :**

```
Bandeau affiché au premier chargement :
┌─────────────────────────────────────────────────────────┐
│ 🍪 Nous utilisons des cookies pour améliorer votre      │
│ expérience. Certains sont nécessaires, d'autres        │
│ nécessitent votre consentement.                        │
│                                                         │
│ [Accepter tout] [Refuser tout] [Personnaliser]        │
└─────────────────────────────────────────────────────────┘

Options granulaires :
- ✅ Cookies strictement nécessaires (obligatoires)
- ☐ Cookies analytiques (Google Analytics)
- ☐ Cookies marketing/publicitaires (si applicable)
```

**Références légales :**
- Directive ePrivacy 2002/58/CE
- Loi Informatique et Libertés, Article 82
- CNIL - Recommandations sur les cookies

---

### 1.5. Page Sécurisation des Paiements (`/paiement-securise` ou section dans CGV)

**Obligation légale :** Directive DSP2, Article L.133-16 du Code monétaire et financier

**Contenu obligatoire :**

```
1. SÉCURITÉ DES PAIEMENTS
   - Hébergement sécurisé (HTTPS/TLS)
   - Pas de stockage des données de carte bancaire
   - Conformité PCI-DSS via Stripe

2. PROCESSUS DE PAIEMENT
   - Redirection vers Stripe Checkout (page sécurisée)
   - Authentification forte (SCA - Strong Customer Authentication)
   - Vérification 3D Secure (si demandé par la banque)

3. PARTENAIRE DE PAIEMENT
   - Stripe (société certifiée PCI-DSS niveau 1)
   - Localisation : États-Unis (garanties contractuelles)
   - Site : stripe.com
   - Certification : PCI-DSS niveau 1 (plus haut niveau)

4. PROTECTION CONTRE LA FRAUDE
   - Détection automatique des transactions suspectes
   - Vérification des cartes bancaires
   - Chiffrement des communications

5. RESPONSABILITÉ
   - PadelXP ne stocke jamais les données de carte bancaire
   - En cas de fraude, contacter immédiatement votre banque
   - Assurance de Stripe pour les transactions frauduleuses

6. INFORMATIONS LÉGALES
   - Conformité DSP2 (Directive sur les Services de Paiement 2)
   - Authentification forte obligatoire depuis 2019
   - Protection du consommateur
```

**Références légales :**
- Directive DSP2 (2015/2366/UE)
- Code monétaire et financier, Article L.133-16
- PCI-DSS Standards

---

## 2. Obligations RGPD et protection des données

### 2.1. Registre des traitements

**Obligation :** Article 30 RGPD

Vous devez tenir un registre documentant tous les traitements de données personnelles.

**Exemple pour PadelXP :**

| Traitement | Finalité | Données | Base légale | Durée | Destinataires |
|------------|----------|---------|-------------|-------|---------------|
| Gestion des comptes clubs | Authentification, accès au service | Email, mot de passe (hashé), nom | Exécution contrat | Durée abonnement + 3 ans | Supabase, Vercel |
| Gestion des abonnements | Facturation, paiement | Email, informations abonnement | Exécution contrat | 10 ans | Stripe, Supabase |
| Support client | Réponses aux demandes | Email, historique échanges | Exécution contrat | 3 ans | Resend, Supabase |
| Statistiques d'utilisation | Amélioration du service | Données agrégées anonymisées | Intérêt légitime | 2 ans | Supabase |
| Emails marketing | Prospection | Email | Consentement | Jusqu'au retrait | Resend |

### 2.2. Analyse d'impact (PIA/DPIA)

**Obligation :** Article 35 RGPD (si traitement à haut risque)

**Cas nécessitant une DPIA :**
- Traitement à grande échelle
- Profiling automatisé
- Données sensibles
- Surveillance systématique

**Pour PadelXP :** Probablement non requis si pas de traitement à haut risque. À évaluer selon le volume.

### 2.3. Consentement aux cookies

**Obligation :** Directive ePrivacy, Article 82 LIL

- Bandeau de consentement au premier chargement
- Options granulaires (accepter/refuser par catégorie)
- Possibilité de modifier les préférences
- Cookies techniques exemptés (session, authentification)

### 2.4. Exercice des droits RGPD

**Obligation :** Articles 15-22 RGPD

Vous devez mettre en place :

1. **Formulaire de demande** accessible depuis la page RGPD
2. **Processus de traitement** :
   - Recevoir la demande
   - Vérifier l'identité
   - Traiter sous 1 mois (2 mois max si complexe)
   - Répondre par écrit
3. **Outils techniques** :
   - Export des données (droit à la portabilité)
   - Suppression des données (droit à l'effacement)
   - Modification des données (droit de rectification)

**Exemple de formulaire de demande :**

```
Formulaire accessible sur /rgpd/exercer-droits

Je souhaite exercer mon droit de :
☐ Accès à mes données
☐ Rectification
☐ Effacement (droit à l'oubli)
☐ Portabilité
☐ Opposition
☐ Limitation du traitement

Email de contact : [_________________]
Message (optionnel) : [_________________]

[Envoyer la demande]
```

### 2.5. Notification de violation de données

**Obligation :** Articles 33-34 RGPD

En cas de violation de données personnelles :

1. **Notification à la CNIL** : sous 72 heures si risque pour les droits
2. **Notification aux personnes concernées** : si risque élevé

**Mesures préventives :**
- Surveillance des logs
- Alertes automatiques
- Plan de gestion des incidents

### 2.6. Sous-traitants et transferts hors UE

**Obligation :** Articles 44-49 RGPD

**Pour PadelXP :**

| Sous-traitant | Localisation | Données | Garanties |
|---------------|--------------|---------|-----------|
| Stripe | États-Unis | Données paiement | SCC (Standard Contractual Clauses) |
| Vercel | États-Unis | Données hébergement | SCC |
| Supabase | EU/US | Données application | Vérifier contrat (SCC si US) |
| Resend | États-Unis | Emails | SCC |

**Actions à mener :**
1. Vérifier que les contrats incluent les clauses contractuelles types (SCC)
2. Mentionner dans la politique de confidentialité
3. Tenir à jour la liste des sous-traitants

---

## 3. Obligations liées aux paiements en ligne

### 3.1. Directive DSP2 (Payment Services Directive 2)

**Obligations principales :**

#### a) Authentification forte (SCA - Strong Customer Authentication)

**Quand applicable :**
- Tous les paiements en ligne depuis septembre 2019
- Obligatoire pour paiements > 30€ (sauf exceptions)

**Exigences :**
- 2 facteurs parmi : possession (carte), connaissance (code), inherence (biométrie)
- Stripe gère automatiquement la SCA via 3D Secure

**Information client :**
```
"Pour votre sécurité, nous utilisons l'authentification forte (SCA) 
conformément à la directive DSP2. Votre banque peut vous demander 
de confirmer votre paiement via 3D Secure (code SMS ou application)."
```

#### b) Informations précontractuelles

**Obligation :** Article L.221-5 du Code de la consommation

Avant la commande, informer clairement :

```
- Prix TTC de l'abonnement
- Durée de l'engagement
- Conditions de renouvellement automatique
- Modalités de résiliation
- Coût total sur la durée de l'engagement (si engagement > 1 an)
- Frais éventuels
```

#### c) Confirmation de commande

**Obligation :** Article L.216-1 du Code de la consommation

Envoi immédiat par email d'une confirmation comprenant :
- Numéro de commande
- Récapitulatif de la commande
- Prix TTC
- Date de livraison (immédiate pour SaaS)
- Modalités de rétractation

### 3.2. Gestion des abonnements récurrents

**Obligations spécifiques :**

#### a) Information sur le renouvellement automatique

**Obligation :** Article L.224-25 du Code de la consommation

**Mentions obligatoires :**
- Abonnement renouvelé automatiquement sauf résiliation
- Date de renouvellement
- Prix du renouvellement
- Modalités de résiliation (faciles, gratuites)
- **Information par email avant chaque renouvellement** (au moins 7 jours avant)

#### b) Résiliation facilitée

**Obligation :** Loi Hamon, Article L.224-29

- Résiliation possible à tout moment
- Modalités simples (bouton dans l'espace client, email)
- Gratuite (pas de frais de résiliation)
- Effet : fin à la date de renouvellement (pas de remboursement de la période en cours)

**Exemple de mention :**
```
"Vous pouvez résilier votre abonnement à tout moment, gratuitement, 
via votre espace client ou par email. La résiliation prend effet à 
la date de renouvellement. Vous conservez l'accès jusqu'à la fin de 
la période payée."
```

#### c) Réactivation d'abonnement

Si un client a résilié mais souhaite réactiver avant la fin de la période :
- Possible à tout moment
- L'abonnement reprend automatiquement au prochain cycle
- Information claire sur le prochain prélèvement

**✅ Déjà implémenté dans PadelXP :** Bouton de réactivation disponible

### 3.3. Droit de rétractation (14 jours)

**Obligation :** Directive 2011/83/UE, Article L.221-18 du Code de la consommation

#### a) Délai

14 jours calendaires à compter de :
- La conclusion du contrat (souscription de l'abonnement)
- La réception de la confirmation de commande

#### b) Exception pour les services numériques

**Exception importante :** Article L.221-28-2
Si le client a **expressément consenti** et **reconnu** perdre son droit de rétractation, et que le service a été entièrement exécuté, **pas de rétractation possible**.

**Mise en œuvre :**
- Case à cocher explicite lors de la souscription :
```
☐ Je comprends que je perds mon droit de rétractation dès le début 
  de l'exécution du service et je consens à ce que le service 
  commence immédiatement.
```
- Si non coché : période d'essai de 14 jours avant facturation
- Si coché : service commence immédiatement, pas de rétractation

**Pour PadelXP (période d'essai de 30 jours) :**
- Pas de facturation pendant l'essai
- Le droit de rétractation peut s'appliquer si souscription pendant l'essai
- À clarifier avec un juriste selon votre modèle

#### c) Modalités de rétractation

**Formulaire de rétractation obligatoire :**

```
Je soussigné(e) [Nom, Prénom]
Email : [_________________]
Numéro de commande : [_________________]

Notification vous faisant savoir que je me rétracte du contrat 
portant sur la fourniture du service suivant : 
Abonnement PadelXP [formule]

Commandé le / reçu le : [Date]

Signature (uniquement si ce formulaire est notifié sur papier) : 
[_________________]

Date : [_________________]
```

#### d) Remboursement

- Sous 14 jours à compter de la réception de la rétractation
- Même moyen de paiement (sauf accord du client)
- Aucun frais ne peut être retenu

### 3.4. Gestion des échecs de paiement

**Obligations :**

1. **Information du client** :
   - Email immédiat en cas d'échec
   - Raison de l'échec (si disponible)
   - Actions à entreprendre

2. **Relances** :
   - Relance automatique par Stripe (configurable)
   - Possibilité de mettre à jour le moyen de paiement

3. **Suspension d'accès** :
   - Après plusieurs échecs, suspension possible
   - Information préalable (au moins 7 jours avant)

4. **Résiliation pour défaut de paiement** :
   - Après plusieurs tentatives infructueuses
   - Résiliation automatique possible
   - Conservation des données selon durée légale

### 3.5. Prohibitions et restrictions

**Interdictions légales :**

1. **Paiement par chèque** : Non autorisé pour services à distance (sauf exceptions)

2. **Frais cachés** : Interdiction de frais non mentionnés avant la commande

3. **Surtarification selon moyen de paiement** : Interdiction de majorer selon la carte (sauf coût réel justifié)

4. **Paiement différé sans consentement** : Obligation d'information claire

---

## 4. Sécurité technique des paiements

### 4.1. Conformité PCI-DSS

**Obligation :** Payment Card Industry Data Security Standard

#### Niveau de conformité requis

**PadelXP utilise Stripe Checkout :**
- ✅ Stripe est certifié **PCI-DSS niveau 1** (plus haut niveau)
- ✅ PadelXP n'est **pas dans le périmètre PCI-DSS** car :
  - Pas de stockage de données de carte
  - Pas de traitement de numéros de carte
  - Redirection vers Stripe Checkout
  - Utilisation de l'API Stripe sécurisée

**Vérification :**
- Utiliser uniquement l'API Stripe officielle
- Ne jamais intercepter ou logger les données de carte
- Utiliser HTTPS partout
- Ne pas stocker de données de carte (même chiffrées)

#### Si vous implémentez un formulaire de paiement personnalisé

**Obligations :**
- Utiliser Stripe Elements (composants sécurisés)
- Ne jamais intercepter les données de carte
- Validation PCI-DSS niveau 1 (très complexe et coûteux)

**Recommandation :** Rester sur Stripe Checkout (déjà implémenté) ✅

### 4.2. HTTPS et certificats SSL/TLS

**Obligation :** Recommandation forte (obligatoire pour paiements)

**Exigences :**
- ✅ HTTPS obligatoire sur tout le site
- ✅ Certificat SSL/TLS valide et à jour
- ✅ Version TLS 1.2 minimum (TLS 1.3 recommandé)
- ✅ Redirection automatique HTTP → HTTPS

**Vérification :**
- Vercel fournit HTTPS automatiquement ✅
- Vérifier la configuration dans Vercel

### 4.3. Sécurisation des webhooks Stripe

**Obligations de sécurité :**

1. **Vérification de signature** :
   ```typescript
   // Obligatoire dans app/api/stripe/webhook/route.ts
   const signature = req.headers.get('stripe-signature');
   const event = stripe.webhooks.constructEvent(
     body,
     signature,
     process.env.STRIPE_WEBHOOK_SECRET
   );
   ```

2. **Endpoint HTTPS uniquement**

3. **Idempotence** : Gérer les événements dupliqués (utiliser `idempotency_key`)

4. **Logging sécurisé** : Ne jamais logger les données sensibles

**✅ À vérifier :** Votre route `/api/stripe/webhook` doit vérifier la signature

### 4.4. Stockage sécurisé des données

**Principes :**

1. **Données de paiement** :
   - ❌ Ne jamais stocker numéro de carte, CVV, date d'expiration
   - ✅ Stocker uniquement `stripe_subscription_id`, `stripe_customer_id`
   - ✅ Ces IDs sont suffisants pour gérer l'abonnement

2. **Données sensibles** :
   - Chiffrement au repos (Supabase le fait automatiquement)
   - Chiffrement en transit (HTTPS/TLS)

3. **Secrets et clés API** :
   - Variables d'environnement uniquement (jamais dans le code)
   - Rotation régulière des clés
   - Accès limité au personnel autorisé

### 4.5. Bonnes pratiques anti-fraude

**Mesures recommandées :**

1. **Rate limiting** :
   - Limiter les tentatives de paiement
   - Limiter les appels API Stripe

2. **Vérification d'identité** :
   - Email vérifié avant souscription
   - Authentification forte pour compte

3. **Surveillance** :
   - Alertes sur transactions suspectes
   - Monitoring des webhooks Stripe

4. **Stripe Radar** :
   - Activer la protection anti-fraude de Stripe
   - Configurer les règles de blocage

**Références :**
- PCI-DSS Standards
- OWASP Top 10
- CNIL - Guide sécurité

---

## 5. Obligations de facturation

### 5.1. Structure obligatoire d'une facture

**Obligation :** Articles 242 nonies A et 242 nonies B de l'Annexe II du CGI

**Mentions obligatoires B2C (Business to Consumer) :**

```
1. Numéro de facture (unique, séquentiel)
2. Date d'émission
3. Date de la prestation
4. Identité du vendeur (vous) :
   - Nom ou raison sociale
   - Adresse complète
   - Numéro SIRET
   - Numéro de TVA intracommunautaire (si applicable)
5. Identité du client :
   - Nom et prénom (ou raison sociale)
   - Adresse (obligatoire pour B2C depuis 2024)
6. Numéro de TVA intracommunautaire du client (si applicable B2B)
7. Numéro SIREN du client (OBLIGATOIRE depuis 2024 pour B2B uniquement)
8. Désignation de la prestation :
   - Nature de l'opération (ex: "Abonnement SaaS - Formule mensuelle")
   - Période facturée (ex: "01/01/2025 - 31/01/2025")
   - Quantité
9. Prix unitaire HT
10. Taux de TVA (20% en France)
11. Montant HT
12. Montant de la TVA
13. Montant TTC
14. Conditions de paiement :
    - Date d'échéance
    - Moyen de paiement accepté
15. Mentions légales :
    - "TVA due au titre de l'article 259 B du CGI" (si applicable)
    - Pénalités de retard (taux, conditions)
    - Indemnité forfaitaire pour frais de recouvrement (40€)
16. Numéro d'ordre du reçu (si reçu électronique)
```

**Mentions obligatoires B2B (Business to Business) - NOUVELLES 2024-2025 :**

```
En plus des mentions B2C :
- Numéro SIREN du client (OBLIGATOIRE depuis le 1er janvier 2024)
- Nature de l'opération (détaillée, obligatoire depuis 2024)
```

### 5.2. Exemple de facture conforme

```
═══════════════════════════════════════════════════════════════
                    FACTURE N° FACT-2025-001
═══════════════════════════════════════════════════════════════

Date d'émission : 01/01/2025
Date de la prestation : 01/01/2025 - 31/01/2025

PRESTATAIRE :
PadelXP
[Adresse complète]
SIRET : [Votre SIRET]
TVA Intracommunautaire : FR[Votre numéro TVA]
Email : contact@padelxp.com

CLIENT :
[Nom du club]
[Adresse complète]
SIREN : [OBLIGATOIRE pour B2B depuis 2024]
Email : [email du client]

═══════════════════════════════════════════════════════════════
DÉSIGNATION
═══════════════════════════════════════════════════════════════

Nature de l'opération : Abonnement SaaS - Formule mensuelle
Période : 01/01/2025 - 31/01/2025
Quantité : 1

Prix unitaire HT : 40,83 €
Taux de TVA : 20,00%
Montant HT : 40,83 €
Montant TVA : 8,17 €
───────────────────────────────────────────────────────────────
MONTANT TTC : 49,00 €
═══════════════════════════════════════════════════════════════

Conditions de paiement :
- Prélèvement automatique par carte bancaire
- Paiement effectué le 01/01/2025

Mentions légales :
- TVA due au titre de l'article 259 B du CGI
- En cas de retard de paiement :
  * Pénalités de retard : 3 fois le taux d'intérêt légal
  * Indemnité forfaitaire pour frais de recouvrement : 40 €

═══════════════════════════════════════════════════════════════
```

### 5.3. Conservation des factures

**Obligation :** Article L102 B du LPF (Livrer de procédures fiscales)

- **Durée :** 10 ans à compter de la clôture de l'exercice
- **Format :** Papier ou électronique (si authentification possible)
- **Accessibilité :** Client doit pouvoir télécharger ses factures

**Implémentation technique :**
- Générer les factures automatiquement via Stripe
- Stocker dans Supabase avec lien vers PDF
- Permettre le téléchargement depuis l'espace client

### 5.4. Factures électroniques

**Obligation progressive :** E-invoicing (facturation électronique obligatoire)

**Calendrier France :**
- **B2B :** Obligatoire progressivement à partir de 2024 (déjà obligatoire pour grandes entreprises)
- **B2C :** Non obligatoire mais recommandé

**Format :** Factur-X ou PDF-A avec XML intégré (si B2B)

**Stripe :** Génère automatiquement des factures PDF, mais vérifier la conformité E-invoicing si clientèle B2B.

### 5.5. Mentions spécifiques abonnements

**Sur la facture, préciser :**

```
- Période facturée (du ... au ...)
- Renouvellement automatique (si applicable)
- Date de prochain renouvellement
- Modalités de résiliation
```

---

## 6. Gestion des abonnements et droits des utilisateurs

### 6.1. Transparence des prix

**Obligation :** Article L.112-1 du Code de la consommation

**Affichage obligatoire :**

```
✅ Prix TTC (Toutes Taxes Comprises) en premier
✅ Prix HT si B2B
✅ TVA mentionnée clairement
✅ Prix par période (mensuel, trimestriel, annuel)
✅ Économie réalisée (si offre annuelle)
✅ Pas de frais cachés
```

**Exemple conforme :**
```
Formule Mensuelle : 49 € TTC / mois (40,83 € HT + 8,17 € TVA)
Formule Trimestrielle : 137 € TTC / 3 mois (114,17 € HT)
Formule Annuelle : 490 € TTC / an (408,33 € HT) - Économisez 98 €
```

### 6.2. Contrat d'abonnement

**Informations contractuelles obligatoires :**

1. **Avant souscription** (précontractuel) :
   - Conditions générales accessibles
   - Prix et modalités de paiement
   - Durée et renouvellement
   - Droit de rétractation

2. **Lors de la souscription** :
   - Acceptation explicite des CGV (case à cocher)
   - Confirmation de commande par email
   - Numéro de contrat/commande

3. **Pendant l'abonnement** :
   - Accès aux factures
   - Historique des paiements
   - Conditions de résiliation visibles

### 6.3. Modification du contrat

**Obligations :**

1. **Modification des CGV** :
   - Notification par email (1 mois avant)
   - Possibilité de résilier sans frais si désaccord
   - Nouvelle acceptation si modification substantielle

2. **Modification du prix** :
   - Notification 1 mois avant
   - Possibilité de résilier
   - Prix garanti pour la période en cours

3. **Modification du service** :
   - Information préalable
   - Possibilité de résilier si changement majeur

### 6.4. Conservation des données après résiliation

**Durées légales :**

| Type de données | Durée de conservation | Base légale |
|-----------------|----------------------|-------------|
| Données de facturation | 10 ans | Obligation comptable |
| Données de compte | 3 ans après résiliation | Prescription civile |
| Données de connexion | 12 mois | Loi anti-terrorisme |
| Données de paiement | 13 mois (données Stripe) | Directive DSP2 |

**Droit à l'effacement :**
- Le client peut demander la suppression immédiate (sauf obligations légales)
- Anonymisation possible pour statistiques

### 6.5. Export des données (droit à la portabilité)

**Obligation :** Article 20 RGPD

**Mise en œuvre :**

1. **Format exportable** :
   - JSON ou CSV
   - Données structurées, couramment utilisées

2. **Données à exporter** :
   - Données de compte
   - Historique des matchs (pour membres)
   - Statistiques
   - Factures (PDF)

3. **Accès utilisateur** :
   - Bouton "Télécharger mes données" dans l'espace client
   - Export automatique dans les 30 jours

---

## 7. Plan d'implémentation priorisé

### Phase 1 : URGENT - Conformité minimale (Semaine 1-2)

#### Priorité CRITIQUE (bloquant pour mise en production)

**Tickets Frontend :**

1. **FRONT-001 : Page Mentions Légales**
   - **Fichier :** `app/legal/page.tsx`
   - **Contenu :** Identité entreprise, SIRET, coordonnées, hébergeur
   - **Lien :** Footer (déjà présent `href="/legal"` → créer la page)
   - **Estimation :** 2h

2. **FRONT-002 : Page CGV**
   - **Fichier :** `app/cgv/page.tsx`
   - **Contenu :** Structure complète (voir section 1.2)
   - **Points clés :** Résiliation, renouvellement automatique, droit de rétractation
   - **Lien :** Footer (`/terms` → renommer ou créer `/cgv`)
   - **Estimation :** 4h

3. **FRONT-003 : Page Politique de Confidentialité**
   - **Fichier :** `app/privacy/page.tsx`
   - **Contenu :** Structure RGPD (voir section 1.3)
   - **Points clés :** Données collectées, droits RGPD, sous-traitants
   - **Lien :** Footer (déjà présent `href="/privacy"`)
   - **Estimation :** 4h

4. **FRONT-004 : Bandeau de consentement cookies**
   - **Fichier :** `components/cookies/CookieConsent.tsx`
   - **Fonctionnalités :** Bandeau au premier chargement, options granulaires, mémorisation du consentement
   - **Intégration :** `app/layout.tsx`
   - **Estimation :** 6h

5. **FRONT-005 : Page Politique des Cookies**
   - **Fichier :** `app/cookies/page.tsx`
   - **Contenu :** Tableau des cookies, gestion des préférences
   - **Estimation :** 3h

**Tickets Backend :**

6. **BACK-001 : Vérification signature webhooks Stripe**
   - **Fichier :** `app/api/stripe/webhook/route.ts`
   - **Action :** Vérifier que la signature est validée (obligatoire PCI-DSS)
   - **Estimation :** 1h

7. **BACK-002 : API exercice droits RGPD**
   - **Fichier :** `app/api/rgpd/export-data/route.ts`, `app/api/rgpd/delete-account/route.ts`
   - **Fonctionnalités :** Export données (JSON), suppression compte (respectant durées légales)
   - **Estimation :** 8h

**Tickets Juridique/Contenu :**

8. **JURID-001 : Rédaction mentions légales**
   - **Action :** Compléter les informations manquantes (SIRET, adresse, etc.)
   - **Estimation :** 2h

9. **JURID-002 : Rédaction CGV complètes**
   - **Action :** Rédiger les CGV selon template (section 1.2)
   - **Recommandation :** Faire valider par un avocat spécialisé
   - **Estimation :** 8h

10. **JURID-003 : Rédaction politique de confidentialité**
    - **Action :** Compléter selon template (section 1.3)
    - **Estimation :** 6h

---

### Phase 2 : IMPORTANT - Sécurisation et transparence (Semaine 3-4)

**Tickets Frontend :**

11. **FRONT-006 : Page sécurisation des paiements**
    - **Fichier :** `app/paiement-securise/page.tsx` ou section dans CGV
    - **Contenu :** Information sur Stripe, PCI-DSS, SCA
    - **Estimation :** 2h

12. **FRONT-007 : Formulaire de rétractation**
    - **Fichier :** `app/rétractation/page.tsx` ou `components/legal/RetractationForm.tsx`
    - **Contenu :** Formulaire conforme (section 3.3)
    - **Intégration :** Lien depuis page CGV et email de confirmation
    - **Estimation :** 3h

13. **FRONT-008 : Affichage prix conforme**
    - **Fichier :** `app/dashboard/facturation/page.tsx`
    - **Action :** Vérifier affichage TTC, HT, TVA, pas de frais cachés
    - **Estimation :** 1h

14. **FRONT-009 : Espace téléchargement factures**
    - **Fichier :** `app/dashboard/facturation/historique/page.tsx`
    - **Fonctionnalités :** Liste factures, téléchargement PDF
    - **Estimation :** 4h

15. **FRONT-010 : Bouton export données RGPD**
    - **Fichier :** `app/dashboard/parametres/page.tsx`
    - **Action :** Bouton "Télécharger mes données" (JSON)
    - **Estimation :** 2h

**Tickets Backend :**

16. **BACK-003 : Génération factures PDF**
    - **Fichier :** `app/api/invoices/generate/route.ts`
    - **Action :** Générer PDF conforme (section 5.2)
    - **Bibliothèque :** `pdfkit` ou `@react-pdf/renderer`
    - **Estimation :** 12h

17. **BACK-004 : Email avant renouvellement automatique**
    - **Fichier :** `app/api/cron/notify-renewal/route.ts` (cron job)
    - **Action :** Envoyer email 7 jours avant renouvellement (obligatoire L.224-25)
    - **Estimation :** 4h

18. **BACK-005 : Traitement formulaire rétractation**
    - **Fichier :** `app/api/legal/retractation/route.ts`
    - **Action :** Recevoir demande, vérifier délai 14 jours, procéder remboursement via Stripe
    - **Estimation :** 6h

---

### Phase 3 : RECOMMANDÉ - Amélioration UX et conformité avancée (Semaine 5-6)

**Tickets Frontend :**

19. **FRONT-011 : Confirmation commande avec mentions légales**
    - **Fichier :** `app/dashboard/facturation/success/page.tsx`
    - **Action :** Afficher numéro commande, récapitulatif, modalités rétractation
    - **Estimation :** 2h

20. **FRONT-012 : Page gestion préférences cookies**
    - **Fichier :** `app/cookies/gestion/page.tsx`
    - **Action :** Permettre modification préférences à tout moment
    - **Estimation :** 3h

21. **FRONT-013 : Informations avant paiement**
    - **Fichier :** `components/billing/StripeCheckoutButton.tsx` ou modal
    - **Action :** Afficher récapitulatif : prix TTC, renouvellement auto, résiliation, avant clic
    - **Estimation :** 3h

**Tickets Backend :**

22. **BACK-006 : Registre des traitements RGPD**
    - **Fichier :** `docs/REGISTRE_TRAITEMENTS_RGPD.md`
    - **Action :** Documenter tous les traitements (section 2.1)
    - **Estimation :** 4h

23. **BACK-007 : Logging sécurisé**
    - **Action :** Vérifier qu'aucune donnée sensible n'est loggée (cartes, mots de passe)
    - **Estimation :** 2h

24. **BACK-008 : Plan de gestion incidents (violation données)**
    - **Fichier :** `docs/PLAN_INCIDENTS_RGPD.md`
    - **Action :** Procédure notification CNIL sous 72h, notification personnes concernées
    - **Estimation :** 4h

---

### Phase 4 : OPTIONNEL - Optimisations et audit

25. **AUDIT-001 : Audit de conformité juridique**
    - **Action :** Faire auditer par un avocat spécialisé e-commerce/SaaS
    - **Estimation :** Externe

26. **AUDIT-002 : Audit sécurité technique**
    - **Action :** Audit OWASP, test de pénétration (optionnel mais recommandé)
    - **Estimation :** Externe

27. **OPT-001 : Analyse d'impact RGPD (DPIA)**
    - **Action :** Si volume important, réaliser DPIA (Article 35 RGPD)
    - **Estimation :** 8h

---

## 8. Références légales

### 8.1. Textes principaux

#### Protection des données (RGPD)
- **Règlement (UE) 2016/679** - RGPD (General Data Protection Regulation)
- **Loi n° 78-17 du 6 janvier 1978** - Loi Informatique et Libertés
- **Directive 2002/58/CE** - Directive ePrivacy (cookies)

#### Commerce électronique
- **Loi n° 2004-575 du 21 juin 2004** - LCEN (Loi pour la Confiance en l'Économie Numérique)
- **Code de la consommation** - Articles L.221-5 (CGV), L.221-18 (rétractation), L.224-25 à L.224-29 (abonnements)
- **Directive 2011/83/UE** - Droits des consommateurs
- **Loi n° 2014-344 du 17 mars 2014** - Loi Hamon (résiliation facilitée)

#### Paiements
- **Directive (UE) 2015/2366** - DSP2 (Payment Services Directive 2)
- **Code monétaire et financier** - Articles L.133-16 (authentification forte)
- **PCI-DSS Standards** - Payment Card Industry Data Security Standard

#### Facturation
- **Code de commerce** - Articles L.441-9 (facturation)
- **Code général des impôts** - Articles 242 nonies A et B (mentions factures)
- **Livre des procédures fiscales** - Article L102 B (conservation 10 ans)

### 8.2. Autorités et organismes

#### France
- **CNIL** (Commission Nationale de l'Informatique et des Libertés)
  - Site : cnil.fr
  - Réclamations : formulaire en ligne
- **DGCCRF** (Direction Générale de la Concurrence, de la Consommation et de la Répression des Fraudes)
  - Site : economie.gouv.fr/dgccrf
- **Médiateur de la consommation**
  - Site : mediation-conso.org

#### Europe
- **EDPB** (European Data Protection Board)
  - Site : edpb.europa.eu

### 8.3. Ressources utiles

#### Guides officiels
- CNIL - Guide RGPD : cnil.fr/fr/rgpd-de-quoi-parle-t-on
- CNIL - Guide cookies : cnil.fr/fr/cookies-et-autres-traceurs
- Service-Public - Vente en ligne : service-public.fr/professionnels/vosdroits/F31228

#### Templates et outils
- CNIL - Générateur de mentions légales : cnil.fr/fr/mentions-legales
- CNIL - Générateur de politique de confidentialité : cnil.fr/fr/modele-de-politique-de-confidentialite
- CNIL - Registre des traitements : cnil.fr/fr/le-registre-des-activites-de-traitement

---

## 📝 Checklist de conformité

### Avant mise en production

- [ ] Mentions légales complètes et accessibles
- [ ] CGV complètes avec mentions abonnements
- [ ] Politique de confidentialité RGPD conforme
- [ ] Bandeau de consentement cookies fonctionnel
- [ ] Page politique des cookies
- [ ] Vérification signature webhooks Stripe
- [ ] Affichage prix TTC clair
- [ ] Informations avant paiement (renouvellement, résiliation)
- [ ] Email confirmation de commande
- [ ] Formulaire de rétractation accessible
- [ ] Conditions de résiliation claires et faciles

### Post-mise en production (dans le mois)

- [ ] Génération factures PDF conformes
- [ ] Espace téléchargement factures pour clients
- [ ] Email avant renouvellement automatique (7 jours avant)
- [ ] Export données RGPD fonctionnel
- [ ] Registre des traitements documenté
- [ ] Plan de gestion incidents RGPD

### Maintenance continue

- [ ] Mise à jour CGV si modification (notification 1 mois avant)
- [ ] Mise à jour politique de confidentialité si changement
- [ ] Vérification régulière conformité sous-traitants
- [ ] Audit sécurité annuel (recommandé)
- [ ] Formation équipe sur RGPD

---

## ⚠️ Avertissements importants

1. **Ce document est informatif et ne constitue pas un avis juridique.** Consultez un avocat spécialisé pour valider votre conformité.

2. **Les obligations peuvent varier** selon :
   - Votre forme juridique (auto-entrepreneur, SARL, SAS, etc.)
   - Votre localisation (France, Europe)
   - Votre clientèle (B2B, B2C, mixte)
   - Votre volume d'activité

3. **Les textes légaux évoluent.** Vérifiez régulièrement les mises à jour (notamment facturation électronique B2B).

4. **Stripe gère la conformité PCI-DSS**, mais vous devez respecter les obligations contractuelles et légales de votre pays.

---

**Document créé le :** Janvier 2025  
**Prochaine révisi
on recommandée :** Juillet 2025  
**Contact juridique recommandé :** [Nom avocat spécialisé e-commerce/SaaS]



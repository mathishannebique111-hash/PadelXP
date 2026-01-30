# Instructions pour la Configuration Stripe

## Prérequis
Vous devez créer deux produits dans Stripe pour gérer les différentes offres :

### 1. Produit Fondateur (39€/mois)
- Prix : 39€/mois
- Récurrent : mensuel
- **Variable d'environnement existante** : `NEXT_PUBLIC_STRIPE_PRICE_FOUNDER_39`
  - Cette variable contient déjà le Price ID Stripe pour l'offre Fondateur
  - Exemple : `price_1AbCdEfGhIjKlMnO`

### 2. Produit Standard (49€/mois) - À CRÉER
- Prix : 49€/mois
- Récurrent : mensuel
- **Nouvelle variable d'environnement** : `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_49`
  - Après avoir créé le produit dans Stripe, copiez le Price ID
  - Ajoutez-le dans votre fichier `.env.local` :
    ```
    NEXT_PUBLIC_STRIPE_PRICE_STANDARD_49=price_VotreNouveauPriceID
    ```

## Migration de la Base de Données
Le fichier de migration SQL a été créé ici :
`supabase/migrations/20260130000000_add_founder_promo_system.sql`

**Pour appliquer la migration :**
```bash
# Si vous utilisez Supabase CLI
npm run db:reset

# Ou manuellement via le dashboard Supabase
# Copiez le contenu du fichier SQL et exécutez-le dans l'éditeur SQL
```

## Résumé du Système
- **Code Promo** : `FONDATIONLANCEMENT26`
- **Offre Fondateur** :
  - 3 mois d'essai gratuit
  - Puis 39€/mois à vie
- **Offre Standard** :
  - 14 jours d'essai gratuit (+14 jours bonus possibles)
  - Puis 49€/mois

# Instructions pour créer les tables de support

## Étape 1 : Ouvrir Supabase SQL Editor

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor** dans le menu de gauche
3. Cliquez sur **New Query**

## Étape 2 : Copier le script SQL

Le script se trouve dans le fichier `create_support_chat_system.sql` à la racine du projet.

**IMPORTANT :** Copiez uniquement le contenu du fichier SQL, pas d'autres fichiers.

## Étape 3 : Exécuter le script

1. Collez le script SQL dans l'éditeur Supabase
2. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)
3. Vérifiez qu'il n'y a pas d'erreurs dans les résultats

## Vérification

Après l'exécution, vous devriez voir :
- Table `support_conversations` créée
- Table `support_messages` créée
- Index créés
- Policies RLS créées
- Triggers créés

Si vous voyez des erreurs, vérifiez que :
- Le script complet a été copié (pas juste une partie)
- Il n'y a pas de code TypeScript/JavaScript mélangé (seulement du SQL)
- Vous avez les permissions nécessaires sur Supabase


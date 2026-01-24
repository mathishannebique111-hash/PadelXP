#!/bin/bash
# Script de diagnostic pour les push notifications

echo "=== DIAGNOSTIC PUSH NOTIFICATIONS ==="
echo ""

# 1. Charger les variables d'environnement
source .env.local 2>/dev/null || source .env 2>/dev/null

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
    echo "❌ Variables d'environnement manquantes"
    echo "   Vérifiez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local"
    exit 1
fi

echo "✅ Variables d'environnement trouvées"
echo "   URL: $SUPABASE_URL"
echo ""

# 2. Vérifier les tokens enregistrés
echo "=== ÉTAPE 1: Vérification des tokens push ==="
TOKENS=$(curl -s "$SUPABASE_URL/rest/v1/push_tokens?select=id,user_id,platform,created_at&limit=5" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY")

echo "$TOKENS" | python3 -m json.tool 2>/dev/null || echo "$TOKENS"
echo ""

# 3. Vérifier les dernières notifications
echo "=== ÉTAPE 2: Dernières notifications créées ==="
NOTIFS=$(curl -s "$SUPABASE_URL/rest/v1/notifications?select=id,user_id,type,title,created_at&order=created_at.desc&limit=5" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY")

echo "$NOTIFS" | python3 -m json.tool 2>/dev/null || echo "$NOTIFS"
echo ""

# 4. Tester l'appel direct à la fonction Edge
echo "=== ÉTAPE 3: Test direct de la fonction Edge ==="

# Récupérer le premier user_id avec un token
FIRST_USER=$(echo "$TOKENS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['user_id'] if data else '')" 2>/dev/null)

if [ -z "$FIRST_USER" ]; then
    echo "❌ Aucun token trouvé dans la table push_tokens"
    echo "   L'app iOS n'a pas encore enregistré de token."
    echo "   → Ouvrez l'app sur votre iPhone et acceptez les notifications."
    exit 1
fi

echo "Test avec user_id: $FIRST_USER"
echo ""

RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/push-notifications" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"record\": {\"user_id\": \"$FIRST_USER\", \"title\": \"Test Diagnostic\", \"message\": \"Si vous voyez ceci, ça marche!\", \"data\": {}}}")

echo "Réponse de la fonction:"
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
echo ""

echo "=== FIN DU DIAGNOSTIC ==="
